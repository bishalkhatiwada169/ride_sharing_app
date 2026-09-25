package com.rideplatform.pricing.api;

import com.rideplatform.common.exception.AppException;
import com.rideplatform.pricing.domain.FareRuleEntity;
import com.rideplatform.pricing.infrastructure.FareRuleRepository;
import com.rideplatform.vehicles.domain.VehicleType;
import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/pricing/admin/rules")
@PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN')")
public class FareRuleAdminController {

    private final FareRuleRepository fareRuleRepository;

    public FareRuleAdminController(FareRuleRepository fareRuleRepository) {
        this.fareRuleRepository = fareRuleRepository;
    }

    public record RuleRequest(
            @NotBlank @Size(max = 120) String name,
            @NotNull VehicleType vehicleType,
            @Size(max = 32) String cityCode,
            @NotBlank @Size(min = 3, max = 3) String currency,
            @Min(0) long baseFareMinor,
            @Min(0) long perKmMinor,
            @Min(0) long perMinuteMinor,
            @Min(0) long bookingFeeMinor,
            @Min(0) long minFareMinor,
            @Min(0) int taxBps,
            @NotNull @DecimalMin("0.1") BigDecimal surgeMultiplier,
            boolean active,
            int priority
    ) {}

    public record RuleResponse(
            UUID id,
            String name,
            VehicleType vehicleType,
            String cityCode,
            String currency,
            long baseFareMinor,
            long perKmMinor,
            long perMinuteMinor,
            long bookingFeeMinor,
            long minFareMinor,
            int taxBps,
            BigDecimal surgeMultiplier,
            boolean active,
            int priority
    ) {
        static RuleResponse from(FareRuleEntity e) {
            return new RuleResponse(
                    e.getId(), e.getName(), e.getVehicleType(), e.getCityCode(), e.getCurrency(),
                    e.getBaseFareMinor(), e.getPerKmMinor(), e.getPerMinuteMinor(), e.getBookingFeeMinor(),
                    e.getMinFareMinor(), e.getTaxBps(), e.getSurgeMultiplier(), e.isActive(), e.getPriority()
            );
        }
    }

    @GetMapping
    public List<RuleResponse> list() {
        return fareRuleRepository.findAllByOrderByPriorityAsc().stream().map(RuleResponse::from).toList();
    }

    @PostMapping
    public RuleResponse create(@Valid @RequestBody RuleRequest request) {
        FareRuleEntity e = new FareRuleEntity();
        apply(e, request);
        return RuleResponse.from(fareRuleRepository.save(e));
    }

    @PutMapping("/{id}")
    public RuleResponse update(@PathVariable UUID id, @Valid @RequestBody RuleRequest request) {
        FareRuleEntity e = fareRuleRepository.findById(id)
                .orElseThrow(() -> new AppException("NOT_FOUND", "Fare rule not found", HttpStatus.NOT_FOUND.value()));
        apply(e, request);
        return RuleResponse.from(fareRuleRepository.save(e));
    }

    private static void apply(FareRuleEntity e, RuleRequest request) {
        e.setName(request.name());
        e.setVehicleType(request.vehicleType());
        e.setCityCode(request.cityCode());
        e.setCurrency(request.currency());
        e.setBaseFareMinor(request.baseFareMinor());
        e.setPerKmMinor(request.perKmMinor());
        e.setPerMinuteMinor(request.perMinuteMinor());
        e.setBookingFeeMinor(request.bookingFeeMinor());
        e.setMinFareMinor(request.minFareMinor());
        e.setTaxBps(request.taxBps());
        e.setSurgeMultiplier(request.surgeMultiplier());
        e.setActive(request.active());
        e.setPriority(request.priority());
    }
}
