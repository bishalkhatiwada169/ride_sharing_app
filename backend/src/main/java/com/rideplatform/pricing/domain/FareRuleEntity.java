package com.rideplatform.pricing.domain;

import com.rideplatform.vehicles.domain.VehicleType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "fare_rules")
public class FareRuleEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(name = "vehicle_type", nullable = false)
    private VehicleType vehicleType;

    @Column(name = "city_code")
    private String cityCode;

    @Column(nullable = false, length = 3)
    private String currency;

    @Column(name = "base_fare_minor", nullable = false)
    private long baseFareMinor;

    @Column(name = "per_km_minor", nullable = false)
    private long perKmMinor;

    @Column(name = "per_minute_minor", nullable = false)
    private long perMinuteMinor;

    @Column(name = "booking_fee_minor", nullable = false)
    private long bookingFeeMinor;

    @Column(name = "min_fare_minor", nullable = false)
    private long minFareMinor;

    @Column(name = "tax_bps", nullable = false)
    private int taxBps;

    @Column(name = "surge_multiplier", nullable = false)
    private BigDecimal surgeMultiplier;

    @Column(name = "is_active", nullable = false)
    private boolean active;

    @Column(nullable = false)
    private int priority;

    public UUID getId() { return id; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public VehicleType getVehicleType() { return vehicleType; }
    public void setVehicleType(VehicleType vehicleType) { this.vehicleType = vehicleType; }
    public String getCityCode() { return cityCode; }
    public void setCityCode(String cityCode) { this.cityCode = cityCode; }
    public String getCurrency() { return currency; }
    public void setCurrency(String currency) { this.currency = currency; }
    public long getBaseFareMinor() { return baseFareMinor; }
    public void setBaseFareMinor(long baseFareMinor) { this.baseFareMinor = baseFareMinor; }
    public long getPerKmMinor() { return perKmMinor; }
    public void setPerKmMinor(long perKmMinor) { this.perKmMinor = perKmMinor; }
    public long getPerMinuteMinor() { return perMinuteMinor; }
    public void setPerMinuteMinor(long perMinuteMinor) { this.perMinuteMinor = perMinuteMinor; }
    public long getBookingFeeMinor() { return bookingFeeMinor; }
    public void setBookingFeeMinor(long bookingFeeMinor) { this.bookingFeeMinor = bookingFeeMinor; }
    public long getMinFareMinor() { return minFareMinor; }
    public void setMinFareMinor(long minFareMinor) { this.minFareMinor = minFareMinor; }
    public int getTaxBps() { return taxBps; }
    public void setTaxBps(int taxBps) { this.taxBps = taxBps; }
    public BigDecimal getSurgeMultiplier() { return surgeMultiplier; }
    public void setSurgeMultiplier(BigDecimal surgeMultiplier) { this.surgeMultiplier = surgeMultiplier; }
    public boolean isActive() { return active; }
    public void setActive(boolean active) { this.active = active; }
    public int getPriority() { return priority; }
    public void setPriority(int priority) { this.priority = priority; }
}
