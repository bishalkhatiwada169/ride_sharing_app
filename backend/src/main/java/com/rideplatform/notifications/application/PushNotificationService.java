package com.rideplatform.notifications.application;

import com.rideplatform.notifications.infrastructure.DeviceTokenRepository;
import com.rideplatform.notifications.push.PushGateway;
import org.springframework.stereotype.Service;

import java.util.UUID;

@Service
public class PushNotificationService {

    private final DeviceTokenRepository deviceTokenRepository;
    private final PushGateway pushGateway;

    public PushNotificationService(DeviceTokenRepository deviceTokenRepository, PushGateway pushGateway) {
        this.deviceTokenRepository = deviceTokenRepository;
        this.pushGateway = pushGateway;
    }

    public void notifyUser(UUID userId, String title, String body) {
        deviceTokenRepository.findByUserId(userId).forEach(d ->
                pushGateway.send(d.getToken(), title, body)
        );
    }
}
