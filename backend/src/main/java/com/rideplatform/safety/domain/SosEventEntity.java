package com.rideplatform.safety.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import java.time.Instant;
import java.util.Map;
import java.util.UUID;

@Entity
@Table(name = "sos_events")
public class SosEventEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "incident_id", nullable = false)
    private UUID incidentId;

    @Column(name = "contacts_notified", nullable = false)
    private int contactsNotified;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "payload_json")
    private Map<String, Object> payloadJson;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @PrePersist
    void onCreate() {
        createdAt = Instant.now();
    }

    public UUID getId() { return id; }
    public UUID getIncidentId() { return incidentId; }
    public void setIncidentId(UUID incidentId) { this.incidentId = incidentId; }
    public int getContactsNotified() { return contactsNotified; }
    public void setContactsNotified(int contactsNotified) { this.contactsNotified = contactsNotified; }
    public Map<String, Object> getPayloadJson() { return payloadJson; }
    public void setPayloadJson(Map<String, Object> payloadJson) { this.payloadJson = payloadJson; }
    public Instant getCreatedAt() { return createdAt; }
}
