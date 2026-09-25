package com.rideplatform.notifications.infrastructure;

import com.rideplatform.notifications.domain.DeviceTokenEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface DeviceTokenRepository extends JpaRepository<DeviceTokenEntity, UUID> {
    Optional<DeviceTokenEntity> findByUserIdAndToken(UUID userId, String token);

    List<DeviceTokenEntity> findByUserId(UUID userId);
}
