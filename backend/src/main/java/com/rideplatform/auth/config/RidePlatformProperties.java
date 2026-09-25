package com.rideplatform.auth.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "rideplatform")
public record RidePlatformProperties(
        Cors cors,
        Jwt jwt,
        Sms sms,
        Payment payment,
        Otp otp
) {
    public record Cors(String allowedOrigins) {}

    public record Jwt(String secret, long accessTtlSeconds, long refreshTtlSeconds) {}

    public record Sms(String provider) {}

    public record Payment(
            String provider,
            String apiKey,
            String webhookSecret,
            int commissionBps
    ) {}

    public record Otp(int length, long ttlSeconds, int maxAttempts) {}
}
