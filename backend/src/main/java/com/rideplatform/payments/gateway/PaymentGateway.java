package com.rideplatform.payments.gateway;

import java.util.Map;

public interface PaymentGateway {

    String providerId();

    record InitiationRequest(
            String clientReference,
            long amountMinor,
            String currency,
            String description,
            Map<String, String> metadata
    ) {}

    record InitiationResult(
            String providerPaymentId,
            String status,
            Map<String, Object> clientParams
    ) {}

    record VerificationRequest(String providerPaymentId) {}

    record VerificationResult(String providerPaymentId, String status, Map<String, Object> raw) {}

    record RefundRequest(String providerPaymentId, long amountMinor, String reason) {}

    record RefundResult(String providerRefundId, String status, long amountMinor) {}

    record WebhookRequest(String body, String signatureHeader) {}

    record ProviderEvent(
            String eventId,
            String providerPaymentId,
            String type,
            String status,
            long amountMinor,
            Map<String, Object> payload
    ) {}

    InitiationResult initiate(InitiationRequest request);

    VerificationResult verify(VerificationRequest request);

    RefundResult refund(RefundRequest request);

    boolean verifyWebhookSignature(WebhookRequest request);

    ProviderEvent parseWebhook(WebhookRequest request);
}
