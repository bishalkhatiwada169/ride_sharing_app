package com.rideplatform.notifications.push;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

@Component
public class MockPushGateway implements PushGateway {

    private static final Logger log = LoggerFactory.getLogger(MockPushGateway.class);

    @Override
    public void send(String deviceToken, String title, String body) {
        log.info("[MockPush] token={} title={} body={}", deviceToken, title, body);
    }
}
