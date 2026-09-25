package com.rideplatform.rides.application;

import com.rideplatform.common.exception.AppException;
import com.rideplatform.drivers.domain.DriverAvailabilityStatus;
import com.rideplatform.drivers.domain.DriverProfileEntity;
import com.rideplatform.drivers.infrastructure.DriverProfileRepository;
import com.rideplatform.matching.application.MatchingService;
import com.rideplatform.payments.application.PaymentService;
import com.rideplatform.pricing.application.FareEngine;
import com.rideplatform.pricing.domain.FareQuoteEntity;
import com.rideplatform.realtime.application.RideRealtimeListener;
import com.rideplatform.rides.domain.RideEntity;
import com.rideplatform.rides.domain.RideEventEntity;
import com.rideplatform.rides.domain.RideStateMachine;
import com.rideplatform.rides.domain.RideStatus;
import com.rideplatform.rides.infrastructure.RideEventRepository;
import com.rideplatform.rides.infrastructure.RideRepository;
import com.rideplatform.users.domain.RoleCode;
import com.rideplatform.vehicles.domain.VehicleType;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.Instant;
import java.util.EnumSet;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

@Service
public class RideService {

    private static final EnumSet<RideStatus> ACTIVE_PASSENGER = EnumSet.of(
            RideStatus.REQUESTED, RideStatus.SEARCHING_DRIVER, RideStatus.DRIVER_ACCEPTED,
            RideStatus.DRIVER_ARRIVING, RideStatus.DRIVER_ARRIVED, RideStatus.RIDE_STARTED
    );

    private final RideRepository rideRepository;
    private final RideEventRepository rideEventRepository;
    private final FareEngine fareEngine;
    private final MatchingService matchingService;
    private final DriverProfileRepository driverProfileRepository;
    private final ApplicationEventPublisher eventPublisher;
    private final PaymentService paymentService;
    private final SecureRandom secureRandom = new SecureRandom();

    public RideService(
            RideRepository rideRepository,
            RideEventRepository rideEventRepository,
            FareEngine fareEngine,
            MatchingService matchingService,
            DriverProfileRepository driverProfileRepository,
            ApplicationEventPublisher eventPublisher,
            PaymentService paymentService
    ) {
        this.rideRepository = rideRepository;
        this.rideEventRepository = rideEventRepository;
        this.fareEngine = fareEngine;
        this.matchingService = matchingService;
        this.driverProfileRepository = driverProfileRepository;
        this.eventPublisher = eventPublisher;
        this.paymentService = paymentService;
    }

    @Transactional
    public RideEntity book(UUID passengerId, UUID fareQuoteId, String paymentMethod) {
        rideRepository.findFirstByPassengerUserIdAndStatusIn(passengerId, ACTIVE_PASSENGER).ifPresent(r -> {
            throw new AppException("RIDE_ACTIVE", "Passenger already has an active ride", HttpStatus.CONFLICT.value());
        });

        FareQuoteEntity quote = fareEngine.requireValidQuote(fareQuoteId, passengerId);
        RideEntity ride = new RideEntity();
        ride.setPassengerUserId(passengerId);
        ride.setStatus(RideStatus.REQUESTED);
        ride.setVehicleTypeRequested(quote.getVehicleType());
        ride.setPickupLat(quote.getPickupLat());
        ride.setPickupLng(quote.getPickupLng());
        ride.setPickupAddress(quote.getPickupAddress());
        ride.setDropoffLat(quote.getDropoffLat());
        ride.setDropoffLng(quote.getDropoffLng());
        ride.setDropoffAddress(quote.getDropoffAddress());
        ride.setFareQuoteId(quote.getId());
        ride.setDistanceM(quote.getDistanceM());
        ride.setDurationS(quote.getDurationS());
        ride.setPaymentMethod(paymentMethod == null ? "CASH" : paymentMethod);
        ride.setPaymentStatus("CASH".equalsIgnoreCase(ride.getPaymentMethod()) ? "NOT_REQUIRED" : "PENDING");
        ride.setTripPin(generatePin());
        ride = rideRepository.save(ride);
        appendEvent(ride, null, RideStatus.REQUESTED, passengerId, RoleCode.PASSENGER, Map.of());

        return transition(ride, RideStatus.SEARCHING_DRIVER, passengerId, RoleCode.PASSENGER, Map.of());
    }

