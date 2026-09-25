package com.rideplatform.safety.application;

import com.rideplatform.common.exception.AppException;
import com.rideplatform.notifications.sms.SmsGateway;
import com.rideplatform.realtime.application.RealtimeEventPublisher;
import com.rideplatform.realtime.domain.RealtimeEvent;
import com.rideplatform.rides.domain.RideEntity;
import com.rideplatform.rides.domain.RideStatus;
import com.rideplatform.rides.infrastructure.RideRepository;
import com.rideplatform.safety.domain.EmergencyContactEntity;
import com.rideplatform.safety.domain.SafetyIncidentEntity;
import com.rideplatform.safety.domain.SosEventEntity;
import com.rideplatform.safety.domain.TripShareEntity;
import com.rideplatform.safety.infrastructure.EmergencyContactRepository;
import com.rideplatform.safety.infrastructure.SafetyIncidentRepository;
import com.rideplatform.safety.infrastructure.SosEventRepository;
import com.rideplatform.safety.infrastructure.TripShareRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.EnumSet;
import java.util.HexFormat;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class SafetyService {

    private static final int MAX_CONTACTS = 5;
    private static final EnumSet<RideStatus> SOS_ELIGIBLE = EnumSet.of(
            RideStatus.DRIVER_ACCEPTED, RideStatus.DRIVER_ARRIVING, RideStatus.DRIVER_ARRIVED, RideStatus.RIDE_STARTED
    );

    private final EmergencyContactRepository contactRepository;
    private final SafetyIncidentRepository incidentRepository;
    private final SosEventRepository sosEventRepository;
    private final TripShareRepository tripShareRepository;
    private final RideRepository rideRepository;
    private final SmsGateway smsGateway;
    private final RealtimeEventPublisher realtimeEventPublisher;
    private final SecureRandom secureRandom = new SecureRandom();

    public SafetyService(
            EmergencyContactRepository contactRepository,
            SafetyIncidentRepository incidentRepository,
            SosEventRepository sosEventRepository,
            TripShareRepository tripShareRepository,
            RideRepository rideRepository,
            SmsGateway smsGateway,
            RealtimeEventPublisher realtimeEventPublisher
    ) {
        this.contactRepository = contactRepository;
        this.incidentRepository = incidentRepository;
        this.sosEventRepository = sosEventRepository;
        this.tripShareRepository = tripShareRepository;
        this.rideRepository = rideRepository;
        this.smsGateway = smsGateway;
        this.realtimeEventPublisher = realtimeEventPublisher;
    }

    @Transactional(readOnly = true)
    public List<EmergencyContactEntity> listContacts(UUID userId) {
        return contactRepository.findByUserIdOrderByCreatedAtAsc(userId);
    }

    @Transactional
    public List<EmergencyContactEntity> replaceContacts(UUID userId, List<ContactInput> contacts) {
        if (contacts.size() > MAX_CONTACTS) {
            throw new AppException("VALIDATION_ERROR", "Max " + MAX_CONTACTS + " emergency contacts", HttpStatus.BAD_REQUEST.value());
        }
        contactRepository.deleteByUserId(userId);
        List<EmergencyContactEntity> saved = new ArrayList<>();
        for (ContactInput c : contacts) {
            EmergencyContactEntity e = new EmergencyContactEntity();
            e.setUserId(userId);
            e.setName(c.name().trim());
            e.setPhoneE164(c.phoneE164().trim());
            e.setRelationship(c.relationship());
            saved.add(contactRepository.save(e));
        }
        return saved;
    }

    @Transactional
    public SafetyIncidentEntity triggerSos(UUID userId, UUID rideId, Double lat, Double lng, String notes) {
        RideEntity ride = rideRepository.findById(rideId)
                .orElseThrow(() -> new AppException("NOT_FOUND", "Ride not found", HttpStatus.NOT_FOUND.value()));
        boolean party = ride.getPassengerUserId().equals(userId)
                || (ride.getDriverUserId() != null && ride.getDriverUserId().equals(userId));
        if (!party) {
            throw new AppException("FORBIDDEN", "Not your ride", HttpStatus.FORBIDDEN.value());
        }
        if (!SOS_ELIGIBLE.contains(ride.getStatus())) {
            throw new AppException("CONFLICT", "SOS only during active trip stages", HttpStatus.CONFLICT.value());
        }

        SafetyIncidentEntity incident = new SafetyIncidentEntity();
        incident.setRideId(rideId);
        incident.setReporterUserId(userId);
        incident.setType("SOS");
        incident.setStatus("OPEN");
        incident.setCategory("SOS");
        incident.setNotes(notes);
        incident.setLat(lat);
        incident.setLng(lng);
        incident = incidentRepository.save(incident);

        List<EmergencyContactEntity> contacts = contactRepository.findByUserIdOrderByCreatedAtAsc(userId);
        int notified = 0;
        for (EmergencyContactEntity contact : contacts) {
            smsGateway.sendText(
                    contact.getPhoneE164(),
                    "SOS alert from Ride Platform user. Ride " + rideId + " — contact them immediately."
            );
            notified++;
        }

        SosEventEntity sos = new SosEventEntity();
        sos.setIncidentId(incident.getId());
        sos.setContactsNotified(notified);
        sos.setPayloadJson(Map.of(
                "lat", lat == null ? "" : lat,
                "lng", lng == null ? "" : lng,
                "rideStatus", ride.getStatus().name()
        ));
        sosEventRepository.save(sos);

        realtimeEventPublisher.publish(new RealtimeEvent(
                RealtimeEvent.SAFETY_ALERT,
                Instant.now(),
                rideId,
                ride.getDriverUserId(),
                ride.getPassengerUserId(),
                Map.of(
                        "incidentId", incident.getId().toString(),
                        "type", "SOS",
                        "status", "OPEN",
                        "reporterUserId", userId.toString()
                ),
                null
        ));
        return incident;
    }

    @Transactional
    public SafetyIncidentEntity reportIncident(
            UUID userId,
            UUID rideId,
            String category,
            String notes,
            Double lat,
            Double lng
    ) {
        if (rideId != null) {
            RideEntity ride = rideRepository.findById(rideId)
                    .orElseThrow(() -> new AppException("NOT_FOUND", "Ride not found", HttpStatus.NOT_FOUND.value()));
            boolean party = ride.getPassengerUserId().equals(userId)
                    || (ride.getDriverUserId() != null && ride.getDriverUserId().equals(userId));
            if (!party) {
                throw new AppException("FORBIDDEN", "Not your ride", HttpStatus.FORBIDDEN.value());
            }
        }
        SafetyIncidentEntity incident = new SafetyIncidentEntity();
        incident.setRideId(rideId);
        incident.setReporterUserId(userId);
        incident.setType("REPORT");
        incident.setStatus("OPEN");
        incident.setCategory(category == null ? "OTHER" : category);
        incident.setNotes(notes);
        incident.setLat(lat);
        incident.setLng(lng);
        incident = incidentRepository.save(incident);

        realtimeEventPublisher.publish(new RealtimeEvent(
                RealtimeEvent.SAFETY_ALERT,
                Instant.now(),
                rideId,
                null,
                userId,
                Map.of(
                        "incidentId", incident.getId().toString(),
                        "type", "REPORT",
                        "status", "OPEN",
                        "category", incident.getCategory()
                ),
                null
        ));
        return incident;
    }

    @Transactional(readOnly = true)
    public List<SafetyIncidentEntity> adminIncidents() {
        return incidentRepository.findAllByOrderByCreatedAtDesc();
    }

    @Transactional
    public SafetyIncidentEntity resolve(UUID incidentId, UUID adminId) {
        SafetyIncidentEntity incident = incidentRepository.findById(incidentId)
                .orElseThrow(() -> new AppException("NOT_FOUND", "Incident not found", HttpStatus.NOT_FOUND.value()));
        incident.setStatus("RESOLVED");
        incident.setResolvedAt(Instant.now());
        incident.setResolvedBy(adminId);
        return incidentRepository.save(incident);
    }

    @Transactional
    public TripShareEntity createShare(UUID userId, UUID rideId) {
        RideEntity ride = rideRepository.findById(rideId)
                .orElseThrow(() -> new AppException("NOT_FOUND", "Ride not found", HttpStatus.NOT_FOUND.value()));
        if (!ride.getPassengerUserId().equals(userId)) {
            throw new AppException("FORBIDDEN", "Only passenger can share trip", HttpStatus.FORBIDDEN.value());
        }
        tripShareRepository.findFirstByRideIdAndRevokedAtIsNullOrderByCreatedAtDesc(rideId).ifPresent(existing -> {
            existing.setRevokedAt(Instant.now());
            tripShareRepository.save(existing);
        });

        byte[] bytes = new byte[24];
        secureRandom.nextBytes(bytes);
        TripShareEntity share = new TripShareEntity();
        share.setRideId(rideId);
        share.setCreatedBy(userId);
        share.setToken(HexFormat.of().formatHex(bytes));
        share.setExpiresAt(Instant.now().plus(24, ChronoUnit.HOURS));
        return tripShareRepository.save(share);
    }

    @Transactional
    public void revokeShare(UUID userId, UUID rideId) {
        RideEntity ride = rideRepository.findById(rideId)
                .orElseThrow(() -> new AppException("NOT_FOUND", "Ride not found", HttpStatus.NOT_FOUND.value()));
        if (!ride.getPassengerUserId().equals(userId)) {
            throw new AppException("FORBIDDEN", "Only passenger can revoke share", HttpStatus.FORBIDDEN.value());
        }
        tripShareRepository.findFirstByRideIdAndRevokedAtIsNullOrderByCreatedAtDesc(rideId).ifPresent(share -> {
            share.setRevokedAt(Instant.now());
            tripShareRepository.save(share);
        });
    }

    @Transactional(readOnly = true)
    public TripShareView publicShare(String token) {
        TripShareEntity share = tripShareRepository.findByToken(token)
                .orElseThrow(() -> new AppException("NOT_FOUND", "Share not found", HttpStatus.NOT_FOUND.value()));
        if (share.getRevokedAt() != null || share.getExpiresAt().isBefore(Instant.now())) {
            throw new AppException("GONE", "Share expired or revoked", HttpStatus.GONE.value());
        }
        RideEntity ride = rideRepository.findById(share.getRideId())
                .orElseThrow(() -> new AppException("NOT_FOUND", "Ride not found", HttpStatus.NOT_FOUND.value()));
        return new TripShareView(
                ride.getId(),
                ride.getStatus().name(),
                ride.getPickupAddress(),
                ride.getDropoffAddress(),
                share.getExpiresAt()
        );
    }

    public record ContactInput(String name, String phoneE164, String relationship) {}

    public record TripShareView(
            UUID rideId,
            String status,
            String pickupAddress,
            String dropoffAddress,
            Instant expiresAt
    ) {}
}
