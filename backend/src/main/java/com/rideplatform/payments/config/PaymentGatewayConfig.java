package com.rideplatform.payments.config;

import com.rideplatform.auth.config.RidePlatformProperties;
import com.rideplatform.payments.gateway.CashPaymentGateway;
import com.rideplatform.payments.gateway.MockPaymentGateway;
import com.rideplatform.payments.gateway.PaymentGateway;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;

@Configuration
public class PaymentGatewayConfig {

    @Bean
    @Primary
    PaymentGateway paymentGateway(
            RidePlatformProperties properties,
            MockPaymentGateway mock,
            CashPaymentGateway cash
    ) {
        String provider = properties.payment().provider();
        if (provider == null || provider.isBlank() || "mock".equalsIgnoreCase(provider)) {
            return mock;
        }
        if ("cash".equalsIgnoreCase(provider)) {
            return cash;
        }
        // Unknown production providers fall back to mock until real adapters ship
        return mock;
    }
}
