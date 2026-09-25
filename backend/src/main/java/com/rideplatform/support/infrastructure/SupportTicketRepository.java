package com.rideplatform.support.infrastructure;

import com.rideplatform.support.domain.SupportTicketEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface SupportTicketRepository extends JpaRepository<SupportTicketEntity, UUID> {
    List<SupportTicketEntity> findByOpenerUserIdOrderByCreatedAtDesc(UUID openerUserId);

    List<SupportTicketEntity> findAllByOrderByCreatedAtDesc();
}
