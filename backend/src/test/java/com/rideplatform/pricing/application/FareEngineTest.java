package com.rideplatform.pricing.application;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.within;

class FareEngineTest {

    @Test
    void haversineKnownDistance() {
        // Approx Kathmandu center points ~1.1km apart
        double meters = FareEngine.haversineMeters(27.7172, 85.3240, 27.7100, 85.3200);
        assertThat(meters).isCloseTo(850, within(400.0));
    }
}
