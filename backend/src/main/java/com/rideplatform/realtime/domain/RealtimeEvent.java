package com.rideplatform.realtime.domain;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

public record RealtimeEvent(
        String type,
        Instant occurredAt,
        UUID rideId,
        UUID driverUserId,
        UUID passengerUserId,
        Map<String, Object> payload,
        String correlationId
) {
    public static final String RIDE_STATUS_CHANGED = "RIDE_STATUS_CHANGED";
    public static final String DRIVER_LOCATION = "DRIVER_LOCATION";
    public static final String PAYMENT_STATUS = "PAYMENT_STATUS";
    public static final String SAFETY_ALERT = "SAFETY_ALERT";

    public static RealtimeEvent rideStatus(
            UUID rideId,
            UUID passengerUserId,
            UUID driverUserId,
            String from,
            String to,
            String correlationId
    ) {
        return new RealtimeEvent(
                RIDE_STATUS_CHANGED,
                Instant.now(),
                rideId,
                driverUserId,
                passengerUserId,
                Map.of("from", from == null ? "" : from, "to", to),
                correlationId
        );
    }

    public static RealtimeEvent driverLocation(
            UUID rideId,
            UUID driverUserId,
            UUID passengerUserId,
            double lat,
            double lng,
            String correlationId
    ) {
        return new RealtimeEvent(
                DRIVER_LOCATION,
                Instant.now(),
                rideId,
                driverUserId,
                passengerUserId,
                Map.of("lat", lat, "lng", lng, "recordedAt", Instant.now().toString()),
                correlationId
        );
    }
}
