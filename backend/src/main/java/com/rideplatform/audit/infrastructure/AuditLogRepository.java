package com.rideplatform.audit.infrastructure;

import com.rideplatform.audit.domain.AuditLogEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface AuditLogRepository extends JpaRepository<AuditLogEntity, Long> {
    List<AuditLogEntity> findTop200ByOrderByCreatedAtDesc();
}
