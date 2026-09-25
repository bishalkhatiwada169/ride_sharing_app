package com.rideplatform.pricing.infrastructure;

import com.rideplatform.pricing.domain.FareRuleEntity;
import com.rideplatform.vehicles.domain.VehicleType;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface FareRuleRepository extends JpaRepository<FareRuleEntity, UUID> {
    List<FareRuleEntity> findByVehicleTypeAndActiveTrueOrderByPriorityAsc(VehicleType vehicleType);

    List<FareRuleEntity> findAllByOrderByPriorityAsc();
}
