package com.rideplatform.vehicles.infrastructure;

import com.rideplatform.vehicles.domain.VehicleEntity;
import com.rideplatform.vehicles.domain.VehicleStatus;
import com.rideplatform.vehicles.domain.VehicleType;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface VehicleRepository extends JpaRepository<VehicleEntity, UUID> {
    List<VehicleEntity> findByDriverUserIdOrderByCreatedAtDesc(UUID driverUserId);

    Optional<VehicleEntity> findFirstByDriverUserIdAndVehicleTypeAndStatus(
            UUID driverUserId,
            VehicleType vehicleType,
            VehicleStatus status
    );

    Optional<VehicleEntity> findFirstByDriverUserIdAndStatus(UUID driverUserId, VehicleStatus status);
}
