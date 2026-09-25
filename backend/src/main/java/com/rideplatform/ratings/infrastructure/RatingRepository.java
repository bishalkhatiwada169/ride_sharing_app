package com.rideplatform.ratings.infrastructure;

import com.rideplatform.ratings.domain.RatingEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface RatingRepository extends JpaRepository<RatingEntity, UUID> {
    Optional<RatingEntity> findByRideIdAndRaterUserId(UUID rideId, UUID raterUserId);

    List<RatingEntity> findAllByOrderByCreatedAtDesc();

    List<RatingEntity> findByRateeUserIdOrderByCreatedAtDesc(UUID rateeUserId);
}
