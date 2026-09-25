package com.rideplatform.matching.application;

import com.rideplatform.common.exception.AppException;
import com.rideplatform.drivers.domain.DriverAvailabilityStatus;
import com.rideplatform.drivers.domain.DriverProfileEntity;
import com.rideplatform.drivers.infrastructure.DriverProfileRepository;
import com.rideplatform.matching.domain.RideOfferEntity;
import com.rideplatform.matching.infrastructure.RideOfferRepository;
import com.rideplatform.notifications.application.PushNotificationService;
import com.rideplatform.realtime.application.RealtimeEventPublisher;
import com.rideplatform.realtime.domain.RealtimeEvent;
import com.rideplatform.rides.domain.RideEntity;
import com.rideplatform.rides.domain.RideEventEntity;
import com.rideplatform.rides.domain.RideStateMachine;
import com.rideplatform.rides.domain.RideStatus;
import com.rideplatform.rides.infrastructure.RideEventRepository;
import com.rideplatform.rides.infrastructure.RideRepository;
import com.rideplatform.users.domain.RoleCode;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class MatchingService {

    private final RideRepository rideRepository;
    private final RideEventRepository rideEventRepository;
    private final RideOfferRepository rideOfferRepository;
    private final DriverProfileRepository driverProfileRepository;
    private final PostgisMatchingEngine matchingEngine;
    private final RealtimeEventPublisher realtimeEventPublisher;
    private final ApplicationEventPublisher eventPublisher;
    private final PushNotificationService pushNotificationService;
    private final int offerTimeoutSeconds;
    private final boolean autoAccept;

    public MatchingService(
            RideRepository rideRepository,
            RideEventRepository rideEventRepository,
            RideOfferRepository rideOfferRepository,
            DriverProfileRepository driverProfileRepository,
            PostgisMatchingEngine matchingEngine,
            RealtimeEventPublisher realtimeEventPublisher,
            ApplicationEventPublisher eventPublisher,
            PushNotificationService pushNotificationService,
            @Value("${rideplatform.matching.offer-timeout-seconds:25}") int offerTimeoutSeconds,
            @Value("${rideplatform.matching.auto-accept:true}") boolean autoAccept
    ) {
        this.rideRepository = rideRepository;
        this.rideEventRepository = rideEventRepository;
        this.rideOfferRepository = rideOfferRepository;
        this.driverProfileRepository = driverProfileRepository;
        this.matchingEngine = matchingEngine;
        this.realtimeEventPublisher = realtimeEventPublisher;
        this.eventPublisher = eventPublisher;
        this.pushNotificationService = pushNotificationService;
        this.offerTimeoutSeconds = offerTimeoutSeconds;
        this.autoAccept = autoAccept;
    }

    @Transactional
    public RideEntity tryMatch(UUID rideId) {
        RideEntity ride = rideRepository.findById(rideId)
                .orElseThrow(() -> new AppException("NOT_FOUND", "Ride not found", HttpStatus.NOT_FOUND.value()));
        if (ride.getStatus() != RideStatus.SEARCHING_DRIVER) {
            return ride;
        }
        if (rideOfferRepository.findFirstByRideIdAndStatusOrderByCreatedAtDesc(rideId, "PENDING").isPresent()) {
            return ride;
        }

        Set<UUID> exclude = rideOfferRepository.findByRideIdOrderByCreatedAtDesc(rideId).stream()
                .map(RideOfferEntity::getDriverUserId)
                .collect(Collectors.toCollection(HashSet::new));

        var candidate = matchingEngine.findCandidate(
                ride.getVehicleTypeRequested(),
                ride.getPickupLat(),
                ride.getPickupLng(),
                exclude
        ).or(() -> matchingEngine.findCandidateFallback(ride.getVehicleTypeRequested(), exclude));

        if (candidate.isEmpty()) {
            return transition(ride, RideStatus.NO_DRIVER_FOUND, null, RoleCode.ADMIN, Map.of("reason", "no_candidates"));
        }

        var match = candidate.get();
        DriverProfileEntity driver = driverProfileRepository.findById(match.driverUserId())
                .orElseThrow(() -> new AppException("NOT_FOUND", "Driver missing", HttpStatus.NOT_FOUND.value()));
        driver.setAvailabilityStatus(DriverAvailabilityStatus.ON_OFFER);
        driverProfileRepository.save(driver);

        RideOfferEntity offer = new RideOfferEntity();
        offer.setRideId(rideId);
        offer.setDriverUserId(match.driverUserId());
        offer.setVehicleId(match.vehicleId());
        offer.setStatus("PENDING");
        offer.setDistanceM(match.distanceM() == Integer.MAX_VALUE ? null : match.distanceM());
        offer.setExpiresAt(Instant.now().plusSeconds(offerTimeoutSeconds));
        offer = rideOfferRepository.save(offer);

        realtimeEventPublisher.publish(new RealtimeEvent(
                "DRIVER_OFFER",
                Instant.now(),
                rideId,
                match.driverUserId(),
                ride.getPassengerUserId(),
                Map.of(
                        "offerId", offer.getId().toString(),
                        "distanceM", offer.getDistanceM() == null ? 0 : offer.getDistanceM(),
                        "expiresAt", offer.getExpiresAt().toString()
                ),
                null
        ));
        pushNotificationService.notifyUser(
                match.driverUserId(),
                "New ride offer",
                "You have a pending ride request"
        );

        if (autoAccept) {
            return acceptOffer(offer.getId(), match.driverUserId());
        }
        return ride;
    }

    @Transactional
    public RideEntity acceptOffer(UUID offerId, UUID driverId) {
        RideOfferEntity offer = rideOfferRepository.findById(offerId)
                .orElseThrow(() -> new AppException("NOT_FOUND", "Offer not found", HttpStatus.NOT_FOUND.value()));
        if (!offer.getDriverUserId().equals(driverId)) {
            throw new AppException("FORBIDDEN", "Not your offer", HttpStatus.FORBIDDEN.value());
        }
        if (!"PENDING".equals(offer.getStatus())) {
            throw new AppException("CONFLICT", "Offer is not pending", HttpStatus.CONFLICT.value());
        }
        RideEntity ride = rideRepository.findById(offer.getRideId())
                .orElseThrow(() -> new AppException("NOT_FOUND", "Ride not found", HttpStatus.NOT_FOUND.value()));
        if (ride.getStatus() != RideStatus.SEARCHING_DRIVER) {
            offer.setStatus("CANCELLED");
            offer.setRespondedAt(Instant.now());
            rideOfferRepository.save(offer);
            releaseOfferDriver(driverId);
            throw new AppException("CONFLICT", "Ride no longer searching", HttpStatus.CONFLICT.value());
        }

        offer.setStatus("ACCEPTED");
        offer.setRespondedAt(Instant.now());
        rideOfferRepository.save(offer);

        DriverProfileEntity driver = driverProfileRepository.findById(driverId)
                .orElseThrow(() -> new AppException("NOT_FOUND", "Driver missing", HttpStatus.NOT_FOUND.value()));
        driver.setAvailabilityStatus(DriverAvailabilityStatus.ON_TRIP);
        driverProfileRepository.save(driver);

        ride.setDriverUserId(driverId);
        ride.setVehicleId(offer.getVehicleId());
        ride.setAssignedAt(Instant.now());
        return transition(ride, RideStatus.DRIVER_ACCEPTED, driverId, RoleCode.DRIVER, Map.of(
                "offerId", offerId.toString(),
                "vehicleId", offer.getVehicleId().toString()
        ));
    }

    @Transactional
    public RideEntity rejectOffer(UUID offerId, UUID driverId) {
        RideOfferEntity offer = rideOfferRepository.findById(offerId)
                .orElseThrow(() -> new AppException("NOT_FOUND", "Offer not found", HttpStatus.NOT_FOUND.value()));
        if (!offer.getDriverUserId().equals(driverId)) {
            throw new AppException("FORBIDDEN", "Not your offer", HttpStatus.FORBIDDEN.value());
        }
        if (!"PENDING".equals(offer.getStatus())) {
            return rideRepository.findById(offer.getRideId()).orElseThrow();
        }
        offer.setStatus("REJECTED");
        offer.setRespondedAt(Instant.now());
        rideOfferRepository.save(offer);
        releaseOfferDriver(driverId);
        return tryMatch(offer.getRideId());
    }

    @Transactional(readOnly = true)
    public List<RideOfferEntity> pendingOffersForDriver(UUID driverId) {
        return rideOfferRepository.findByDriverUserIdAndStatusOrderByCreatedAtDesc(driverId, "PENDING");
    }

    @Transactional
    public void expireDueOffers() {
        List<RideOfferEntity> expired = rideOfferRepository.findByStatusAndExpiresAtBefore("PENDING", Instant.now());
        for (RideOfferEntity offer : expired) {
            offer.setStatus("EXPIRED");
            offer.setRespondedAt(Instant.now());
            rideOfferRepository.save(offer);
            releaseOfferDriver(offer.getDriverUserId());
            tryMatch(offer.getRideId());
        }
    }

    /**
     * Search timeout: SEARCHING_DRIVER → EXPIRED via the ride state machine + events/realtime.
     */
    @Transactional
    public void expireSearchingRide(UUID rideId) {
        RideEntity ride = rideRepository.findById(rideId).orElse(null);
        if (ride == null || ride.getStatus() != RideStatus.SEARCHING_DRIVER) {
            return;
        }
        transition(ride, RideStatus.EXPIRED, null, RoleCode.ADMIN, Map.of("reason", "search_timeout"));
    }

    private void releaseOfferDriver(UUID driverId) {
        driverProfileRepository.findById(driverId).ifPresent(driver -> {
            if (driver.getAvailabilityStatus() == DriverAvailabilityStatus.ON_OFFER) {
                if (driver.isOnline()) {
                    driver.setAvailabilityStatus(DriverAvailabilityStatus.AVAILABLE);
                } else {
                    driver.setAvailabilityStatus(DriverAvailabilityStatus.OFFLINE);
                }
                driverProfileRepository.save(driver);
            }
        });
    }

    private RideEntity transition(
            RideEntity ride,
            RideStatus to,
            UUID actorId,
            RoleCode role,
            Map<String, Object> payload
    ) {
        RideStatus from = ride.getStatus();
        RideStateMachine.assertTransition(from, to);
        ride.setStatus(to);
        RideEntity saved = rideRepository.save(ride);
        RideEventEntity event = new RideEventEntity();
        event.setRideId(saved.getId());
        event.setFromStatus(from == null ? null : from.name());
        event.setToStatus(to.name());
        event.setActorUserId(actorId);
        event.setActorRole(role == null ? "SYSTEM" : role.name());
        event.setSource(actorId == null ? "SYSTEM" : "API");
        event.setPayloadJson(payload);
        rideEventRepository.save(event);
        eventPublisher.publishEvent(new com.rideplatform.realtime.application.RideRealtimeListener.RideStatusCommitted(
                saved.getId(), saved.getPassengerUserId(), saved.getDriverUserId(), from, to
        ));
        return saved;
    }
}
