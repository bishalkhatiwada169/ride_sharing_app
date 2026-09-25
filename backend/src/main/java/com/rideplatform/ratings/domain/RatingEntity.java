package com.rideplatform.ratings.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "ratings")
public class RatingEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "ride_id", nullable = false)
    private UUID rideId;

    @Column(name = "rater_user_id", nullable = false)
    private UUID raterUserId;

    @Column(name = "ratee_user_id", nullable = false)
    private UUID rateeUserId;

    @Column(nullable = false)
    private short score;

    @Column(columnDefinition = "TEXT")
    private String comment;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @PrePersist
    void onCreate() {
        createdAt = Instant.now();
    }

    public UUID getId() { return id; }
    public UUID getRideId() { return rideId; }
    public void setRideId(UUID rideId) { this.rideId = rideId; }
    public UUID getRaterUserId() { return raterUserId; }
    public void setRaterUserId(UUID raterUserId) { this.raterUserId = raterUserId; }
    public UUID getRateeUserId() { return rateeUserId; }
    public void setRateeUserId(UUID rateeUserId) { this.rateeUserId = rateeUserId; }
    public short getScore() { return score; }
    public void setScore(short score) { this.score = score; }
    public String getComment() { return comment; }
    public void setComment(String comment) { this.comment = comment; }
    public Instant getCreatedAt() { return createdAt; }
}
