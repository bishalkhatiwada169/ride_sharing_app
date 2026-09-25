package com.rideplatform.pricing.infrastructure;

import com.rideplatform.pricing.domain.FareQuoteEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface FareQuoteRepository extends JpaRepository<FareQuoteEntity, UUID> {
}
