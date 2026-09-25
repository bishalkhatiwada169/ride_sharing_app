package com.rideplatform.rides.domain;

import com.rideplatform.common.exception.AppException;
import org.springframework.http.HttpStatus;

import java.util.EnumMap;
import java.util.EnumSet;
import java.util.Map;
import java.util.Set;

/**
 * Server-side ride transition table. Clients never set status directly.
 */
public final class RideStateMachine {

    private static final Map<RideStatus, Set<RideStatus>> ALLOWED = new EnumMap<>(RideStatus.class);

    static {
        ALLOWED.put(RideStatus.REQUESTED, EnumSet.of(RideStatus.SEARCHING_DRIVER));
        ALLOWED.put(RideStatus.SEARCHING_DRIVER, EnumSet.of(
                RideStatus.DRIVER_ACCEPTED,
                RideStatus.NO_DRIVER_FOUND,
                RideStatus.EXPIRED,
                RideStatus.CANCELLED_BY_PASSENGER
        ));
        ALLOWED.put(RideStatus.DRIVER_ACCEPTED, EnumSet.of(
                RideStatus.DRIVER_ARRIVING,
                RideStatus.CANCELLED_BY_PASSENGER,
                RideStatus.CANCELLED_BY_DRIVER
        ));
        ALLOWED.put(RideStatus.DRIVER_ARRIVING, EnumSet.of(
                RideStatus.DRIVER_ARRIVED,
                RideStatus.CANCELLED_BY_PASSENGER,
                RideStatus.CANCELLED_BY_DRIVER
        ));
        ALLOWED.put(RideStatus.DRIVER_ARRIVED, EnumSet.of(
                RideStatus.RIDE_STARTED,
                RideStatus.CANCELLED_BY_PASSENGER,
                RideStatus.CANCELLED_BY_DRIVER
        ));
        ALLOWED.put(RideStatus.RIDE_STARTED, EnumSet.of(RideStatus.RIDE_COMPLETED));
        ALLOWED.put(RideStatus.RIDE_COMPLETED, EnumSet.of(RideStatus.PAYMENT_FAILED));
        // Digital payment can fail after completion; success recovers to completed.
        ALLOWED.put(RideStatus.PAYMENT_FAILED, EnumSet.of(RideStatus.RIDE_COMPLETED));
    }

    private RideStateMachine() {}

    public static void assertTransition(RideStatus from, RideStatus to) {
        Set<RideStatus> next = ALLOWED.getOrDefault(from, EnumSet.noneOf(RideStatus.class));
        if (!next.contains(to)) {
            throw new AppException(
                    "RIDE_INVALID_TRANSITION",
                    "Cannot transition ride from " + from + " to " + to,
                    HttpStatus.CONFLICT.value()
            );
        }
    }

    public static boolean isTerminal(RideStatus status) {
        return status == RideStatus.RIDE_COMPLETED
                || status == RideStatus.CANCELLED_BY_PASSENGER
                || status == RideStatus.CANCELLED_BY_DRIVER
                || status == RideStatus.NO_DRIVER_FOUND
                || status == RideStatus.EXPIRED
                || status == RideStatus.PAYMENT_FAILED;
    }
}
