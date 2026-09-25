package com.rideplatform.users.infrastructure;

import com.rideplatform.users.domain.UserEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface UserRepository extends JpaRepository<UserEntity, UUID> {
    Optional<UserEntity> findByPhoneE164(String phoneE164);

    Optional<UserEntity> findByEmailIgnoreCase(String email);
}
