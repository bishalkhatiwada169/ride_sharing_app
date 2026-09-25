package com.rideplatform.payments.infrastructure;

import com.rideplatform.payments.domain.PaymentTransactionEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface PaymentTransactionRepository extends JpaRepository<PaymentTransactionEntity, UUID> {
    List<PaymentTransactionEntity> findByPaymentIdOrderByCreatedAtDesc(UUID paymentId);

    boolean existsByPaymentIdAndRawProviderRef(UUID paymentId, String rawProviderRef);
}
