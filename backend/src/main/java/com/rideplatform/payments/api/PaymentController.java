package com.rideplatform.payments.api;

import com.rideplatform.auth.security.UserPrincipal;
import com.rideplatform.payments.application.PaymentService;
import com.rideplatform.payments.domain.PaymentEntity;
import com.rideplatform.payments.domain.PaymentStatus;
import com.rideplatform.payments.gateway.MockPaymentGateway;
import com.rideplatform.payments.gateway.PaymentGateway;
import com.rideplatform.users.domain.RoleCode;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.constraints.Size;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.io.IOException;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/payments")
public class PaymentController {

    private final PaymentService paymentService;
    private final PaymentGateway paymentGateway;
    private final MockPaymentGateway mockPaymentGateway;

    public PaymentController(
            PaymentService paymentService,
            PaymentGateway paymentGateway,
            MockPaymentGateway mockPaymentGateway
    ) {
        this.paymentService = paymentService;
        this.paymentGateway = paymentGateway;
        this.mockPaymentGateway = mockPaymentGateway;
    }

    public record PaymentResponse(
            UUID id,
            UUID rideId,
            String provider,
            long amountMinor,
            String currency,
            PaymentStatus status,
            String providerPaymentId,
            Instant createdAt,
            Map<String, Object> clientParams
    ) {
        static PaymentResponse from(PaymentEntity p, Map<String, Object> clientParams) {
            return new PaymentResponse(
                    p.getId(), p.getRideId(), p.getProvider(), p.getAmountMinor(), p.getCurrency(),
                    p.getStatus(), p.getProviderPaymentId(), p.getCreatedAt(), clientParams
            );
        }
    }

    public record RefundRequest(@Size(max = 500) String reason) {}

    @PostMapping("/rides/{rideId}/initiate")
    @PreAuthorize("hasRole('PASSENGER')")
    public PaymentResponse initiate(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID rideId,
            @RequestHeader(value = "Idempotency-Key", required = false) String idempotencyKey
    ) {
        PaymentEntity payment = paymentService.initiate(principal.getId(), rideId, idempotencyKey);
        Map<String, Object> params = Map.of(
                "provider", payment.getProvider(),
                "checkoutUrl", "https://pay.local/mock/" + payment.getProviderPaymentId()
        );
        return PaymentResponse.from(payment, params);
    }

    @GetMapping("/rides/{rideId}")
    @PreAuthorize("isAuthenticated()")
    public PaymentResponse get(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID rideId
    ) {
        boolean admin = isStaff(principal);
        return PaymentResponse.from(paymentService.getForRide(rideId, principal.getId(), admin), Map.of());
    }

    @PostMapping("/webhooks/{provider}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void webhook(
            @PathVariable String provider,
            @RequestHeader(value = "X-Payment-Signature", required = false) String signature,
            HttpServletRequest request
    ) throws IOException {
        String body = request.getReader().lines().collect(Collectors.joining("\n"));
        paymentService.handleWebhook(provider, body, signature);
    }

    /** Dev helper: builds a signed mock webhook body for smoke tests. */
    @PostMapping("/mock/sign")
    @PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN')")
    public Map<String, String> signMock(@RequestBody Map<String, Object> body) throws Exception {
        String json = new com.fasterxml.jackson.databind.ObjectMapper().writeValueAsString(body);
        return Map.of("body", json, "signature", mockPaymentGateway.sign(json), "provider", paymentGateway.providerId());
    }

    @PostMapping("/admin/{paymentId}/refund")
    @PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN')")
    public PaymentResponse refund(@PathVariable UUID paymentId, @RequestBody(required = false) RefundRequest request) {
        String reason = request == null ? null : request.reason();
        return PaymentResponse.from(paymentService.refund(paymentId, reason), Map.of());
    }

    @GetMapping("/admin")
    @PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN','SUPPORT')")
    public List<PaymentResponse> adminList() {
        return paymentService.adminList().stream().map(p -> PaymentResponse.from(p, Map.of())).toList();
    }

    private static boolean isStaff(UserPrincipal principal) {
        return principal.getRoles().contains(RoleCode.ADMIN)
                || principal.getRoles().contains(RoleCode.SUPER_ADMIN)
                || principal.getRoles().contains(RoleCode.SUPPORT);
    }
}
