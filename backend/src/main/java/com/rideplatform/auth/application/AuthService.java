package com.rideplatform.auth.application;

import com.rideplatform.auth.config.RidePlatformProperties;
import com.rideplatform.auth.domain.OtpChallengeEntity;
import com.rideplatform.auth.domain.RefreshTokenEntity;
import com.rideplatform.auth.infrastructure.OtpChallengeRepository;
import com.rideplatform.auth.infrastructure.RefreshTokenRepository;
import com.rideplatform.auth.security.JwtService;
import com.rideplatform.common.exception.AppException;
import com.rideplatform.notifications.sms.SmsGateway;
import com.rideplatform.users.api.UserResponse;
import com.rideplatform.users.application.UserService;
import com.rideplatform.users.domain.RoleEntity;
import com.rideplatform.users.domain.UserEntity;
import com.rideplatform.users.domain.UserStatus;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.HexFormat;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class AuthService {

    private final OtpChallengeRepository otpChallengeRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final UserService userService;
    private final SmsGateway smsGateway;
    private final JwtService jwtService;
    private final PasswordEncoder passwordEncoder;
    private final RidePlatformProperties properties;
    private final SecureRandom secureRandom = new SecureRandom();

    public AuthService(
            OtpChallengeRepository otpChallengeRepository,
            RefreshTokenRepository refreshTokenRepository,
            UserService userService,
            SmsGateway smsGateway,
            JwtService jwtService,
            PasswordEncoder passwordEncoder,
            RidePlatformProperties properties
    ) {
        this.otpChallengeRepository = otpChallengeRepository;
        this.refreshTokenRepository = refreshTokenRepository;
        this.userService = userService;
        this.smsGateway = smsGateway;
        this.jwtService = jwtService;
        this.passwordEncoder = passwordEncoder;
        this.properties = properties;
    }

    @Transactional
    public void requestOtp(String phoneE164) {
        String code = generateNumericCode(properties.otp().length());
        OtpChallengeEntity challenge = new OtpChallengeEntity();
        challenge.setPhoneE164(phoneE164);
        challenge.setCodeHash(hash(code));
        challenge.setPurpose("LOGIN");
        challenge.setAttempts(0);
        challenge.setMaxAttempts(properties.otp().maxAttempts());
        challenge.setExpiresAt(Instant.now().plusSeconds(properties.otp().ttlSeconds()));
        otpChallengeRepository.save(challenge);
        smsGateway.sendOtp(phoneE164, code);
    }

    @Transactional
    public TokenPairResponse verifyOtp(String phoneE164, String code, String userAgent, String ipAddress) {
        OtpChallengeEntity challenge = otpChallengeRepository
                .findFirstByPhoneE164AndConsumedAtIsNullOrderByCreatedAtDesc(phoneE164)
                .orElseThrow(() -> new AppException("OTP_INVALID", "OTP not found or already used", HttpStatus.BAD_REQUEST.value()));

        if (challenge.getExpiresAt().isBefore(Instant.now())) {
            throw new AppException("OTP_EXPIRED", "OTP has expired", HttpStatus.BAD_REQUEST.value());
        }
        if (challenge.getAttempts() >= challenge.getMaxAttempts()) {
            throw new AppException("OTP_LOCKED", "Too many OTP attempts", HttpStatus.TOO_MANY_REQUESTS.value());
        }

        challenge.setAttempts(challenge.getAttempts() + 1);
        if (!constantTimeEquals(challenge.getCodeHash(), hash(code))) {
            otpChallengeRepository.save(challenge);
            throw new AppException("OTP_INVALID", "Invalid OTP", HttpStatus.BAD_REQUEST.value());
        }

        challenge.setConsumedAt(Instant.now());
        otpChallengeRepository.save(challenge);

        UserEntity user = userService.findOrCreatePassengerByPhone(phoneE164);
        if (user.getStatus() != UserStatus.ACTIVE) {
            throw new AppException("FORBIDDEN", "Account is not active", HttpStatus.FORBIDDEN.value());
        }
        return issueTokens(user, userAgent, ipAddress, UUID.randomUUID());
    }

    @Transactional
    public TokenPairResponse adminLogin(String email, String password, String userAgent, String ipAddress) {
        UserEntity user = userService.requireActiveByEmail(email);
        if (user.getPasswordHash() == null || !passwordEncoder.matches(password, user.getPasswordHash())) {
            throw new AppException("UNAUTHORIZED", "Invalid credentials", HttpStatus.UNAUTHORIZED.value());
        }
        boolean isStaff = user.getRoles().stream().map(RoleEntity::getCode).anyMatch(role ->
                role.name().contains("ADMIN") || role == com.rideplatform.users.domain.RoleCode.SUPPORT);
        if (!isStaff) {
            throw new AppException("FORBIDDEN", "Admin access required", HttpStatus.FORBIDDEN.value());
        }
        return issueTokens(user, userAgent, ipAddress, UUID.randomUUID());
    }

    @Transactional
    public TokenPairResponse refresh(String refreshToken, String userAgent, String ipAddress) {
        String hash = hash(refreshToken);
        RefreshTokenEntity stored = refreshTokenRepository.findByTokenHash(hash)
                .orElseThrow(() -> new AppException("UNAUTHORIZED", "Invalid refresh token", HttpStatus.UNAUTHORIZED.value()));

        if (stored.getRevokedAt() != null) {
            refreshTokenRepository.revokeFamily(stored.getFamilyId(), Instant.now());
            throw new AppException("UNAUTHORIZED", "Refresh token reuse detected", HttpStatus.UNAUTHORIZED.value());
        }
        if (stored.getExpiresAt().isBefore(Instant.now())) {
            throw new AppException("UNAUTHORIZED", "Refresh token expired", HttpStatus.UNAUTHORIZED.value());
        }

        stored.setRevokedAt(Instant.now());
        refreshTokenRepository.save(stored);

        UserEntity user = userService.requireUser(stored.getUserId());
        if (user.getStatus() != UserStatus.ACTIVE) {
            throw new AppException("FORBIDDEN", "Account is not active", HttpStatus.FORBIDDEN.value());
        }
        return issueTokens(user, userAgent, ipAddress, stored.getFamilyId());
    }

    @Transactional
    public void logout(UUID userId, String refreshToken) {
        if (refreshToken != null && !refreshToken.isBlank()) {
            refreshTokenRepository.findByTokenHash(hash(refreshToken)).ifPresent(token -> {
                if (token.getUserId().equals(userId)) {
                    refreshTokenRepository.revokeFamily(token.getFamilyId(), Instant.now());
                }
            });
        } else {
            refreshTokenRepository.revokeAllForUser(userId, Instant.now());
        }
    }

    private TokenPairResponse issueTokens(UserEntity user, String userAgent, String ipAddress, UUID familyId) {
        var roles = user.getRoles().stream().map(RoleEntity::getCode).collect(Collectors.toSet());
        String accessToken = jwtService.createAccessToken(user.getId(), roles);
        String refreshToken = UUID.randomUUID() + "." + UUID.randomUUID();

        RefreshTokenEntity entity = new RefreshTokenEntity();
        entity.setUserId(user.getId());
        entity.setTokenHash(hash(refreshToken));
        entity.setFamilyId(familyId);
        entity.setExpiresAt(Instant.now().plusSeconds(properties.jwt().refreshTtlSeconds()));
        entity.setUserAgent(userAgent);
        entity.setIpAddress(ipAddress);
        refreshTokenRepository.save(entity);

        UserResponse userResponse = userService.toResponse(user);
        return new TokenPairResponse(
                accessToken,
                refreshToken,
                "Bearer",
                jwtService.getAccessTtlSeconds(),
                userResponse
        );
    }

    private String generateNumericCode(int length) {
        StringBuilder sb = new StringBuilder(length);
        for (int i = 0; i < length; i++) {
            sb.append(secureRandom.nextInt(10));
        }
        return sb.toString();
    }

    private String hash(String value) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hashed = digest.digest(value.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hashed);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 not available", e);
        }
    }

    private boolean constantTimeEquals(String a, String b) {
        return MessageDigest.isEqual(
                a.getBytes(StandardCharsets.UTF_8),
                b.getBytes(StandardCharsets.UTF_8)
        );
    }

    public record TokenPairResponse(
            String accessToken,
            String refreshToken,
            String tokenType,
            long expiresInSeconds,
            UserResponse user
    ) {}
}
