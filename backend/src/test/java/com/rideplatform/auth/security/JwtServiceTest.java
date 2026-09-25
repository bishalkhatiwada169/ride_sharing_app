package com.rideplatform.auth.security;

import com.rideplatform.auth.config.RidePlatformProperties;
import com.rideplatform.users.domain.RoleCode;
import org.junit.jupiter.api.Test;

import java.util.Set;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class JwtServiceTest {

    @Test
    void createsAndParsesAccessToken() {
        RidePlatformProperties props = new RidePlatformProperties(
                new RidePlatformProperties.Cors("http://localhost:5173"),
                new RidePlatformProperties.Jwt("local_dev_only_change_me_to_long_random_secret_32chars", 900, 2592000),
                new RidePlatformProperties.Sms("mock"),
                new RidePlatformProperties.Payment("mock", "", "local_webhook_secret", 2000),
                new RidePlatformProperties.Otp(6, 300, 5)
        );
        JwtService jwtService = new JwtService(props);
        UUID userId = UUID.randomUUID();

        String token = jwtService.createAccessToken(userId, Set.of(RoleCode.PASSENGER));
        var claims = jwtService.parse(token);

        assertThat(claims.getSubject()).isEqualTo(userId.toString());
        @SuppressWarnings("unchecked")
        java.util.List<String> roles = claims.get("roles", java.util.List.class);
        assertThat(roles).contains("PASSENGER");
    }

    @Test
    void rejectsShortSecret() {
        RidePlatformProperties props = new RidePlatformProperties(
                new RidePlatformProperties.Cors("http://localhost:5173"),
                new RidePlatformProperties.Jwt("too-short", 900, 2592000),
                new RidePlatformProperties.Sms("mock"),
                new RidePlatformProperties.Payment("mock", "", "local_webhook_secret", 2000),
                new RidePlatformProperties.Otp(6, 300, 5)
        );
        assertThatThrownBy(() -> new JwtService(props)).isInstanceOf(IllegalStateException.class);
    }
}
