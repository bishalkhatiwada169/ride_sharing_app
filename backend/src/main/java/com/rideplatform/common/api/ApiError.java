package com.rideplatform.common.api;

import java.time.Instant;
import java.util.List;

public record ApiError(
        Instant timestamp,
        int status,
        String code,
        String message,
        String path,
        String correlationId,
        List<FieldViolation> details
) {
    public record FieldViolation(String field, String message) {}
}
