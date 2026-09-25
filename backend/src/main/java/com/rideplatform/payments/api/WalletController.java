package com.rideplatform.payments.api;

import com.rideplatform.auth.security.UserPrincipal;
import com.rideplatform.payments.application.WalletService;
import com.rideplatform.payments.domain.WalletEntity;
import com.rideplatform.payments.domain.WalletLedgerEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/wallets")
public class WalletController {

    private final WalletService walletService;

    public WalletController(WalletService walletService) {
        this.walletService = walletService;
    }

    public record WalletResponse(UUID userId, long balanceMinor, String currency) {
        static WalletResponse from(WalletEntity w) {
            return new WalletResponse(w.getUserId(), w.getBalanceMinor(), w.getCurrency());
        }
    }

    public record LedgerResponse(UUID id, long deltaMinor, String reason, UUID rideId, Instant createdAt) {
        static LedgerResponse from(WalletLedgerEntity e) {
            return new LedgerResponse(e.getId(), e.getDeltaMinor(), e.getReason(), e.getRideId(), e.getCreatedAt());
        }
    }

    @GetMapping("/me")
    @PreAuthorize("isAuthenticated()")
    public WalletResponse me(@AuthenticationPrincipal UserPrincipal principal) {
        return WalletResponse.from(walletService.getOrEmpty(principal.getId()));
    }

    @GetMapping("/me/ledger")
    @PreAuthorize("isAuthenticated()")
    public List<LedgerResponse> ledger(@AuthenticationPrincipal UserPrincipal principal) {
        return walletService.ledger(principal.getId()).stream().map(LedgerResponse::from).toList();
    }
}
