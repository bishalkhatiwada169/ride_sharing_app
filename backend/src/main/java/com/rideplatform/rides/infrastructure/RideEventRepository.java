package com.rideplatform.rides.infrastructure;

import com.rideplatform.rides.domain.RideEventEntity;
import org.springframework.data.jpa.repository.JpaRepository;

public interface RideEventRepository extends JpaRepository<RideEventEntity, Long> {
}
