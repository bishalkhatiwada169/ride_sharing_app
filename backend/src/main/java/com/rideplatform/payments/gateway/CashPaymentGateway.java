package com.rideplatform.payments.gateway;

import org.springframework.stereotype.Component;

import java.util.Map;
import java.util.UUID;

@Component
public class CashPaymentGateway implements PaymentGateway {

    @Override
    public String providerId() {
        return "cash";
    }

    @Override
    public InitiationResult initiate(InitiationRequest request) {
        String id = "cash_" + UUID.randomUUID();
        return new InitiationResult(id, "SUCCEEDED", Map.of("provider", providerId(), "method", "CASH"));
    }

    @Override
    public VerificationResult verify(VerificationRequest request) {
        return new VerificationResult(request.providerPaymentId(), "SUCCEEDED", Map.of("provider", providerId()));
    }

    @Override
    public RefundResult refund(RefundRequest request) {
        return new RefundResult("cash_refund_" + UUID.randomUUID(), "REFUNDED", request.amountMinor());
    }

    @Override
    public boolean verifyWebhookSignature(WebhookRequest request) {
        return false;
    }

    @Override
    public ProviderEvent parseWebhook(WebhookRequest request) {
        throw new UnsupportedOperationException("Cash payments do not use webhooks");
    }
}
