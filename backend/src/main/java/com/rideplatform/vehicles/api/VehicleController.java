package com.rideplatform.vehicles.api;

import com.rideplatform.auth.security.UserPrincipal;
import com.rideplatform.vehicles.application.VehicleService;
import com.rideplatform.vehicles.domain.VehicleEntity;
import com.rideplatform.vehicles.domain.VehicleStatus;
import com.rideplatform.vehicles.domain.VehicleType;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
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
@RequestMapping("/api/v1/vehicles")
public class VehicleController {

    private final VehicleService vehicleService;

    public VehicleController(VehicleService vehicleService) {
        this.vehicleService = vehicleService;
    }

    public record RegisterRequest(
            @NotNull VehicleType vehicleType,
            @Size(max = 80) String make,
            @Size(max = 80) String model,
            @Size(max = 40) String color,
            @Min(1990) @Max(2100) Short year,
            @NotBlank @Size(max = 32) String plateNumber,
            @Min(1) @Max(8) Short seats
    ) {}

    public record VehicleResponse(
            UUID id,
            UUID driverUserId,
            VehicleType vehicleType,
            String make,
            String model,
            String color,
            Short year,
            String plateNumber,
            VehicleStatus status,
            short seats,
            Instant createdAt
    ) {
        static VehicleResponse from(VehicleEntity e) {
            return new VehicleResponse(
                    e.getId(), e.getDriverUserId(), e.getVehicleType(), e.getMake(), e.getModel(),
                    e.getColor(), e.getYear(), e.getPlateNumber(), e.getStatus(), e.getSeats(), e.getCreatedAt()
            );
        }
    }

    @PostMapping("/me")
    @PreAuthorize("hasRole('DRIVER')")
    public VehicleResponse register(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody RegisterRequest request
    ) {
        return VehicleResponse.from(vehicleService.register(
                principal.getId(),
                request.vehicleType(),
                request.make(),
                request.model(),
                request.color(),
                request.year(),
                request.plateNumber(),
                request.seats()
        ));
    }

    @GetMapping("/me")
    @PreAuthorize("hasRole('DRIVER')")
    public List<VehicleResponse> mine(@AuthenticationPrincipal UserPrincipal principal) {
        return vehicleService.listMine(principal.getId()).stream().map(VehicleResponse::from).toList();
    }

    @PostMapping("/admin/{vehicleId}/activate")
    @PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN')")
    public VehicleResponse activate(@PathVariable UUID vehicleId) {
        return VehicleResponse.from(vehicleService.activate(vehicleId));
    }
}
