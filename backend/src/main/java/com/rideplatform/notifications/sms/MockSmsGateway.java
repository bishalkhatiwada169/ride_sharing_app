package com.rideplatform.notifications.sms;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnProperty(name = "rideplatform.sms.provider", havingValue = "mock", matchIfMissing = true)
public class MockSmsGateway implements SmsGateway {

    private static final Logger log = LoggerFactory.getLogger(MockSmsGateway.class);

    @Override
    public void sendOtp(String phoneE164, String code) {
        // Local/dev only — never log OTPs in production providers
        log.info("[MockSms] OTP for {} => {}", phoneE164, code);
    }

    @Override
    public void sendText(String phoneE164, String message) {
        log.info("[MockSms] SMS to {} => {}", phoneE164, message);
    }
}
