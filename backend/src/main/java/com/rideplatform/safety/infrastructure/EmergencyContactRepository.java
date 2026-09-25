package com.rideplatform.safety.infrastructure;

import com.rideplatform.safety.domain.EmergencyContactEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;

import java.util.List;
import java.util.UUID;

public interface EmergencyContactRepository extends JpaRepository<EmergencyContactEntity, UUID> {
    List<EmergencyContactEntity> findByUserIdOrderByCreatedAtAsc(UUID userId);

    @Modifying(clearAutomatically = true)
    void deleteByUserId(UUID userId);

    long countByUserId(UUID userId);
}
