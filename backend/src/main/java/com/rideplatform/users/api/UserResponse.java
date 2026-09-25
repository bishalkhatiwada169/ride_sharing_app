package com.rideplatform.users.api;

import com.rideplatform.users.domain.RoleCode;
import com.rideplatform.users.domain.UserStatus;

import java.time.Instant;
import java.util.Set;
import java.util.UUID;

public record UserResponse(
        UUID id,
        String phoneE164,
        String email,
        String displayName,
        UserStatus status,
        String locale,
        Set<RoleCode> roles,
        Instant createdAt
) {}
