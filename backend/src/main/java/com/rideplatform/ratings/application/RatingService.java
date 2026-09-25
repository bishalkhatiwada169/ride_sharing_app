package com.rideplatform.ratings.application;

import com.rideplatform.common.exception.AppException;
import com.rideplatform.drivers.domain.DriverProfileEntity;
import com.rideplatform.drivers.infrastructure.DriverProfileRepository;
import com.rideplatform.ratings.domain.RatingEntity;
import com.rideplatform.ratings.infrastructure.RatingRepository;
import com.rideplatform.rides.domain.RideEntity;
import com.rideplatform.rides.domain.RideStatus;
import com.rideplatform.rides.infrastructure.RideRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import java.util.UUID;

@Service
public class RatingService {

    private final RatingRepository ratingRepository;
    private final RideRepository rideRepository;
    private final DriverProfileRepository driverProfileRepository;

    public RatingService(
            RatingRepository ratingRepository,
            RideRepository rideRepository,
            DriverProfileRepository driverProfileRepository
    ) {
        this.ratingRepository = ratingRepository;
        this.rideRepository = rideRepository;
        this.driverProfileRepository = driverProfileRepository;
    }

    @Transactional
    public RatingEntity rate(UUID raterId, UUID rideId, short score, String comment) {
        if (score < 1 || score > 5) {
            throw new AppException("VALIDATION_ERROR", "Score must be 1–5", HttpStatus.BAD_REQUEST.value());
        }
        if (ratingRepository.findByRideIdAndRaterUserId(rideId, raterId).isPresent()) {
            throw new AppException("CONFLICT", "Already rated this ride", HttpStatus.CONFLICT.value());
        }

        RideEntity ride = rideRepository.findById(rideId)
                .orElseThrow(() -> new AppException("NOT_FOUND", "Ride not found", HttpStatus.NOT_FOUND.value()));
        if (ride.getStatus() != RideStatus.RIDE_COMPLETED) {
            throw new AppException("CONFLICT", "Rate only after ride completion", HttpStatus.CONFLICT.value());
        }

        UUID rateeId;
        if (ride.getPassengerUserId().equals(raterId)) {
            if (ride.getDriverUserId() == null) {
                throw new AppException("CONFLICT", "No driver to rate", HttpStatus.CONFLICT.value());
            }
            rateeId = ride.getDriverUserId();
        } else if (ride.getDriverUserId() != null && ride.getDriverUserId().equals(raterId)) {
            rateeId = ride.getPassengerUserId();
        } else {
            throw new AppException("FORBIDDEN", "Not your ride", HttpStatus.FORBIDDEN.value());
        }

        RatingEntity rating = new RatingEntity();
        rating.setRideId(rideId);
        rating.setRaterUserId(raterId);
        rating.setRateeUserId(rateeId);
        rating.setScore(score);
        rating.setComment(comment == null || comment.isBlank() ? null : comment.trim());
        rating = ratingRepository.save(rating);

        rollupDriverIfNeeded(rateeId, score);
        return rating;
    }

    @Transactional(readOnly = true)
    public List<RatingEntity> adminList() {
        return ratingRepository.findAllByOrderByCreatedAtDesc();
    }

    private void rollupDriverIfNeeded(UUID rateeId, short score) {
        driverProfileRepository.findById(rateeId).ifPresent(profile -> {
            int count = profile.getRatingCount();
            BigDecimal avg = profile.getRatingAvg() == null ? BigDecimal.ZERO : profile.getRatingAvg();
            BigDecimal next = avg.multiply(BigDecimal.valueOf(count))
                    .add(BigDecimal.valueOf(score))
                    .divide(BigDecimal.valueOf(count + 1L), 2, RoundingMode.HALF_UP);
            profile.setRatingAvg(next);
            profile.setRatingCount(count + 1);
            driverProfileRepository.save(profile);
        });
    }
}
