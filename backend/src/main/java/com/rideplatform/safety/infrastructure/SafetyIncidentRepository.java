package com.rideplatform.safety.infrastructure;

import com.rideplatform.safety.domain.SafetyIncidentEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface SafetyIncidentRepository extends JpaRepository<SafetyIncidentEntity, UUID> {
    List<SafetyIncidentEntity> findAllByOrderByCreatedAtDesc();

    List<SafetyIncidentEntity> findByStatusOrderByCreatedAtDesc(String status);
}
