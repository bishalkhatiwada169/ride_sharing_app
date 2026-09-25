package com.rideplatform.ratings.api;

import com.rideplatform.auth.security.UserPrincipal;
import com.rideplatform.ratings.application.RatingService;
import com.rideplatform.ratings.domain.RatingEntity;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
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
@RequestMapping("/api/v1/ratings")
public class RatingController {

    private final RatingService ratingService;

    public RatingController(RatingService ratingService) {
        this.ratingService = ratingService;
    }

    public record RateRequest(
            @NotNull @Min(1) @Max(5) Short score,
            @Size(max = 2000) String comment
    ) {}

    public record RatingResponse(
            UUID id,
            UUID rideId,
            UUID raterUserId,
            UUID rateeUserId,
            short score,
            String comment,
            Instant createdAt
    ) {
        static RatingResponse from(RatingEntity e) {
            return new RatingResponse(
                    e.getId(), e.getRideId(), e.getRaterUserId(), e.getRateeUserId(),
                    e.getScore(), e.getComment(), e.getCreatedAt()
            );
        }
    }

    @PostMapping("/rides/{rideId}")
    @PreAuthorize("hasAnyRole('PASSENGER','DRIVER')")
    public RatingResponse rate(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID rideId,
            @Valid @RequestBody RateRequest request
    ) {
        return RatingResponse.from(ratingService.rate(
                principal.getId(), rideId, request.score(), request.comment()
        ));
    }

    @GetMapping("/admin")
    @PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN','SUPPORT')")
    public List<RatingResponse> admin() {
        return ratingService.adminList().stream().map(RatingResponse::from).toList();
    }
}
