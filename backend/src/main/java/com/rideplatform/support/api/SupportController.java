package com.rideplatform.support.api;

import com.rideplatform.auth.security.UserPrincipal;
import com.rideplatform.common.exception.AppException;
import com.rideplatform.support.domain.SupportTicketEntity;
import com.rideplatform.support.infrastructure.SupportTicketRepository;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/support")
public class SupportController {

    private final SupportTicketRepository ticketRepository;

    public SupportController(SupportTicketRepository ticketRepository) {
        this.ticketRepository = ticketRepository;
    }

    public record CreateRequest(
            @NotBlank @Size(max = 64) String category,
            @NotBlank @Size(max = 200) String subject,
            @Size(max = 4000) String description,
            UUID rideId,
            @Size(max = 16) String priority
    ) {}

    public record TicketResponse(
            UUID id,
            UUID openerUserId,
            UUID rideId,
            String category,
            String status,
            String priority,
            String subject,
            String description,
            Instant createdAt
    ) {
        static TicketResponse from(SupportTicketEntity e) {
            return new TicketResponse(
                    e.getId(), e.getOpenerUserId(), e.getRideId(), e.getCategory(), e.getStatus(),
                    e.getPriority(), e.getSubject(), e.getDescription(), e.getCreatedAt()
            );
        }
    }

    public record StatusRequest(@NotBlank String status) {}

    @PostMapping("/tickets")
    @PreAuthorize("isAuthenticated()")
    public TicketResponse create(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody CreateRequest request
    ) {
        SupportTicketEntity t = new SupportTicketEntity();
        t.setOpenerUserId(principal.getId());
        t.setCategory(request.category());
        t.setSubject(request.subject());
        t.setDescription(request.description());
        t.setRideId(request.rideId());
        t.setPriority(request.priority() == null ? "NORMAL" : request.priority());
        t.setStatus("OPEN");
        return TicketResponse.from(ticketRepository.save(t));
    }

    @GetMapping("/tickets/me")
    @PreAuthorize("isAuthenticated()")
    public List<TicketResponse> mine(@AuthenticationPrincipal UserPrincipal principal) {
        return ticketRepository.findByOpenerUserIdOrderByCreatedAtDesc(principal.getId())
                .stream().map(TicketResponse::from).toList();
    }

    @GetMapping("/admin/tickets")
    @PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN','SUPPORT')")
    public List<TicketResponse> adminList() {
        return ticketRepository.findAllByOrderByCreatedAtDesc().stream().map(TicketResponse::from).toList();
    }

    @PostMapping("/admin/tickets/{id}/status")
    @PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN','SUPPORT')")
    public TicketResponse updateStatus(@PathVariable UUID id, @Valid @RequestBody StatusRequest request) {
        SupportTicketEntity t = ticketRepository.findById(id)
                .orElseThrow(() -> new AppException("NOT_FOUND", "Ticket not found", HttpStatus.NOT_FOUND.value()));
        t.setStatus(request.status());
        return TicketResponse.from(ticketRepository.save(t));
    }
}
