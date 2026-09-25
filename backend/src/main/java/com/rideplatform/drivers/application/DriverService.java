package com.rideplatform.drivers.application;

import com.rideplatform.audit.application.AuditService;
import com.rideplatform.common.exception.AppException;
import com.rideplatform.drivers.domain.DriverAvailabilityStatus;
import com.rideplatform.drivers.domain.DriverProfileEntity;
import com.rideplatform.drivers.domain.DriverVerificationStatus;
import com.rideplatform.drivers.infrastructure.DriverProfileRepository;
import com.rideplatform.realtime.application.RideRealtimeListener;
import com.rideplatform.rides.domain.RideEntity;
import com.rideplatform.rides.domain.RideStatus;
import com.rideplatform.rides.infrastructure.RideRepository;
import com.rideplatform.users.application.UserService;
import com.rideplatform.users.domain.UserEntity;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.EnumSet;
import java.util.List;
import java.util.UUID;

@Service
public class DriverService {

    private static final EnumSet<RideStatus> ACTIVE_TRIP = EnumSet.of(
            RideStatus.DRIVER_ACCEPTED,
            RideStatus.DRIVER_ARRIVING,
            RideStatus.DRIVER_ARRIVED,
            RideStatus.RIDE_STARTED
    );

    private final DriverProfileRepository driverProfileRepository;
    private final UserService userService;
    private final RideRepository rideRepository;
    private final ApplicationEventPublisher eventPublisher;
    private final AuditService auditService;

    public DriverService(
            DriverProfileRepository driverProfileRepository,
            UserService userService,
            RideRepository rideRepository,
            ApplicationEventPublisher eventPublisher,
            AuditService auditService
    ) {
        this.driverProfileRepository = driverProfileRepository;
        this.userService = userService;
        this.rideRepository = rideRepository;
        this.eventPublisher = eventPublisher;
        this.auditService = auditService;
    }

    @Transactional
    public DriverProfileEntity registerAsDriver(UUID userId, String displayName) {
        userService.ensureDriverRole(userId);
        UserEntity user = userService.requireUser(userId);
        if (displayName != null && !displayName.isBlank()) {
            user.setDisplayName(displayName.trim());
        }
        return driverProfileRepository.findById(userId).orElseGet(() -> {
            DriverProfileEntity profile = new DriverProfileEntity();
            profile.setUserId(userId);
            profile.setVerificationStatus(DriverVerificationStatus.DRAFT);
            profile.setOnline(false);
            profile.setAvailabilityStatus(DriverAvailabilityStatus.OFFLINE);
            return driverProfileRepository.save(profile);
        });
    }

    @Transactional
    public DriverProfileEntity submitForVerification(UUID userId) {
        DriverProfileEntity profile = requireProfile(userId);
        if (profile.getVerificationStatus() == DriverVerificationStatus.APPROVED) {
            return profile;
        }
        profile.setVerificationStatus(DriverVerificationStatus.PENDING);
        profile.setRejectedReason(null);
        return driverProfileRepository.save(profile);
    }

    @Transactional(readOnly = true)
    public DriverProfileEntity requireProfile(UUID userId) {
        return driverProfileRepository.findById(userId)
                .orElseThrow(() -> new AppException("NOT_FOUND", "Driver profile not found", HttpStatus.NOT_FOUND.value()));
    }

    @Transactional
    public DriverProfileEntity goOnline(UUID userId) {
        DriverProfileEntity profile = requireProfile(userId);
        if (profile.getVerificationStatus() != DriverVerificationStatus.APPROVED) {
            throw new AppException("DRIVER_NOT_APPROVED", "Driver must be approved before going online", HttpStatus.CONFLICT.value());
        }
        profile.setOnline(true);
        profile.setAvailabilityStatus(DriverAvailabilityStatus.AVAILABLE);
        return driverProfileRepository.save(profile);
    }

    @Transactional
    public DriverProfileEntity goOffline(UUID userId) {
        DriverProfileEntity profile = requireProfile(userId);
        if (profile.getAvailabilityStatus() == DriverAvailabilityStatus.ON_TRIP
                || profile.getAvailabilityStatus() == DriverAvailabilityStatus.ON_OFFER) {
            throw new AppException("DRIVER_BUSY", "Cannot go offline while on offer or trip", HttpStatus.CONFLICT.value());
        }
        profile.setOnline(false);
        profile.setAvailabilityStatus(DriverAvailabilityStatus.OFFLINE);
        return driverProfileRepository.save(profile);
    }

    @Transactional
    public void updateLocation(UUID userId, double lat, double lng) {
        requireProfile(userId);
        if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
            throw new AppException("VALIDATION_ERROR", "Invalid coordinates", HttpStatus.BAD_REQUEST.value());
        }
        driverProfileRepository.updateLocation(userId, lat, lng, Instant.now());
        RideEntity active = rideRepository.findFirstByDriverUserIdAndStatusIn(userId, ACTIVE_TRIP).orElse(null);
        eventPublisher.publishEvent(new RideRealtimeListener.DriverLocationCommitted(
                active == null ? null : active.getId(),
                userId,
                active == null ? null : active.getPassengerUserId(),
                lat,
                lng
        ));
    }

    @Transactional
    public DriverProfileEntity approve(UUID driverUserId) {
        DriverProfileEntity profile = requireProfile(driverUserId);
        profile.setVerificationStatus(DriverVerificationStatus.APPROVED);
        profile.setApprovedAt(Instant.now());
        profile.setRejectedReason(null);
        DriverProfileEntity saved = driverProfileRepository.save(profile);
        auditService.record(null, "DRIVER_APPROVE", "driver", driverUserId.toString(),
                null, java.util.Map.of("status", "APPROVED"), null, null);
        return saved;
    }

    @Transactional
    public DriverProfileEntity reject(UUID driverUserId, String reason) {
        DriverProfileEntity profile = requireProfile(driverUserId);
        profile.setVerificationStatus(DriverVerificationStatus.REJECTED);
        profile.setRejectedReason(reason);
        profile.setOnline(false);
        profile.setAvailabilityStatus(DriverAvailabilityStatus.OFFLINE);
        DriverProfileEntity saved = driverProfileRepository.save(profile);
        auditService.record(null, "DRIVER_REJECT", "driver", driverUserId.toString(),
                null, java.util.Map.of("status", "REJECTED", "reason", reason == null ? "" : reason), null, null);
        return saved;
    }

    @Transactional(readOnly = true)
    public List<DriverProfileEntity> listPending() {
        return driverProfileRepository.findAll().stream()
                .filter(d -> d.getVerificationStatus() == DriverVerificationStatus.PENDING)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<DriverProfileEntity> listAll() {
        return driverProfileRepository.findAll();
    }
}
