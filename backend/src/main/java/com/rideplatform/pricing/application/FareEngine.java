package com.rideplatform.pricing.application;

import com.rideplatform.common.exception.AppException;
import com.rideplatform.pricing.domain.FareQuoteEntity;
import com.rideplatform.pricing.domain.FareRuleEntity;
import com.rideplatform.pricing.infrastructure.FareQuoteRepository;
import com.rideplatform.pricing.infrastructure.FareRuleRepository;
import com.rideplatform.vehicles.domain.VehicleType;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

@Service
public class FareEngine {

    private static final long QUOTE_TTL_SECONDS = 600;
    private static final double CITY_SPEED_MPS = 8.33; // ~30 km/h

    private final FareRuleRepository fareRuleRepository;
    private final FareQuoteRepository fareQuoteRepository;

    public FareEngine(FareRuleRepository fareRuleRepository, FareQuoteRepository fareQuoteRepository) {
        this.fareRuleRepository = fareRuleRepository;
        this.fareQuoteRepository = fareQuoteRepository;
    }

    @Transactional
    public FareQuoteEntity createQuote(
            UUID passengerId,
            VehicleType vehicleType,
            double pickupLat,
            double pickupLng,
            double dropoffLat,
            double dropoffLng,
            String pickupAddress,
            String dropoffAddress
    ) {
        FareRuleEntity rule = fareRuleRepository.findByVehicleTypeAndActiveTrueOrderByPriorityAsc(vehicleType)
                .stream()
                .findFirst()
                .orElseThrow(() -> new AppException("FARE_RULE_MISSING", "No active fare rule for " + vehicleType, HttpStatus.BAD_REQUEST.value()));

        double distanceM = haversineMeters(pickupLat, pickupLng, dropoffLat, dropoffLng);
        int durationS = Math.max(60, (int) Math.round(distanceM / CITY_SPEED_MPS));

        long distanceKmRounded = Math.max(1, Math.round(distanceM / 1000.0));
        long durationMinRounded = Math.max(1, Math.round(durationS / 60.0));

        long subtotal = rule.getBaseFareMinor()
                + distanceKmRounded * rule.getPerKmMinor()
                + durationMinRounded * rule.getPerMinuteMinor();
        subtotal = Math.max(subtotal, rule.getMinFareMinor());

        BigDecimal surged = BigDecimal.valueOf(subtotal).multiply(rule.getSurgeMultiplier()).setScale(0, RoundingMode.HALF_UP);
        long afterSurge = surged.longValue();
        long withFee = afterSurge + rule.getBookingFeeMinor();
        long tax = Math.round(withFee * (rule.getTaxBps() / 10_000.0));
        long total = withFee + tax;

        Map<String, Object> breakdown = new LinkedHashMap<>();
        breakdown.put("BASE", rule.getBaseFareMinor());
        breakdown.put("DISTANCE", distanceKmRounded * rule.getPerKmMinor());
        breakdown.put("TIME", durationMinRounded * rule.getPerMinuteMinor());
        breakdown.put("MIN_FARE_APPLIED", subtotal == rule.getMinFareMinor());
        breakdown.put("SURGE_MULTIPLIER", rule.getSurgeMultiplier());
        breakdown.put("BOOKING_FEE", rule.getBookingFeeMinor());
        breakdown.put("TAX", tax);
        breakdown.put("TOTAL", total);

        FareQuoteEntity quote = new FareQuoteEntity();
        quote.setPassengerUserId(passengerId);
        quote.setRuleId(rule.getId());
        quote.setVehicleType(vehicleType);
        quote.setPickupLat(pickupLat);
        quote.setPickupLng(pickupLng);
        quote.setDropoffLat(dropoffLat);
        quote.setDropoffLng(dropoffLng);
        quote.setPickupAddress(pickupAddress);
        quote.setDropoffAddress(dropoffAddress);
        quote.setDistanceM((int) Math.round(distanceM));
        quote.setDurationS(durationS);
        quote.setCurrency(rule.getCurrency());
        quote.setTotalMinor(total);
        quote.setBreakdownJson(breakdown);
        quote.setExpiresAt(Instant.now().plusSeconds(QUOTE_TTL_SECONDS));
        return fareQuoteRepository.save(quote);
    }

    @Transactional(readOnly = true)
    public FareQuoteEntity requireValidQuote(UUID quoteId, UUID passengerId) {
        FareQuoteEntity quote = fareQuoteRepository.findById(quoteId)
                .orElseThrow(() -> new AppException("NOT_FOUND", "Fare quote not found", HttpStatus.NOT_FOUND.value()));
        if (!quote.getPassengerUserId().equals(passengerId)) {
            throw new AppException("FORBIDDEN", "Quote does not belong to passenger", HttpStatus.FORBIDDEN.value());
        }
        if (quote.getExpiresAt().isBefore(Instant.now())) {
            throw new AppException("QUOTE_EXPIRED", "Fare quote has expired", HttpStatus.CONFLICT.value());
        }
        return quote;
    }

    static double haversineMeters(double lat1, double lng1, double lat2, double lng2) {
        double r = 6371000.0;
        double dLat = Math.toRadians(lat2 - lat1);
        double dLng = Math.toRadians(lng2 - lng1);
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
                + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
                * Math.sin(dLng / 2) * Math.sin(dLng / 2);
        return 2 * r * Math.asin(Math.sqrt(a));
    }
}
