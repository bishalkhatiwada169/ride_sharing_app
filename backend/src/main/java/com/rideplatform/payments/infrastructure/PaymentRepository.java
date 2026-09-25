package com.rideplatform.payments.infrastructure;

import com.rideplatform.payments.domain.PaymentEntity;
import com.rideplatform.payments.domain.PaymentStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface PaymentRepository extends JpaRepository<PaymentEntity, UUID> {
    Optional<PaymentEntity> findByRideId(UUID rideId);

    Optional<PaymentEntity> findByPassengerUserIdAndClientReference(UUID passengerUserId, String clientReference);

    Optional<PaymentEntity> findByProviderAndProviderPaymentId(String provider, String providerPaymentId);

    List<PaymentEntity> findAllByOrderByCreatedAtDesc();

    List<PaymentEntity> findByStatusOrderByCreatedAtDesc(PaymentStatus status);
}
