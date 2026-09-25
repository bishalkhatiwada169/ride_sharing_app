package com.rideplatform.vehicles.application;

import com.rideplatform.common.exception.AppException;
import com.rideplatform.vehicles.domain.VehicleEntity;
import com.rideplatform.vehicles.domain.VehicleStatus;
import com.rideplatform.vehicles.domain.VehicleType;
import com.rideplatform.vehicles.infrastructure.VehicleRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
public class VehicleService {

    private final VehicleRepository vehicleRepository;

    public VehicleService(VehicleRepository vehicleRepository) {
        this.vehicleRepository = vehicleRepository;
    }

    @Transactional
    public VehicleEntity register(
            UUID driverUserId,
            VehicleType type,
            String make,
            String model,
            String color,
            Short year,
            String plateNumber,
            Short seats
    ) {
        VehicleEntity vehicle = new VehicleEntity();
        vehicle.setDriverUserId(driverUserId);
        vehicle.setVehicleType(type);
        vehicle.setMake(make);
        vehicle.setModel(model);
        vehicle.setColor(color);
        vehicle.setYear(year);
        vehicle.setPlateNumber(plateNumber.trim().toUpperCase());
        vehicle.setSeats(seats == null ? 4 : seats);
        vehicle.setStatus(VehicleStatus.PENDING);
        return vehicleRepository.save(vehicle);
    }

    @Transactional(readOnly = true)
    public List<VehicleEntity> listMine(UUID driverUserId) {
        return vehicleRepository.findByDriverUserIdOrderByCreatedAtDesc(driverUserId);
    }

    @Transactional
    public VehicleEntity activate(UUID vehicleId) {
        VehicleEntity vehicle = vehicleRepository.findById(vehicleId)
                .orElseThrow(() -> new AppException("NOT_FOUND", "Vehicle not found", HttpStatus.NOT_FOUND.value()));
        vehicle.setStatus(VehicleStatus.ACTIVE);
        return vehicleRepository.save(vehicle);
    }

    @Transactional(readOnly = true)
    public VehicleEntity requireActiveForDriver(UUID driverUserId, VehicleType type) {
        return vehicleRepository.findFirstByDriverUserIdAndVehicleTypeAndStatus(driverUserId, type, VehicleStatus.ACTIVE)
                .or(() -> vehicleRepository.findFirstByDriverUserIdAndStatus(driverUserId, VehicleStatus.ACTIVE))
                .orElseThrow(() -> new AppException(
                        "VEHICLE_REQUIRED",
                        "Driver has no active vehicle for type " + type,
                        HttpStatus.CONFLICT.value()
                ));
    }
}
