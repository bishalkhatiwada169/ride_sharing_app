package com.rideplatform.rides.domain;

import com.rideplatform.common.exception.AppException;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class RideStateMachineTest {

    @Test
    void allowsHappyPath() {
        assertThatCode(() -> RideStateMachine.assertTransition(RideStatus.REQUESTED, RideStatus.SEARCHING_DRIVER))
                .doesNotThrowAnyException();
        assertThatCode(() -> RideStateMachine.assertTransition(RideStatus.SEARCHING_DRIVER, RideStatus.DRIVER_ACCEPTED))
                .doesNotThrowAnyException();
        assertThatCode(() -> RideStateMachine.assertTransition(RideStatus.DRIVER_ARRIVED, RideStatus.RIDE_STARTED))
                .doesNotThrowAnyException();
    }

    @Test
    void allowsPaymentFailedAndRecovery() {
        assertThatCode(() -> RideStateMachine.assertTransition(RideStatus.RIDE_COMPLETED, RideStatus.PAYMENT_FAILED))
                .doesNotThrowAnyException();
        assertThatCode(() -> RideStateMachine.assertTransition(RideStatus.PAYMENT_FAILED, RideStatus.RIDE_COMPLETED))
                .doesNotThrowAnyException();
    }

    @Test
    void rejectsIllegalJump() {
        assertThatThrownBy(() -> RideStateMachine.assertTransition(RideStatus.REQUESTED, RideStatus.RIDE_STARTED))
                .isInstanceOf(AppException.class)
                .hasFieldOrPropertyWithValue("code", "RIDE_INVALID_TRANSITION");
    }
}
