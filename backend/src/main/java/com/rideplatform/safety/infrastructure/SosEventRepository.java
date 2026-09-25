package com.rideplatform.safety.infrastructure;

import com.rideplatform.safety.domain.SosEventEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface SosEventRepository extends JpaRepository<SosEventEntity, UUID> {
}
