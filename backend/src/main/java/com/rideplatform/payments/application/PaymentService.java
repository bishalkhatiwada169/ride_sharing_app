package com.rideplatform.payments.application;

import com.rideplatform.auth.config.RidePlatformProperties;
import com.rideplatform.common.exception.AppException;
import com.rideplatform.payments.domain.PaymentEntity;
import com.rideplatform.payments.domain.PaymentStatus;
import com.rideplatform.payments.domain.PaymentTransactionEntity;
import com.rideplatform.payments.gateway.PaymentGateway;
import com.rideplatform.payments.infrastructure.PaymentRepository;
import com.rideplatform.payments.infrastructure.PaymentTransactionRepository;
import com.rideplatform.pricing.domain.FareQuoteEntity;
import com.rideplatform.pricing.infrastructure.FareQuoteRepository;
import com.rideplatform.realtime.application.RealtimeEventPublisher;
import com.rideplatform.realtime.application.RideRealtimeListener;
import com.rideplatform.realtime.domain.RealtimeEvent;
import com.rideplatform.rides.domain.RideEntity;
import com.rideplatform.rides.domain.RideEventEntity;
import com.rideplatform.rides.domain.RideStateMachine;
import com.rideplatform.rides.domain.RideStatus;
import com.rideplatform.rides.infrastructure.RideEventRepository;
import com.rideplatform.rides.infrastructure.RideRepository;
import com.rideplatform.users.domain.RoleCode;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class PaymentService {

    private final PaymentRepository paymentRepository;
    private final PaymentTransactionRepository transactionRepository;
    private final RideRepository rideRepository;
    private final RideEventRepository rideEventRepository;
    private final FareQuoteRepository fareQuoteRepository;
    private final PaymentGateway paymentGateway;
    private final WalletService walletService;
    private final RealtimeEventPublisher realtimeEventPublisher;
    private final ApplicationEventPublisher eventPublisher;
    private final int commissionBps;

    public PaymentService(
            PaymentRepository paymentRepository,
            PaymentTransactionRepository transactionRepository,
            RideRepository rideRepository,
            RideEventRepository rideEventRepository,
            FareQuoteRepository fareQuoteRepository,
            PaymentGateway paymentGateway,
            WalletService walletService,
            RealtimeEventPublisher realtimeEventPublisher,
            ApplicationEventPublisher eventPublisher,
            RidePlatformProperties properties
    ) {
        this.paymentRepository = paymentRepository;
        this.transactionRepository = transactionRepository;
        this.rideRepository = rideRepository;
        this.rideEventRepository = rideEventRepository;
        this.fareQuoteRepository = fareQuoteRepository;
        this.paymentGateway = paymentGateway;
        this.walletService = walletService;
        this.realtimeEventPublisher = realtimeEventPublisher;
        this.eventPublisher = eventPublisher;
        int bps = properties.payment().commissionBps();
        this.commissionBps = bps <= 0 ? 2000 : bps;
    }

    @Transactional
    public PaymentEntity initiate(UUID passengerId, UUID rideId, String idempotencyKey) {
        if (idempotencyKey == null || idempotencyKey.isBlank()) {
            throw new AppException("VALIDATION_ERROR", "Idempotency-Key required", HttpStatus.BAD_REQUEST.value());
        }

        var existingRef = paymentRepository.findByPassengerUserIdAndClientReference(passengerId, idempotencyKey);
        if (existingRef.isPresent()) {
            return existingRef.get();
        }

        RideEntity ride = rideRepository.findById(rideId)
                .orElseThrow(() -> new AppException("NOT_FOUND", "Ride not found", HttpStatus.NOT_FOUND.value()));
        if (!ride.getPassengerUserId().equals(passengerId)) {
            throw new AppException("FORBIDDEN", "Not your ride", HttpStatus.FORBIDDEN.value());
        }
        if (!"DIGITAL".equalsIgnoreCase(ride.getPaymentMethod())) {
            throw new AppException("VALIDATION_ERROR", "Ride is not digital payment", HttpStatus.BAD_REQUEST.value());
        }
        if (ride.getStatus() != RideStatus.RIDE_COMPLETED) {
            throw new AppException("CONFLICT", "Payment allowed only after ride completion", HttpStatus.CONFLICT.value());
        }

        var existingRidePayment = paymentRepository.findByRideId(rideId);
        if (existingRidePayment.isPresent()) {
            PaymentEntity p = existingRidePayment.get();
            if (p.getStatus() == PaymentStatus.SUCCEEDED || p.getStatus() == PaymentStatus.PENDING
                    || p.getStatus() == PaymentStatus.INITIATED) {
                return p;
            }
        }

        FareQuoteEntity quote = fareQuoteRepository.findById(ride.getFareQuoteId())
                .orElseThrow(() -> new AppException("NOT_FOUND", "Fare quote missing", HttpStatus.NOT_FOUND.value()));

        PaymentGateway.InitiationResult initiated = paymentGateway.initiate(new PaymentGateway.InitiationRequest(
                idempotencyKey,
                quote.getTotalMinor(),
                quote.getCurrency(),
                "Ride " + rideId,
                Map.of("rideId", rideId.toString())
        ));

        PaymentEntity payment = existingRidePayment.orElseGet(PaymentEntity::new);
        payment.setRideId(rideId);
        payment.setPassengerUserId(passengerId);
        payment.setProvider(paymentGateway.providerId());
        payment.setAmountMinor(quote.getTotalMinor());
        payment.setCurrency(quote.getCurrency());
        payment.setStatus(PaymentStatus.PENDING);
        payment.setClientReference(idempotencyKey);
        payment.setProviderPaymentId(initiated.providerPaymentId());
        payment = paymentRepository.save(payment);

        appendTx(payment.getId(), "INITIATE", initiated.status(), initiated.providerPaymentId(),
                quote.getTotalMinor(), initiated.clientParams());

        ride.setPaymentStatus("PENDING");
        rideRepository.save(ride);
        publishPaymentEvent(ride, payment);
        return payment;
    }

    @Transactional(readOnly = true)
    public PaymentEntity getForRide(UUID rideId, UUID userId, boolean admin) {
        RideEntity ride = rideRepository.findById(rideId)
                .orElseThrow(() -> new AppException("NOT_FOUND", "Ride not found", HttpStatus.NOT_FOUND.value()));
        if (!admin) {
            boolean party = ride.getPassengerUserId().equals(userId)
                    || (ride.getDriverUserId() != null && ride.getDriverUserId().equals(userId));
            if (!party) {
                throw new AppException("FORBIDDEN", "Not your ride", HttpStatus.FORBIDDEN.value());
            }
        }
        return paymentRepository.findByRideId(rideId)
                .orElseThrow(() -> new AppException("NOT_FOUND", "Payment not found", HttpStatus.NOT_FOUND.value()));
    }

    @Transactional
    public PaymentEntity handleWebhook(String provider, String body, String signature) {
        if (!paymentGateway.providerId().equalsIgnoreCase(provider)) {
            throw new AppException("VALIDATION_ERROR", "Unknown payment provider", HttpStatus.BAD_REQUEST.value());
        }
        PaymentGateway.WebhookRequest req = new PaymentGateway.WebhookRequest(body, signature);
        if (!paymentGateway.verifyWebhookSignature(req)) {
            throw new AppException("UNAUTHORIZED", "Invalid webhook signature", HttpStatus.UNAUTHORIZED.value());
        }
        PaymentGateway.ProviderEvent event = paymentGateway.parseWebhook(req);
        PaymentEntity payment = paymentRepository
                .findByProviderAndProviderPaymentId(paymentGateway.providerId(), event.providerPaymentId())
                .orElseThrow(() -> new AppException("NOT_FOUND", "Payment not found for provider id", HttpStatus.NOT_FOUND.value()));

        if (transactionRepository.existsByPaymentIdAndRawProviderRef(payment.getId(), event.eventId())) {
            return payment; // idempotent replay
        }

        appendTx(payment.getId(), "WEBHOOK", event.status(), event.eventId(), event.amountMinor(), event.payload());
        applyTerminalStatus(payment, event.status());
        return payment;
    }

    @Transactional
    public PaymentEntity refund(UUID paymentId, String reason) {
        PaymentEntity payment = paymentRepository.findById(paymentId)
                .orElseThrow(() -> new AppException("NOT_FOUND", "Payment not found", HttpStatus.NOT_FOUND.value()));
        if (payment.getStatus() != PaymentStatus.SUCCEEDED && payment.getStatus() != PaymentStatus.PARTIAL_REFUND) {
            throw new AppException("CONFLICT", "Payment not refundable", HttpStatus.CONFLICT.value());
        }
        PaymentGateway.RefundResult result = paymentGateway.refund(new PaymentGateway.RefundRequest(
                payment.getProviderPaymentId(),
                payment.getAmountMinor(),
                reason == null ? "admin_refund" : reason
        ));
        appendTx(payment.getId(), "REFUND", result.status(), result.providerRefundId(),
                result.amountMinor(), Map.of("reason", reason == null ? "" : reason));
        payment.setStatus(PaymentStatus.REFUNDED);
        paymentRepository.save(payment);

        RideEntity ride = rideRepository.findById(payment.getRideId()).orElse(null);
        if (ride != null) {
            ride.setPaymentStatus("REFUNDED");
            rideRepository.save(ride);
            publishPaymentEvent(ride, payment);
        }
        return payment;
    }

    @Transactional(readOnly = true)
    public List<PaymentEntity> adminList() {
        return paymentRepository.findAllByOrderByCreatedAtDesc();
    }

    @Transactional
    public void recordCashSettlement(RideEntity ride) {
        if (!"CASH".equalsIgnoreCase(ride.getPaymentMethod())) {
            return;
        }
        if (paymentRepository.findByRideId(ride.getId()).isPresent()) {
            creditDriverIfNeeded(ride, null, ride.getFareQuoteId());
            return;
        }
        FareQuoteEntity quote = fareQuoteRepository.findById(ride.getFareQuoteId()).orElse(null);
        if (quote == null) {
            return;
        }
        PaymentEntity payment = new PaymentEntity();
        payment.setRideId(ride.getId());
        payment.setPassengerUserId(ride.getPassengerUserId());
        payment.setProvider("cash");
        payment.setAmountMinor(quote.getTotalMinor());
        payment.setCurrency(quote.getCurrency());
        payment.setStatus(PaymentStatus.SUCCEEDED);
        payment.setProviderPaymentId("cash_" + ride.getId());
        payment = paymentRepository.save(payment);
        appendTx(payment.getId(), "CAPTURE", "SUCCEEDED", payment.getProviderPaymentId(),
                quote.getTotalMinor(), Map.of("method", "CASH"));
        creditDriverIfNeeded(ride, payment, quote.getId());
    }

    private void applyTerminalStatus(PaymentEntity payment, String providerStatus) {
        RideEntity ride = rideRepository.findById(payment.getRideId())
                .orElseThrow(() -> new AppException("NOT_FOUND", "Ride missing", HttpStatus.NOT_FOUND.value()));

        if ("SUCCEEDED".equalsIgnoreCase(providerStatus) || "CAPTURED".equalsIgnoreCase(providerStatus)) {
            payment.setStatus(PaymentStatus.SUCCEEDED);
            paymentRepository.save(payment);
            ride.setPaymentStatus("CAPTURED");
            // Recover from PAYMENT_FAILED if a later webhook/retry succeeds.
            if (ride.getStatus() == RideStatus.PAYMENT_FAILED) {
                applyRideStatus(ride, RideStatus.RIDE_COMPLETED, Map.of("reason", "payment_succeeded"));
            } else {
                rideRepository.save(ride);
            }
            creditDriverIfNeeded(ride, payment, ride.getFareQuoteId());
            publishPaymentEvent(ride, payment);
        } else if ("FAILED".equalsIgnoreCase(providerStatus)) {
            payment.setStatus(PaymentStatus.FAILED);
            paymentRepository.save(payment);
            ride.setPaymentStatus("FAILED");
            if (ride.getStatus() == RideStatus.RIDE_COMPLETED) {
                applyRideStatus(ride, RideStatus.PAYMENT_FAILED, Map.of("reason", "payment_failed"));
            } else {
                rideRepository.save(ride);
            }
            publishPaymentEvent(ride, payment);
        }
    }

    private void applyRideStatus(RideEntity ride, RideStatus to, Map<String, Object> payload) {
        RideStatus from = ride.getStatus();
        RideStateMachine.assertTransition(from, to);
        ride.setStatus(to);
        RideEntity saved = rideRepository.save(ride);
        RideEventEntity event = new RideEventEntity();
        event.setRideId(saved.getId());
        event.setFromStatus(from == null ? null : from.name());
        event.setToStatus(to.name());
        event.setActorUserId(null);
        event.setActorRole(RoleCode.ADMIN.name());
        event.setSource("PAYMENT");
        event.setPayloadJson(payload);
        rideEventRepository.save(event);
        eventPublisher.publishEvent(new RideRealtimeListener.RideStatusCommitted(
                saved.getId(), saved.getPassengerUserId(), saved.getDriverUserId(), from, to
        ));
    }

    private void creditDriverIfNeeded(RideEntity ride, PaymentEntity payment, UUID fareQuoteId) {
        if (ride.getDriverUserId() == null) {
            return;
        }
        UUID paymentId = payment == null ? null : payment.getId();
        if (paymentId != null && walletService.alreadyCredited(paymentId)) {
            return;
        }
        FareQuoteEntity quote = fareQuoteRepository.findById(fareQuoteId).orElse(null);
        if (quote == null) {
            return;
        }
        long commission = quote.getTotalMinor() * commissionBps / 10_000L;
        long earnings = Math.max(0, quote.getTotalMinor() - commission);
        walletService.credit(
                ride.getDriverUserId(),
                earnings,
                quote.getCurrency(),
                "RIDE_EARNINGS",
                ride.getId(),
                paymentId
        );
    }

    private void appendTx(
            UUID paymentId,
            String type,
            String status,
            String rawRef,
            Long amountMinor,
            Map<String, Object> metadata
    ) {
        PaymentTransactionEntity tx = new PaymentTransactionEntity();
        tx.setPaymentId(paymentId);
        tx.setType(type);
        tx.setStatus(status);
        tx.setRawProviderRef(rawRef);
        tx.setAmountMinor(amountMinor);
        tx.setMetadataJson(metadata == null ? Map.of() : new HashMap<>(metadata));
        transactionRepository.save(tx);
    }

    private void publishPaymentEvent(RideEntity ride, PaymentEntity payment) {
        Map<String, Object> payload = Map.of(
                "paymentId", payment.getId().toString(),
                "status", payment.getStatus().name(),
                "ridePaymentStatus", ride.getPaymentStatus(),
                "amountMinor", payment.getAmountMinor(),
                "currency", payment.getCurrency(),
                "occurredAt", Instant.now().toString()
        );
        realtimeEventPublisher.publish(new RealtimeEvent(
                RealtimeEvent.PAYMENT_STATUS,
                Instant.now(),
                ride.getId(),
                ride.getDriverUserId(),
                ride.getPassengerUserId(),
                payload,
                null
        ));
    }
}
