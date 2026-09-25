package com.rideplatform.rides.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import java.time.Instant;
import java.util.Map;
import java.util.UUID;

@Entity
@Table(name = "ride_events")
public class RideEventEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "ride_id", nullable = false)
    private UUID rideId;

    @Column(name = "from_status")
    private String fromStatus;

    @Column(name = "to_status", nullable = false)
    private String toStatus;

    @Column(name = "actor_user_id")
    private UUID actorUserId;

    @Column(name = "actor_role")
    private String actorRole;

    @Column(nullable = false)
    private String source = "API";

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "payload_json")
    private Map<String, Object> payloadJson;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();

    public void setRideId(UUID rideId) { this.rideId = rideId; }
    public void setFromStatus(String fromStatus) { this.fromStatus = fromStatus; }
    public void setToStatus(String toStatus) { this.toStatus = toStatus; }
    public void setActorUserId(UUID actorUserId) { this.actorUserId = actorUserId; }
    public void setActorRole(String actorRole) { this.actorRole = actorRole; }
    public void setSource(String source) { this.source = source; }
    public void setPayloadJson(Map<String, Object> payloadJson) { this.payloadJson = payloadJson; }
}
