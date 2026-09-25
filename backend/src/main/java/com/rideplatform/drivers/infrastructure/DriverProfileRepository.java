package com.rideplatform.drivers.infrastructure;

import com.rideplatform.drivers.domain.DriverAvailabilityStatus;
import com.rideplatform.drivers.domain.DriverProfileEntity;
import com.rideplatform.drivers.domain.DriverVerificationStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public interface DriverProfileRepository extends JpaRepository<DriverProfileEntity, UUID> {

    List<DriverProfileEntity> findByVerificationStatusAndOnlineTrueAndAvailabilityStatus(
            DriverVerificationStatus verificationStatus,
            DriverAvailabilityStatus availabilityStatus
    );

    @Modifying(clearAutomatically = true)
    @Query(value = """
            UPDATE driver_profiles
            SET current_location = ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography,
                location_updated_at = :updatedAt,
                updated_at = :updatedAt
            WHERE user_id = :userId
            """, nativeQuery = true)
    int updateLocation(
            @Param("userId") UUID userId,
            @Param("lat") double lat,
            @Param("lng") double lng,
            @Param("updatedAt") Instant updatedAt
    );

    @Query(value = """
            SELECT ST_Y(current_location::geometry) AS lat,
                   ST_X(current_location::geometry) AS lng,
                   location_updated_at AS updated_at
            FROM driver_profiles
            WHERE user_id = :userId AND current_location IS NOT NULL
            """, nativeQuery = true)
    List<Object[]> findLocationRaw(@Param("userId") UUID userId);

    @Query(value = """
            SELECT dp.user_id,
                   ST_Distance(
                       dp.current_location,
                       ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography
                   ) AS distance_m
            FROM driver_profiles dp
            WHERE dp.verification_status = :verificationStatus
              AND dp.is_online = TRUE
              AND dp.availability_status = :availabilityStatus
              AND dp.current_location IS NOT NULL
              AND dp.location_updated_at >= (NOW() - make_interval(secs => :staleSeconds))
              AND ST_DWithin(
                    dp.current_location,
                    ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography,
                    :radiusMeters
              )
            ORDER BY distance_m ASC, dp.rating_avg DESC NULLS LAST
            LIMIT :limit
            """, nativeQuery = true)
    List<Object[]> findNearbyCandidates(
            @Param("lat") double lat,
            @Param("lng") double lng,
            @Param("radiusMeters") int radiusMeters,
            @Param("staleSeconds") int staleSeconds,
            @Param("verificationStatus") String verificationStatus,
            @Param("availabilityStatus") String availabilityStatus,
            @Param("limit") int limit
    );
}
