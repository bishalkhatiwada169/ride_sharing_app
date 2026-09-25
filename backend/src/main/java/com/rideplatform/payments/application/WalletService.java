package com.rideplatform.payments.application;

import com.rideplatform.payments.domain.WalletEntity;
import com.rideplatform.payments.domain.WalletLedgerEntity;
import com.rideplatform.payments.infrastructure.WalletLedgerRepository;
import com.rideplatform.payments.infrastructure.WalletRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
public class WalletService {

    private final WalletRepository walletRepository;
    private final WalletLedgerRepository ledgerRepository;

    public WalletService(WalletRepository walletRepository, WalletLedgerRepository ledgerRepository) {
        this.walletRepository = walletRepository;
        this.ledgerRepository = ledgerRepository;
    }

    @Transactional
    public WalletEntity requireWallet(UUID userId, String currency) {
        return walletRepository.findByUserId(userId).orElseGet(() -> {
            WalletEntity w = new WalletEntity();
            w.setUserId(userId);
            w.setBalanceMinor(0);
            w.setCurrency(currency == null ? "NPR" : currency);
            return walletRepository.save(w);
        });
    }

    @Transactional
    public void credit(
            UUID userId,
            long amountMinor,
            String currency,
            String reason,
            UUID rideId,
            UUID paymentId
    ) {
        if (amountMinor <= 0) {
            return;
        }
        if (paymentId != null && alreadyCredited(paymentId)) {
            return;
        }
        WalletEntity wallet = requireWallet(userId, currency);
        wallet.setBalanceMinor(wallet.getBalanceMinor() + amountMinor);
        walletRepository.save(wallet);

        WalletLedgerEntity entry = new WalletLedgerEntity();
        entry.setWalletId(wallet.getId());
        entry.setDeltaMinor(amountMinor);
        entry.setReason(reason);
        entry.setRideId(rideId);
        entry.setPaymentId(paymentId);
        ledgerRepository.save(entry);
    }

    @Transactional(readOnly = true)
    public boolean alreadyCredited(UUID paymentId) {
        return ledgerRepository.existsByPaymentIdAndReason(paymentId, "RIDE_EARNINGS");
    }

    @Transactional(readOnly = true)
    public WalletEntity getOrEmpty(UUID userId) {
        return walletRepository.findByUserId(userId).orElseGet(() -> {
            WalletEntity w = new WalletEntity();
            w.setUserId(userId);
            w.setBalanceMinor(0);
            w.setCurrency("NPR");
            return w;
        });
    }

    @Transactional(readOnly = true)
    public List<WalletLedgerEntity> ledger(UUID userId) {
        return walletRepository.findByUserId(userId)
                .map(w -> ledgerRepository.findByWalletIdOrderByCreatedAtDesc(w.getId()))
                .orElse(List.of());
    }
}
