package com.rideplatform.matching.api;

import com.rideplatform.auth.security.UserPrincipal;
import com.rideplatform.matching.application.MatchingService;
import com.rideplatform.matching.domain.RideOfferEntity;
import com.rideplatform.rides.api.RideController;
import com.rideplatform.rides.domain.RideEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/matching")
public class MatchingController {

    private final MatchingService matchingService;

    public MatchingController(MatchingService matchingService) {
        this.matchingService = matchingService;
    }

    public record OfferResponse(
            UUID id,
            UUID rideId,
            UUID driverUserId,
            UUID vehicleId,
            String status,
            Integer distanceM,
            Instant expiresAt
    ) {
        static OfferResponse from(RideOfferEntity e) {
            return new OfferResponse(
                    e.getId(), e.getRideId(), e.getDriverUserId(), e.getVehicleId(),
                    e.getStatus(), e.getDistanceM(), e.getExpiresAt()
            );
        }
    }

    @GetMapping("/offers/me")
    @PreAuthorize("hasRole('DRIVER')")
    public List<OfferResponse> myOffers(@AuthenticationPrincipal UserPrincipal principal) {
        return matchingService.pendingOffersForDriver(principal.getId()).stream()
                .map(OfferResponse::from)
                .toList();
    }

    @PostMapping("/offers/{offerId}/accept")
    @PreAuthorize("hasRole('DRIVER')")
    public RideController.RideResponse accept(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID offerId
    ) {
        RideEntity ride = matchingService.acceptOffer(offerId, principal.getId());
        return RideController.RideResponse.from(ride, false);
    }

    @PostMapping("/offers/{offerId}/reject")
    @PreAuthorize("hasRole('DRIVER')")
    public RideController.RideResponse reject(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID offerId
    ) {
        RideEntity ride = matchingService.rejectOffer(offerId, principal.getId());
        return RideController.RideResponse.from(ride, false);
    }
}
