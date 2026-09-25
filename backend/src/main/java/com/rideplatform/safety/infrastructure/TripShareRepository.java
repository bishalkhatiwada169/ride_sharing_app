package com.rideplatform.safety.infrastructure;

import com.rideplatform.safety.domain.TripShareEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface TripShareRepository extends JpaRepository<TripShareEntity, UUID> {
    Optional<TripShareEntity> findByToken(String token);

    Optional<TripShareEntity> findFirstByRideIdAndRevokedAtIsNullOrderByCreatedAtDesc(UUID rideId);
}
