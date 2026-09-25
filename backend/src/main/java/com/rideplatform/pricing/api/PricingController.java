package com.rideplatform.pricing.api;

import com.rideplatform.auth.security.UserPrincipal;
import com.rideplatform.pricing.application.FareEngine;
import com.rideplatform.pricing.domain.FareQuoteEntity;
import com.rideplatform.vehicles.domain.VehicleType;
import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
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
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/pricing")
public class PricingController {

    private final FareEngine fareEngine;

    public PricingController(FareEngine fareEngine) {
        this.fareEngine = fareEngine;
    }

    public record QuoteRequest(
            @NotNull VehicleType vehicleType,
            @NotNull @DecimalMin("-90") @DecimalMax("90") Double pickupLat,
            @NotNull @DecimalMin("-180") @DecimalMax("180") Double pickupLng,
            @NotNull @DecimalMin("-90") @DecimalMax("90") Double dropoffLat,
            @NotNull @DecimalMin("-180") @DecimalMax("180") Double dropoffLng,
            @Size(max = 500) String pickupAddress,
            @Size(max = 500) String dropoffAddress
    ) {}

    public record QuoteResponse(
            UUID id,
            VehicleType vehicleType,
            int distanceM,
            int durationS,
            String currency,
            long totalMinor,
            Map<String, Object> breakdown,
            Instant expiresAt
    ) {
        static QuoteResponse from(FareQuoteEntity q) {
            return new QuoteResponse(
                    q.getId(), q.getVehicleType(), q.getDistanceM(), q.getDurationS(),
                    q.getCurrency(), q.getTotalMinor(), q.getBreakdownJson(), q.getExpiresAt()
            );
        }
    }

    @PostMapping("/quotes")
    @PreAuthorize("hasAnyRole('PASSENGER','DRIVER','ADMIN','SUPER_ADMIN')")
    public QuoteResponse quote(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody QuoteRequest request
    ) {
        return QuoteResponse.from(fareEngine.createQuote(
                principal.getId(),
                request.vehicleType(),
                request.pickupLat(),
                request.pickupLng(),
                request.dropoffLat(),
                request.dropoffLng(),
                request.pickupAddress(),
                request.dropoffAddress()
        ));
    }

    @GetMapping("/quotes/{id}")
    @PreAuthorize("isAuthenticated()")
    public QuoteResponse get(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID id
    ) {
        return QuoteResponse.from(fareEngine.requireValidQuote(id, principal.getId()));
    }
}
