package com.rideplatform.rides.api;

import com.rideplatform.auth.security.UserPrincipal;
import com.rideplatform.rides.application.RideService;
import com.rideplatform.rides.domain.RideEntity;
import com.rideplatform.rides.domain.RideStatus;
import com.rideplatform.users.domain.RoleCode;
import com.rideplatform.vehicles.domain.VehicleType;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/rides")
public class RideController {

    private final RideService rideService;

    public RideController(RideService rideService) {
        this.rideService = rideService;
    }

    public record BookRequest(
            @NotNull UUID fareQuoteId,
            @Pattern(regexp = "CASH|DIGITAL") String paymentMethod
    ) {}

    public record CancelRequest(@Size(max = 500) String reason) {}

    public record StartRequest(@NotBlank @Size(min = 4, max = 4) String pin) {}

    public record RideResponse(
            UUID id,
            UUID passengerUserId,
            UUID driverUserId,
            UUID vehicleId,
            RideStatus status,
            VehicleType vehicleTypeRequested,
            double pickupLat,
            double pickupLng,
            String pickupAddress,
            double dropoffLat,
            double dropoffLng,
            String dropoffAddress,
            UUID fareQuoteId,
            Integer distanceM,
            Integer durationS,
            String paymentMethod,
            String paymentStatus,
            String tripPin,
            Instant requestedAt,
            Instant assignedAt,
            Instant startedAt,
            Instant completedAt
    ) {
        public static RideResponse from(RideEntity r, boolean includePin) {
            return new RideResponse(
                    r.getId(), r.getPassengerUserId(), r.getDriverUserId(), r.getVehicleId(),
                    r.getStatus(), r.getVehicleTypeRequested(),
                    r.getPickupLat(), r.getPickupLng(), r.getPickupAddress(),
                    r.getDropoffLat(), r.getDropoffLng(), r.getDropoffAddress(),
                    r.getFareQuoteId(), r.getDistanceM(), r.getDurationS(),
                    r.getPaymentMethod(), r.getPaymentStatus(),
                    includePin ? r.getTripPin() : null,
                    r.getRequestedAt(), r.getAssignedAt(), r.getStartedAt(), r.getCompletedAt()
            );
        }
    }

    @PostMapping
    @PreAuthorize("hasRole('PASSENGER')")
    public RideResponse book(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody BookRequest request
    ) {
        RideEntity ride = rideService.bookAndMatch(
                principal.getId(),
                request.fareQuoteId(),
                request.paymentMethod()
        );
        return RideResponse.from(ride, true);
    }

    @GetMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    public RideResponse get(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID id
    ) {
        boolean admin = principal.getRoles().contains(RoleCode.ADMIN)
                || principal.getRoles().contains(RoleCode.SUPER_ADMIN)
                || principal.getRoles().contains(RoleCode.SUPPORT);
        RideEntity ride = rideService.getForUser(id, principal.getId(), admin);
        boolean includePin = ride.getPassengerUserId().equals(principal.getId()) || admin;
        return RideResponse.from(ride, includePin);
    }

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    public List<RideResponse> history(@AuthenticationPrincipal UserPrincipal principal) {
        List<RideEntity> rides;
        if (principal.getRoles().contains(RoleCode.DRIVER)
                && !principal.getRoles().contains(RoleCode.PASSENGER)) {
            rides = rideService.historyForDriver(principal.getId());
        } else if (principal.getRoles().contains(RoleCode.DRIVER)) {
            // dual-role: return passenger history by default; driver can use /driver/history later
            rides = rideService.historyForPassenger(principal.getId());
        } else {
            rides = rideService.historyForPassenger(principal.getId());
        }
        return rides.stream().map(r -> RideResponse.from(r, false)).toList();
    }

    @GetMapping("/driver/history")
    @PreAuthorize("hasRole('DRIVER')")
    public List<RideResponse> driverHistory(@AuthenticationPrincipal UserPrincipal principal) {
        return rideService.historyForDriver(principal.getId()).stream()
                .map(r -> RideResponse.from(r, false))
                .toList();
    }

    @GetMapping("/{id}/driver-location")
    @PreAuthorize("isAuthenticated()")
    public DriverLocationResponse driverLocation(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID id
    ) {
        boolean admin = principal.getRoles().contains(RoleCode.ADMIN)
                || principal.getRoles().contains(RoleCode.SUPER_ADMIN)
                || principal.getRoles().contains(RoleCode.SUPPORT);
        var loc = rideService.driverLocationForRide(id, principal.getId(), admin);
        return new DriverLocationResponse(loc.driverUserId(), loc.lat(), loc.lng(), loc.updatedAt());
    }

    public record DriverLocationResponse(UUID driverUserId, double lat, double lng, Instant updatedAt) {}

    @PostMapping("/{id}/arriving")
    @PreAuthorize("hasRole('DRIVER')")
    public RideResponse arriving(@AuthenticationPrincipal UserPrincipal principal, @PathVariable UUID id) {
        return RideResponse.from(rideService.markArriving(id, principal.getId()), false);
    }

    @PostMapping("/{id}/arrived")
    @PreAuthorize("hasRole('DRIVER')")
    public RideResponse arrived(@AuthenticationPrincipal UserPrincipal principal, @PathVariable UUID id) {
        return RideResponse.from(rideService.markArrived(id, principal.getId()), false);
    }

    @PostMapping("/{id}/start")
    @PreAuthorize("hasRole('DRIVER')")
    public RideResponse start(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID id,
            @Valid @RequestBody StartRequest request
    ) {
        return RideResponse.from(rideService.start(id, principal.getId(), request.pin()), false);
    }

    @PostMapping("/{id}/complete")
    @PreAuthorize("hasRole('DRIVER')")
    public RideResponse complete(@AuthenticationPrincipal UserPrincipal principal, @PathVariable UUID id) {
        return RideResponse.from(rideService.complete(id, principal.getId()), false);
    }

    @PostMapping("/{id}/cancel")
    @PreAuthorize("hasAnyRole('PASSENGER','DRIVER')")
    public RideResponse cancel(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID id,
            @RequestBody(required = false) CancelRequest request
    ) {
        RideEntity ride = rideService.getForUser(id, principal.getId(), false);
        RoleCode role;
        if (ride.getDriverUserId() != null && ride.getDriverUserId().equals(principal.getId())) {
            role = RoleCode.DRIVER;
        } else if (ride.getPassengerUserId().equals(principal.getId())) {
            role = RoleCode.PASSENGER;
        } else {
            role = RoleCode.PASSENGER;
        }
        String reason = request == null ? null : request.reason();
        return RideResponse.from(rideService.cancel(id, principal.getId(), role, reason), false);
    }

    @GetMapping("/admin/live")
    @PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN','SUPPORT')")
    public List<RideResponse> live() {
        return rideService.liveRides().stream().map(r -> RideResponse.from(r, false)).toList();
    }

    @PostMapping("/{id}/match")
    @PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN')")
    public RideResponse rematch(@PathVariable UUID id) {
        return RideResponse.from(rideService.tryMatch(id), false);
    }
}
