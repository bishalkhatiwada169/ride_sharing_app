package com.rideplatform.admin.api;

import com.rideplatform.drivers.domain.DriverAvailabilityStatus;
import com.rideplatform.drivers.domain.DriverVerificationStatus;
import com.rideplatform.drivers.infrastructure.DriverProfileRepository;
import com.rideplatform.rides.domain.RideStatus;
import com.rideplatform.rides.infrastructure.RideRepository;
import com.rideplatform.safety.infrastructure.SafetyIncidentRepository;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.EnumSet;

@RestController
@RequestMapping("/api/v1/admin")
@PreAuthorize("hasAnyRole('ADMIN','SUPER_ADMIN','SUPPORT')")
public class AdminDashboardController {

    private final RideRepository rideRepository;
    private final DriverProfileRepository driverProfileRepository;
    private final SafetyIncidentRepository safetyIncidentRepository;

    public AdminDashboardController(
            RideRepository rideRepository,
            DriverProfileRepository driverProfileRepository,
            SafetyIncidentRepository safetyIncidentRepository
    ) {
        this.rideRepository = rideRepository;
        this.driverProfileRepository = driverProfileRepository;
        this.safetyIncidentRepository = safetyIncidentRepository;
    }

    public record DashboardResponse(long liveRides, long onlineDrivers, long openIncidents) {}

    @GetMapping("/dashboard")
    public DashboardResponse dashboard() {
        long live = rideRepository.findByStatusInOrderByCreatedAtDesc(EnumSet.of(
                RideStatus.SEARCHING_DRIVER,
                RideStatus.DRIVER_ACCEPTED,
                RideStatus.DRIVER_ARRIVING,
                RideStatus.DRIVER_ARRIVED,
                RideStatus.RIDE_STARTED
        )).size();
        long online = driverProfileRepository
                .findByVerificationStatusAndOnlineTrueAndAvailabilityStatus(
                        DriverVerificationStatus.APPROVED,
                        DriverAvailabilityStatus.AVAILABLE
                ).size()
                + driverProfileRepository
                .findByVerificationStatusAndOnlineTrueAndAvailabilityStatus(
                        DriverVerificationStatus.APPROVED,
                        DriverAvailabilityStatus.ON_TRIP
                ).size()
                + driverProfileRepository
                .findByVerificationStatusAndOnlineTrueAndAvailabilityStatus(
                        DriverVerificationStatus.APPROVED,
                        DriverAvailabilityStatus.ON_OFFER
                ).size();
        long open = safetyIncidentRepository.findByStatusOrderByCreatedAtDesc("OPEN").size();
        return new DashboardResponse(live, online, open);
    }
}
