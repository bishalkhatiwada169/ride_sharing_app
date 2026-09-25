package com.rideplatform.audit.api;

import com.rideplatform.audit.application.AuditService;
import com.rideplatform.audit.domain.AuditLogEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/admin/audit-logs")
@PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN','SUPPORT')")
public class AuditLogController {

    private final AuditService auditService;

    public AuditLogController(AuditService auditService) {
        this.auditService = auditService;
    }

    public record AuditResponse(
            Long id,
            UUID actorUserId,
            String action,
            String entityType,
            String entityId,
            Map<String, Object> afterJson,
            Instant createdAt
    ) {
        static AuditResponse from(AuditLogEntity e) {
            return new AuditResponse(
                    e.getId(), e.getActorUserId(), e.getAction(), e.getEntityType(),
                    e.getEntityId(), e.getAfterJson(), e.getCreatedAt()
            );
        }
    }

    @GetMapping
    public List<AuditResponse> list() {
        return auditService.recent().stream().map(AuditResponse::from).toList();
    }
}
