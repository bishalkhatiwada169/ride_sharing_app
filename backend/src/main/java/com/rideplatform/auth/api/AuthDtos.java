package com.rideplatform.auth.api;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public final class AuthDtos {

    private AuthDtos() {}

    public record OtpRequest(
            @NotBlank
            @Pattern(regexp = "^\\+[1-9]\\d{7,14}$", message = "phone must be E.164 e.g. +97798...")
            String phoneE164
    ) {}

    public record OtpVerifyRequest(
            @NotBlank
            @Pattern(regexp = "^\\+[1-9]\\d{7,14}$", message = "phone must be E.164")
            String phoneE164,
            @NotBlank
            @Size(min = 4, max = 8)
            String code
    ) {}

    public record AdminLoginRequest(
            @NotBlank @Email String email,
            @NotBlank @Size(min = 8, max = 128) String password
    ) {}

    public record RefreshRequest(@NotBlank String refreshToken) {}

    public record LogoutRequest(String refreshToken) {}
}
