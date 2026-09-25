package com.rideplatform.matching.infrastructure;

import com.rideplatform.matching.domain.RideOfferEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface RideOfferRepository extends JpaRepository<RideOfferEntity, UUID> {
    List<RideOfferEntity> findByDriverUserIdAndStatusOrderByCreatedAtDesc(UUID driverUserId, String status);

    Optional<RideOfferEntity> findFirstByRideIdAndStatusOrderByCreatedAtDesc(UUID rideId, String status);

    List<RideOfferEntity> findByStatusAndExpiresAtBefore(String status, Instant before);

    List<RideOfferEntity> findByRideIdOrderByCreatedAtDesc(UUID rideId);
}
