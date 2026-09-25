package com.rideplatform.notifications.push;

public interface PushGateway {
    void send(String deviceToken, String title, String body);
}
