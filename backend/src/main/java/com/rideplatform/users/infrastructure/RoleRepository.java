package com.rideplatform.users.infrastructure;

import com.rideplatform.users.domain.RoleCode;
import com.rideplatform.users.domain.RoleEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface RoleRepository extends JpaRepository<RoleEntity, Short> {
    Optional<RoleEntity> findByCode(RoleCode code);
}
