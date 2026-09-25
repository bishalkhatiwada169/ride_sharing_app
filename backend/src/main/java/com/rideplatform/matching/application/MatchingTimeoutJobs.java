package com.rideplatform.matching.application;

import com.rideplatform.rides.domain.RideStatus;
import com.rideplatform.rides.infrastructure.RideRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;

@Component
public class MatchingTimeoutJobs {

    private final MatchingService matchingService;
    private final RideRepository rideRepository;
    private final int searchTimeoutSeconds;

    public MatchingTimeoutJobs(
            MatchingService matchingService,
            RideRepository rideRepository,
            @Value("${rideplatform.matching.search-timeout-seconds:180}") int searchTimeoutSeconds
    ) {
        this.matchingService = matchingService;
        this.rideRepository = rideRepository;
        this.searchTimeoutSeconds = searchTimeoutSeconds;
    }

    @Scheduled(fixedDelayString = "${rideplatform.matching.offer-poll-ms:5000}")
    public void expireOffers() {
        matchingService.expireDueOffers();
    }

    @Scheduled(fixedDelayString = "${rideplatform.matching.search-poll-ms:15000}")
    @Transactional
    public void expireSearchingRides() {
        Instant cutoff = Instant.now().minusSeconds(searchTimeoutSeconds);
        rideRepository.findByStatusInOrderByCreatedAtDesc(java.util.EnumSet.of(RideStatus.SEARCHING_DRIVER))
                .stream()
                .filter(r -> r.getCreatedAt() != null && r.getCreatedAt().isBefore(cutoff))
                .map(r -> r.getId())
                .forEach(matchingService::expireSearchingRide);
    }
}
