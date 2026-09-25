package com.rideplatform.rides.infrastructure;

import com.rideplatform.rides.domain.RideEntity;
import com.rideplatform.rides.domain.RideStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface RideRepository extends JpaRepository<RideEntity, UUID> {
    List<RideEntity> findByPassengerUserIdOrderByCreatedAtDesc(UUID passengerUserId);

    List<RideEntity> findByDriverUserIdOrderByCreatedAtDesc(UUID driverUserId);

    List<RideEntity> findByStatusInOrderByCreatedAtDesc(Collection<RideStatus> statuses);

    Optional<RideEntity> findFirstByPassengerUserIdAndStatusIn(UUID passengerUserId, Collection<RideStatus> statuses);

    Optional<RideEntity> findFirstByDriverUserIdAndStatusIn(UUID driverUserId, Collection<RideStatus> statuses);
}
