package com.rideplatform.users.application;

import com.rideplatform.common.exception.AppException;
import com.rideplatform.users.api.UserResponse;
import com.rideplatform.users.domain.RoleCode;
import com.rideplatform.users.domain.RoleEntity;
import com.rideplatform.users.domain.UserEntity;
import com.rideplatform.users.domain.UserStatus;
import com.rideplatform.users.infrastructure.RoleRepository;
import com.rideplatform.users.infrastructure.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class UserService {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;

    public UserService(UserRepository userRepository, RoleRepository roleRepository) {
        this.userRepository = userRepository;
        this.roleRepository = roleRepository;
    }

    @Transactional(readOnly = true)
    public UserResponse getById(UUID id) {
        return toResponse(requireUser(id));
    }

    @Transactional
    public UserEntity findOrCreatePassengerByPhone(String phoneE164) {
        return userRepository.findByPhoneE164(phoneE164).orElseGet(() -> {
            UserEntity user = new UserEntity();
            user.setPhoneE164(phoneE164);
            user.setStatus(UserStatus.ACTIVE);
            user.setDisplayName("Passenger");
            user.getRoles().add(requireRole(RoleCode.PASSENGER));
            return userRepository.save(user);
        });
    }

    @Transactional(readOnly = true)
    public UserEntity requireUser(UUID id) {
        return userRepository.findById(id)
                .orElseThrow(() -> new AppException("NOT_FOUND", "User not found", HttpStatus.NOT_FOUND.value()));
    }

    @Transactional(readOnly = true)
    public UserEntity requireActiveByEmail(String email) {
        UserEntity user = userRepository.findByEmailIgnoreCase(email)
                .orElseThrow(() -> new AppException("UNAUTHORIZED", "Invalid credentials", HttpStatus.UNAUTHORIZED.value()));
        if (user.getStatus() != UserStatus.ACTIVE) {
            throw new AppException("FORBIDDEN", "Account is not active", HttpStatus.FORBIDDEN.value());
        }
        return user;
    }

    @Transactional
    public UserEntity ensureDriverRole(UUID userId) {
        UserEntity user = requireUser(userId);
        boolean hasDriver = user.getRoles().stream().anyMatch(r -> r.getCode() == RoleCode.DRIVER);
        if (!hasDriver) {
            user.getRoles().add(requireRole(RoleCode.DRIVER));
            userRepository.save(user);
        }
        return user;
    }

    public RoleEntity requireRole(RoleCode code) {
        return roleRepository.findByCode(code)
                .orElseThrow(() -> new AppException("INTERNAL_ERROR", "Role missing: " + code, HttpStatus.INTERNAL_SERVER_ERROR.value()));
    }

    public UserResponse toResponse(UserEntity user) {
        Set<RoleCode> roles = user.getRoles().stream().map(RoleEntity::getCode).collect(Collectors.toSet());
        return new UserResponse(
                user.getId(),
                user.getPhoneE164(),
                user.getEmail(),
                user.getDisplayName(),
                user.getStatus(),
                user.getLocale(),
                roles,
                user.getCreatedAt()
        );
    }
}
