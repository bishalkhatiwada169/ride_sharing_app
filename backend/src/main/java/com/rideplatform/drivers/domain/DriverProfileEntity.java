package com.rideplatform.drivers.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "driver_profiles")
public class DriverProfileEntity {

    @Id
    @Column(name = "user_id")
    private UUID userId;

    @Enumerated(EnumType.STRING)
    @Column(name = "verification_status", nullable = false)
    private DriverVerificationStatus verificationStatus = DriverVerificationStatus.DRAFT;

    @Column(name = "is_online", nullable = false)
    private boolean online;

    @Enumerated(EnumType.STRING)
    @Column(name = "availability_status", nullable = false)
    private DriverAvailabilityStatus availabilityStatus = DriverAvailabilityStatus.OFFLINE;

    @Column(name = "location_updated_at")
    private Instant locationUpdatedAt;

    @Column(name = "rating_avg", nullable = false)
    private BigDecimal ratingAvg = BigDecimal.ZERO;

    @Column(name = "rating_count", nullable = false)
    private int ratingCount;

    @Column(name = "approved_at")
    private Instant approvedAt;

    @Column(name = "rejected_reason")
    private String rejectedReason;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @PrePersist
    void onCreate() {
        Instant now = Instant.now();
        createdAt = now;
        updatedAt = now;
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = Instant.now();
    }

    public UUID getUserId() { return userId; }
    public void setUserId(UUID userId) { this.userId = userId; }
    public DriverVerificationStatus getVerificationStatus() { return verificationStatus; }
    public void setVerificationStatus(DriverVerificationStatus verificationStatus) { this.verificationStatus = verificationStatus; }
    public boolean isOnline() { return online; }
    public void setOnline(boolean online) { this.online = online; }
    public DriverAvailabilityStatus getAvailabilityStatus() { return availabilityStatus; }
    public void setAvailabilityStatus(DriverAvailabilityStatus availabilityStatus) { this.availabilityStatus = availabilityStatus; }
    public Instant getLocationUpdatedAt() { return locationUpdatedAt; }
    public void setLocationUpdatedAt(Instant locationUpdatedAt) { this.locationUpdatedAt = locationUpdatedAt; }
    public BigDecimal getRatingAvg() { return ratingAvg; }
    public void setRatingAvg(BigDecimal ratingAvg) { this.ratingAvg = ratingAvg; }
    public int getRatingCount() { return ratingCount; }
    public void setRatingCount(int ratingCount) { this.ratingCount = ratingCount; }
    public Instant getApprovedAt() { return approvedAt; }
    public void setApprovedAt(Instant approvedAt) { this.approvedAt = approvedAt; }
    public String getRejectedReason() { return rejectedReason; }
    public void setRejectedReason(String rejectedReason) { this.rejectedReason = rejectedReason; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
}
