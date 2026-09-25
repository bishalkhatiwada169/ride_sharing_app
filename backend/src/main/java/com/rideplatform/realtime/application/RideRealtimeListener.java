package com.rideplatform.realtime.application;

import com.rideplatform.realtime.domain.RealtimeEvent;
import com.rideplatform.rides.domain.RideStatus;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

import java.util.UUID;

@Component
public class RideRealtimeListener {

    private final RealtimeEventPublisher publisher;

    public RideRealtimeListener(RealtimeEventPublisher publisher) {
        this.publisher = publisher;
    }

    public record RideStatusCommitted(
            UUID rideId,
            UUID passengerUserId,
            UUID driverUserId,
            RideStatus from,
            RideStatus to
    ) {}

    public record DriverLocationCommitted(
            UUID rideId,
            UUID driverUserId,
            UUID passengerUserId,
            double lat,
            double lng
    ) {}

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onRideStatus(RideStatusCommitted event) {
        publisher.publish(RealtimeEvent.rideStatus(
                event.rideId(),
                event.passengerUserId(),
                event.driverUserId(),
                event.from() == null ? null : event.from().name(),
                event.to().name(),
                null
        ));
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT, fallbackExecution = true)
    public void onDriverLocation(DriverLocationCommitted event) {
        publisher.publish(RealtimeEvent.driverLocation(
                event.rideId(),
                event.driverUserId(),
                event.passengerUserId(),
                event.lat(),
                event.lng(),
                null
        ));
    }
}
