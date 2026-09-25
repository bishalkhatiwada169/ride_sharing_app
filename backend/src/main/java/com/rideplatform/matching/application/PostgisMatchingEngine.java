package com.rideplatform.matching.application;

import com.rideplatform.drivers.domain.DriverAvailabilityStatus;
import com.rideplatform.drivers.domain.DriverVerificationStatus;
import com.rideplatform.drivers.infrastructure.DriverProfileRepository;
import com.rideplatform.vehicles.domain.VehicleStatus;
import com.rideplatform.vehicles.domain.VehicleType;
import com.rideplatform.vehicles.infrastructure.VehicleRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

/**
 * PostGIS nearest-driver matching: radius + freshness + vehicle type, ranked by distance then rating.
 */
@Service
public class PostgisMatchingEngine {

    private final DriverProfileRepository driverProfileRepository;
    private final VehicleRepository vehicleRepository;
    private final int maxRadiusMeters;
    private final int locationStaleSeconds;

    public PostgisMatchingEngine(
            DriverProfileRepository driverProfileRepository,
            VehicleRepository vehicleRepository,
            @Value("${rideplatform.matching.max-radius-meters:5000}") int maxRadiusMeters,
            @Value("${rideplatform.matching.location-stale-seconds:120}") int locationStaleSeconds
    ) {
        this.driverProfileRepository = driverProfileRepository;
        this.vehicleRepository = vehicleRepository;
        this.maxRadiusMeters = maxRadiusMeters;
        this.locationStaleSeconds = locationStaleSeconds;
    }

    public record MatchCandidate(UUID driverUserId, UUID vehicleId, int distanceM) {}

    @Transactional(readOnly = true)
    public Optional<MatchCandidate> findCandidate(
            VehicleType vehicleType,
            double pickupLat,
            double pickupLng,
            Set<UUID> excludeDriverIds
    ) {
        Set<UUID> exclude = excludeDriverIds == null ? Set.of() : excludeDriverIds;
        List<Object[]> rows = driverProfileRepository.findNearbyCandidates(
                pickupLat,
                pickupLng,
                maxRadiusMeters,
                locationStaleSeconds,
                DriverVerificationStatus.APPROVED.name(),
                DriverAvailabilityStatus.AVAILABLE.name(),
                25
        );

        for (Object[] row : rows) {
            UUID driverId = toUuid(row[0]);
            if (exclude.contains(driverId)) {
                continue;
            }
            int distanceM = row[1] instanceof Number n ? (int) Math.round(n.doubleValue()) : 0;
            var vehicle = vehicleRepository
                    .findFirstByDriverUserIdAndVehicleTypeAndStatus(driverId, vehicleType, VehicleStatus.ACTIVE)
                    .or(() -> vehicleRepository.findFirstByDriverUserIdAndStatus(driverId, VehicleStatus.ACTIVE));
            if (vehicle.isPresent()) {
                return Optional.of(new MatchCandidate(driverId, vehicle.get().getId(), distanceM));
            }
        }
        return Optional.empty();
    }

    @Transactional(readOnly = true)
    public Optional<MatchCandidate> findCandidateFallback(VehicleType vehicleType, Set<UUID> excludeDriverIds) {
        // If PostGIS returns nothing (e.g. no location), fall back to simple available list
        Set<UUID> exclude = excludeDriverIds == null ? new HashSet<>() : new HashSet<>(excludeDriverIds);
        return driverProfileRepository
                .findByVerificationStatusAndOnlineTrueAndAvailabilityStatus(
                        DriverVerificationStatus.APPROVED,
                        DriverAvailabilityStatus.AVAILABLE
                )
                .stream()
                .filter(d -> !exclude.contains(d.getUserId()))
                .map(d -> vehicleRepository
                        .findFirstByDriverUserIdAndVehicleTypeAndStatus(d.getUserId(), vehicleType, VehicleStatus.ACTIVE)
                        .or(() -> vehicleRepository.findFirstByDriverUserIdAndStatus(d.getUserId(), VehicleStatus.ACTIVE))
                        .map(v -> new MatchCandidate(d.getUserId(), v.getId(), Integer.MAX_VALUE)))
                .flatMap(Optional::stream)
                .findFirst();
    }

    private static UUID toUuid(Object raw) {
        if (raw instanceof UUID u) {
            return u;
        }
        return UUID.fromString(raw.toString());
    }
}
