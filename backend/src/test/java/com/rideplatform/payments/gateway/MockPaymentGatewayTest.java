package com.rideplatform.payments.gateway;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.rideplatform.auth.config.RidePlatformProperties;
import org.junit.jupiter.api.Test;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class MockPaymentGatewayTest {

    @Test
    void signsAndParsesWebhook() throws Exception {
        RidePlatformProperties props = new RidePlatformProperties(
                new RidePlatformProperties.Cors("http://localhost:5173"),
                new RidePlatformProperties.Jwt("local_dev_only_change_me_to_long_random_secret_32chars", 900, 2592000),
                new RidePlatformProperties.Sms("mock"),
                new RidePlatformProperties.Payment("mock", "", "test_webhook_secret", 2000),
                new RidePlatformProperties.Otp(6, 300, 5)
        );
        MockPaymentGateway gateway = new MockPaymentGateway(props, new ObjectMapper());

        var initiated = gateway.initiate(new PaymentGateway.InitiationRequest(
                "idem-1", 15000, "NPR", "test", Map.of()
        ));
        assertThat(initiated.providerPaymentId()).startsWith("mock_");

        String body = new ObjectMapper().writeValueAsString(Map.of(
                "eventId", "evt-1",
                "providerPaymentId", initiated.providerPaymentId(),
                "status", "SUCCEEDED",
                "amountMinor", 15000
        ));
        String signature = gateway.sign(body);
        assertThat(gateway.verifyWebhookSignature(new PaymentGateway.WebhookRequest(body, signature))).isTrue();

        var event = gateway.parseWebhook(new PaymentGateway.WebhookRequest(body, signature));
        assertThat(event.status()).isEqualTo("SUCCEEDED");
        assertThat(event.providerPaymentId()).isEqualTo(initiated.providerPaymentId());
    }
}