    @Transactional
    public RideEntity tryMatch(UUID rideId) {
        return matchingService.tryMatch(rideId);
    }

    @Transactional
    public RideEntity bookAndMatch(UUID passengerId, UUID fareQuoteId, String paymentMethod) {
        RideEntity ride = book(passengerId, fareQuoteId, paymentMethod);
        return matchingService.tryMatch(ride.getId());
    }

    @Transactional
    public RideEntity markArriving(UUID rideId, UUID driverId) {
        RideEntity ride = requireDriverRide(rideId, driverId);
        return transition(ride, RideStatus.DRIVER_ARRIVING, driverId, RoleCode.DRIVER, Map.of());
    }

    @Transactional
    public RideEntity markArrived(UUID rideId, UUID driverId) {
        RideEntity ride = requireDriverRide(rideId, driverId);
        return transition(ride, RideStatus.DRIVER_ARRIVED, driverId, RoleCode.DRIVER, Map.of());
    }

    @Transactional
    public RideEntity start(UUID rideId, UUID driverId, String pin) {
        RideEntity ride = requireDriverRide(rideId, driverId);
        if (pin == null || !pin.equals(ride.getTripPin())) {
            throw new AppException("INVALID_PIN", "Trip PIN is incorrect", HttpStatus.BAD_REQUEST.value());
        }
        ride.setStartedAt(Instant.now());
        return transition(ride, RideStatus.RIDE_STARTED, driverId, RoleCode.DRIVER, Map.of());
    }

    @Transactional
    public RideEntity complete(UUID rideId, UUID driverId) {
        RideEntity ride = requireDriverRide(rideId, driverId);
        ride.setCompletedAt(Instant.now());
        if ("CASH".equalsIgnoreCase(ride.getPaymentMethod())) {
            ride.setPaymentStatus("CAPTURED");
        }
        RideEntity completed = transition(ride, RideStatus.RIDE_COMPLETED, driverId, RoleCode.DRIVER, Map.of());
        releaseDriver(driverId);
        if ("CASH".equalsIgnoreCase(completed.getPaymentMethod())) {
            paymentService.recordCashSettlement(completed);
        }
        return completed;
    }

    @Transactional
    public RideEntity cancel(UUID rideId, UUID actorId, RoleCode role, String reason) {
        RideEntity ride = requireRide(rideId);
        RideStatus target = role == RoleCode.DRIVER
                ? RideStatus.CANCELLED_BY_DRIVER
                : RideStatus.CANCELLED_BY_PASSENGER;

        if (role == RoleCode.PASSENGER && !ride.getPassengerUserId().equals(actorId)) {
            throw new AppException("FORBIDDEN", "Not your ride", HttpStatus.FORBIDDEN.value());
        }
        if (role == RoleCode.DRIVER && (ride.getDriverUserId() == null || !ride.getDriverUserId().equals(actorId))) {
            throw new AppException("FORBIDDEN", "Not your ride", HttpStatus.FORBIDDEN.value());
        }

        ride.setCancelReason(reason);
        ride.setCancelledBy(actorId);
        RideEntity cancelled = transition(ride, target, actorId, role, Map.of("reason", reason == null ? "" : reason));
        if (ride.getDriverUserId() != null) {
            releaseDriver(ride.getDriverUserId());
        }
        return cancelled;
    }

    @Transactional(readOnly = true)
    public RideEntity getForUser(UUID rideId, UUID userId, boolean admin) {
        RideEntity ride = requireRide(rideId);
        if (admin) {
            return ride;
        }
        boolean party = ride.getPassengerUserId().equals(userId)
                || (ride.getDriverUserId() != null && ride.getDriverUserId().equals(userId));
        if (!party) {
            throw new AppException("FORBIDDEN", "Not your ride", HttpStatus.FORBIDDEN.value());
        }
        return ride;
    }

