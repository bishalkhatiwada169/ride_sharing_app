package com.rideplatform.payments.infrastructure;

import com.rideplatform.payments.domain.WalletLedgerEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface WalletLedgerRepository extends JpaRepository<WalletLedgerEntity, UUID> {
    List<WalletLedgerEntity> findByWalletIdOrderByCreatedAtDesc(UUID walletId);

    boolean existsByPaymentIdAndReason(UUID paymentId, String reason);
}
