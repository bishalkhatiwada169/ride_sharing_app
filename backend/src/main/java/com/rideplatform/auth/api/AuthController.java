package com.rideplatform.auth.api;

import com.rideplatform.auth.application.AuthService;
import com.rideplatform.auth.security.UserPrincipal;
import com.rideplatform.users.api.UserResponse;
import com.rideplatform.users.application.UserService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {

    private final AuthService authService;
    private final UserService userService;

    public AuthController(AuthService authService, UserService userService) {
        this.authService = authService;
        this.userService = userService;
    }

    @PostMapping("/otp/request")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void requestOtp(@Valid @RequestBody AuthDtos.OtpRequest request) {
        authService.requestOtp(request.phoneE164());
    }

    @PostMapping("/otp/verify")
    public AuthService.TokenPairResponse verifyOtp(
            @Valid @RequestBody AuthDtos.OtpVerifyRequest request,
            HttpServletRequest httpRequest
    ) {
        return authService.verifyOtp(
                request.phoneE164(),
                request.code(),
                httpRequest.getHeader("User-Agent"),
                httpRequest.getRemoteAddr()
        );
    }

    @PostMapping("/admin/login")
    public AuthService.TokenPairResponse adminLogin(
            @Valid @RequestBody AuthDtos.AdminLoginRequest request,
            HttpServletRequest httpRequest
    ) {
        return authService.adminLogin(
                request.email(),
                request.password(),
                httpRequest.getHeader("User-Agent"),
                httpRequest.getRemoteAddr()
        );
    }

    @PostMapping("/token/refresh")
    public AuthService.TokenPairResponse refresh(
            @Valid @RequestBody AuthDtos.RefreshRequest request,
            HttpServletRequest httpRequest
    ) {
        return authService.refresh(
                request.refreshToken(),
                httpRequest.getHeader("User-Agent"),
                httpRequest.getRemoteAddr()
        );
    }

    @PostMapping("/logout")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void logout(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestBody(required = false) AuthDtos.LogoutRequest request
    ) {
        String refresh = request == null ? null : request.refreshToken();
        authService.logout(principal.getId(), refresh);
    }

    @GetMapping("/me")
    public UserResponse me(@AuthenticationPrincipal UserPrincipal principal) {
        return userService.getById(principal.getId());
    }
}
