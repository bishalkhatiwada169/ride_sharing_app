package com.rideplatform.payments.gateway;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.rideplatform.auth.config.RidePlatformProperties;
import org.springframework.stereotype.Component;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.util.HexFormat;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Local/dev digital provider. Never use in production.
 * Webhook HMAC: hex(HMAC-SHA256(webhookSecret, body)).
 */
@Component
public class MockPaymentGateway implements PaymentGateway {

    private final String webhookSecret;
    private final ObjectMapper objectMapper;
    private final ConcurrentHashMap<String, String> statuses = new ConcurrentHashMap<>();

    public MockPaymentGateway(RidePlatformProperties properties, ObjectMapper objectMapper) {
        String secret = properties.payment().webhookSecret();
        this.webhookSecret = (secret == null || secret.isBlank()) ? "local_webhook_secret" : secret;
        this.objectMapper = objectMapper;
    }

    @Override
    public String providerId() {
        return "mock";
    }

    @Override
    public InitiationResult initiate(InitiationRequest request) {
        String providerPaymentId = "mock_" + UUID.randomUUID();
        statuses.put(providerPaymentId, "PENDING");
        return new InitiationResult(
                providerPaymentId,
                "PENDING",
                Map.of(
                        "provider", providerId(),
                        "clientSecret", "mock_secret_" + providerPaymentId,
                        "checkoutUrl", "https://pay.local/mock/" + providerPaymentId
                )
        );
    }

    @Override
    public VerificationResult verify(VerificationRequest request) {
        String status = statuses.getOrDefault(request.providerPaymentId(), "FAILED");
        return new VerificationResult(request.providerPaymentId(), status, Map.of("provider", providerId()));
    }

    @Override
    public RefundResult refund(RefundRequest request) {
        statuses.put(request.providerPaymentId(), "REFUNDED");
        return new RefundResult("refund_" + UUID.randomUUID(), "REFUNDED", request.amountMinor());
    }

    @Override
    public boolean verifyWebhookSignature(WebhookRequest request) {
        if (request.signatureHeader() == null || request.signatureHeader().isBlank()) {
            return false;
        }
        return constantEquals(request.signatureHeader(), sign(request.body()));
    }

    @Override
    public ProviderEvent parseWebhook(WebhookRequest request) {
        try {
            @SuppressWarnings("unchecked")
            Map<String, Object> body = objectMapper.readValue(request.body(), Map.class);
            String providerPaymentId = String.valueOf(body.get("providerPaymentId"));
            String status = String.valueOf(body.getOrDefault("status", "SUCCEEDED"));
            statuses.put(providerPaymentId, status);
            long amount = body.get("amountMinor") instanceof Number n ? n.longValue() : 0L;
            String eventId = String.valueOf(body.getOrDefault("eventId", UUID.randomUUID().toString()));
            return new ProviderEvent(
                    eventId,
                    providerPaymentId,
                    String.valueOf(body.getOrDefault("type", "payment")),
                    status,
                    amount,
                    body
            );
        } catch (Exception ex) {
            throw new IllegalArgumentException("Invalid mock webhook body", ex);
        }
    }

    public String sign(String body) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(webhookSecret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            return HexFormat.of().formatHex(mac.doFinal(body.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception ex) {
            throw new IllegalStateException("HMAC unavailable", ex);
        }
    }

    private static boolean constantEquals(String a, String b) {
        return java.security.MessageDigest.isEqual(
                a.getBytes(StandardCharsets.UTF_8),
                b.getBytes(StandardCharsets.UTF_8)
        );
    }
}