    @Transactional(readOnly = true)
    public List<RideEntity> historyForPassenger(UUID passengerId) {
        return rideRepository.findByPassengerUserIdOrderByCreatedAtDesc(passengerId);
    }

    @Transactional(readOnly = true)
    public List<RideEntity> historyForDriver(UUID driverId) {
        return rideRepository.findByDriverUserIdOrderByCreatedAtDesc(driverId);
    }

    @Transactional(readOnly = true)
    public List<RideEntity> liveRides() {
        return rideRepository.findByStatusInOrderByCreatedAtDesc(ACTIVE_PASSENGER);
    }

    @Transactional(readOnly = true)
    public DriverLocationView driverLocationForRide(UUID rideId, UUID requesterId, boolean admin) {
        RideEntity ride = getForUser(rideId, requesterId, admin);
        if (ride.getDriverUserId() == null) {
            throw new AppException("NOT_FOUND", "No driver assigned", HttpStatus.NOT_FOUND.value());
        }
        List<Object[]> rows = driverProfileRepository.findLocationRaw(ride.getDriverUserId());
        if (rows.isEmpty()) {
            throw new AppException("NOT_FOUND", "Driver location unavailable", HttpStatus.NOT_FOUND.value());
        }
        Object[] row = rows.getFirst();
        double lat = ((Number) row[0]).doubleValue();
        double lng = ((Number) row[1]).doubleValue();
        Instant updatedAt;
        if (row[2] instanceof Instant i) {
            updatedAt = i;
        } else if (row[2] instanceof java.sql.Timestamp ts) {
            updatedAt = ts.toInstant();
        } else {
            updatedAt = Instant.parse(row[2].toString());
        }
        return new DriverLocationView(ride.getDriverUserId(), lat, lng, updatedAt);
    }

    public record DriverLocationView(UUID driverUserId, double lat, double lng, Instant updatedAt) {}

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
        appendEvent(saved, from, to, actorId, role, payload);
        eventPublisher.publishEvent(new RideRealtimeListener.RideStatusCommitted(
                saved.getId(),
                saved.getPassengerUserId(),
                saved.getDriverUserId(),
                from,
                to
        ));
        return saved;
    }

    private void appendEvent(
            RideEntity ride,
            RideStatus from,
            RideStatus to,
            UUID actorId,
            RoleCode role,
            Map<String, Object> payload
    ) {
        RideEventEntity event = new RideEventEntity();
        event.setRideId(ride.getId());
        event.setFromStatus(from == null ? null : from.name());
        event.setToStatus(to.name());
        event.setActorUserId(actorId);
        event.setActorRole(role == null ? "SYSTEM" : role.name());
        event.setSource(actorId == null ? "SYSTEM" : "API");
        event.setPayloadJson(payload);
        rideEventRepository.save(event);
    }

    private RideEntity requireRide(UUID rideId) {
        return rideRepository.findById(rideId)
                .orElseThrow(() -> new AppException("NOT_FOUND", "Ride not found", HttpStatus.NOT_FOUND.value()));
    }

    private RideEntity requireDriverRide(UUID rideId, UUID driverId) {
        RideEntity ride = requireRide(rideId);
        if (ride.getDriverUserId() == null || !ride.getDriverUserId().equals(driverId)) {
            throw new AppException("FORBIDDEN", "Not your ride", HttpStatus.FORBIDDEN.value());
        }
        return ride;
    }

    private void releaseDriver(UUID driverId) {
        driverProfileRepository.findById(driverId).ifPresent(driver -> {
            if (driver.isOnline()) {
                driver.setAvailabilityStatus(DriverAvailabilityStatus.AVAILABLE);
            } else {
                driver.setAvailabilityStatus(DriverAvailabilityStatus.OFFLINE);
            }
            driverProfileRepository.save(driver);
        });
    }

    private String generatePin() {
        int pin = 1000 + secureRandom.nextInt(9000);
        return String.valueOf(pin);
    }
}
