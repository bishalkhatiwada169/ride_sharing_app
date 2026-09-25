package com.rideplatform.drivers.api;

import com.rideplatform.auth.security.UserPrincipal;
import com.rideplatform.drivers.application.DriverService;
import com.rideplatform.drivers.domain.DriverAvailabilityStatus;
import com.rideplatform.drivers.domain.DriverProfileEntity;
import com.rideplatform.drivers.domain.DriverVerificationStatus;
import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/drivers")
public class DriverController {

    private final DriverService driverService;

    public DriverController(DriverService driverService) {
        this.driverService = driverService;
    }

    public record RegisterRequest(@Size(max = 120) String displayName) {}
    public record RejectRequest(@NotBlank @Size(max = 500) String reason) {}
    public record LocationRequest(
            @NotNull @DecimalMin("-90") @DecimalMax("90") Double lat,
            @NotNull @DecimalMin("-180") @DecimalMax("180") Double lng
    ) {}
    public record DriverResponse(
            UUID userId,
            DriverVerificationStatus verificationStatus,
            boolean online,
            DriverAvailabilityStatus availabilityStatus,
            BigDecimal ratingAvg,
            int ratingCount,
            Instant approvedAt,
            String rejectedReason
    ) {
        static DriverResponse from(DriverProfileEntity e) {
            return new DriverResponse(
                    e.getUserId(),
                    e.getVerificationStatus(),
                    e.isOnline(),
                    e.getAvailabilityStatus(),
                    e.getRatingAvg(),
                    e.getRatingCount(),
                    e.getApprovedAt(),
                    e.getRejectedReason()
            );
        }
    }

    @PostMapping("/me/application")
    @PreAuthorize("hasAnyRole('PASSENGER','DRIVER')")
    public DriverResponse register(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody(required = false) RegisterRequest request
    ) {
        String name = request == null ? null : request.displayName();
        return DriverResponse.from(driverService.registerAsDriver(principal.getId(), name));
    }

    @PostMapping("/me/submit")
    @PreAuthorize("hasRole('DRIVER')")
    public DriverResponse submit(@AuthenticationPrincipal UserPrincipal principal) {
        return DriverResponse.from(driverService.submitForVerification(principal.getId()));
    }

    @GetMapping("/me")
    @PreAuthorize("hasRole('DRIVER')")
    public DriverResponse me(@AuthenticationPrincipal UserPrincipal principal) {
        return DriverResponse.from(driverService.requireProfile(principal.getId()));
    }

    @PostMapping("/me/online")
    @PreAuthorize("hasRole('DRIVER')")
    public DriverResponse online(@AuthenticationPrincipal UserPrincipal principal) {
        return DriverResponse.from(driverService.goOnline(principal.getId()));
    }

    @PostMapping("/me/offline")
    @PreAuthorize("hasRole('DRIVER')")
    public DriverResponse offline(@AuthenticationPrincipal UserPrincipal principal) {
        return DriverResponse.from(driverService.goOffline(principal.getId()));
    }

    @PutMapping("/me/location")
    @PreAuthorize("hasRole('DRIVER')")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void location(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody LocationRequest request
    ) {
        driverService.updateLocation(principal.getId(), request.lat(), request.lng());
    }

    @GetMapping("/admin")
    @PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN','SUPPORT')")
    public List<DriverResponse> adminList() {
        return driverService.listAll().stream().map(DriverResponse::from).toList();
    }

    @GetMapping("/admin/pending")
    @PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN')")
    public List<DriverResponse> pending() {
        return driverService.listPending().stream().map(DriverResponse::from).toList();
    }

    @PostMapping("/admin/{userId}/approve")
    @PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN')")
    public DriverResponse approve(@PathVariable UUID userId) {
        return DriverResponse.from(driverService.approve(userId));
    }

    @PostMapping("/admin/{userId}/reject")
    @PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN')")
    public DriverResponse reject(@PathVariable UUID userId, @Valid @RequestBody RejectRequest request) {
        return DriverResponse.from(driverService.reject(userId, request.reason()));
    }
}
