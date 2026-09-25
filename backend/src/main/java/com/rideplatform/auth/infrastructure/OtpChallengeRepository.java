package com.rideplatform.auth.infrastructure;

import com.rideplatform.auth.domain.OtpChallengeEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface OtpChallengeRepository extends JpaRepository<OtpChallengeEntity, UUID> {
    Optional<OtpChallengeEntity> findFirstByPhoneE164AndConsumedAtIsNullOrderByCreatedAtDesc(String phoneE164);
}
