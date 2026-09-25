package com.rideplatform.notifications.sms;

public interface SmsGateway {
    void sendOtp(String phoneE164, String code);

    /** Generic SMS (SOS alerts, etc.). Mock logs; production adapters send. */
    default void sendText(String phoneE164, String message) {
        sendOtp(phoneE164, message);
    }
}
