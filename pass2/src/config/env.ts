/**
 * Passenger client config — non-secret only.
 * Demo USB build: 127.0.0.1 + adb reverse tcp:8080 tcp:8080
 */
export const Env = {
  apiBaseUrl: 'http://127.0.0.1:8080/api/v1',
  wsBaseUrl: 'ws://127.0.0.1:8080/ws',
  environment: 'local' as 'local' | 'staging' | 'production',
  brandName: 'Ride',
  googleWebClientId: '' as string,
};
