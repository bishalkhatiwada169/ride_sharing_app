package com.rideplatform.notifications.api;

import com.rideplatform.auth.security.UserPrincipal;
import com.rideplatform.notifications.domain.DeviceTokenEntity;
import com.rideplatform.notifications.infrastructure.DeviceTokenRepository;
import com.rideplatform.notifications.push.PushGateway;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/notifications")
public class NotificationController {

    private final DeviceTokenRepository deviceTokenRepository;
    private final PushGateway pushGateway;

    public NotificationController(DeviceTokenRepository deviceTokenRepository, PushGateway pushGateway) {
        this.deviceTokenRepository = deviceTokenRepository;
        this.pushGateway = pushGateway;
    }

    public record DeviceRequest(
            @NotBlank @Size(max = 32) String platform,
            @NotBlank @Size(max = 512) String token
    ) {}

    public record TestPushRequest(@NotBlank String title, @NotBlank String body) {}

    @PostMapping("/me/devices")
    @PreAuthorize("isAuthenticated()")
    public void registerDevice(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody DeviceRequest request
    ) {
        DeviceTokenEntity entity = deviceTokenRepository
                .findByUserIdAndToken(principal.getId(), request.token())
                .orElseGet(DeviceTokenEntity::new);
        entity.setUserId(principal.getId());
        entity.setPlatform(request.platform());
        entity.setToken(request.token());
        deviceTokenRepository.save(entity);
    }

    @PostMapping("/me/test-push")
    @PreAuthorize("isAuthenticated()")
    public void testPush(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody TestPushRequest request
    ) {
        deviceTokenRepository.findByUserId(principal.getId()).forEach(d ->
                pushGateway.send(d.getToken(), request.title(), request.body())
        );
    }
}
