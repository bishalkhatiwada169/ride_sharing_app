package com.rideplatform.audit.application;

import com.rideplatform.audit.domain.AuditLogEntity;
import com.rideplatform.audit.infrastructure.AuditLogRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class AuditService {

    private final AuditLogRepository auditLogRepository;

    public AuditService(AuditLogRepository auditLogRepository) {
        this.auditLogRepository = auditLogRepository;
    }

    @Transactional
    public void record(
            UUID actorUserId,
            String action,
            String entityType,
            String entityId,
            Map<String, Object> before,
            Map<String, Object> after,
            String ip,
            String userAgent
    ) {
        AuditLogEntity log = new AuditLogEntity();
        log.setActorUserId(actorUserId);
        log.setAction(action);
        log.setEntityType(entityType);
        log.setEntityId(entityId);
        log.setBeforeJson(before);
        log.setAfterJson(after);
        log.setIpAddress(ip);
        log.setUserAgent(userAgent == null ? null : userAgent.substring(0, Math.min(userAgent.length(), 512)));
        auditLogRepository.save(log);
    }

    @Transactional(readOnly = true)
    public List<AuditLogEntity> recent() {
        return auditLogRepository.findTop200ByOrderByCreatedAtDesc();
    }
}
