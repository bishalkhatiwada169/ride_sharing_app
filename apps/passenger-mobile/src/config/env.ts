/**
 * Passenger client config — non-secret only.
 *
 * How to point at your API:
 * - Android emulator: http://10.0.2.2:8080/api/v1 (default below)
 * - iOS simulator:     http://localhost:8080/api/v1
 * - Physical device:   http://<your-LAN-IP>:8080/api/v1
 *                      (phone and PC on same Wi‑Fi; allow firewall on 8080)
 *
 * Metro does not load .env automatically in this app yet — edit this file
 * for the active target. See .env.example for documentation only.
 *
 * MAP-1 Google Maps Android key is injected at Gradle time via
 * android/local.properties (GOOGLE_MAPS_ANDROID_API_KEY). It is not a JS secret.
 */
export const Env = {
  // Physical device on LAN (was 10.0.2.2 for emulator only)
  apiBaseUrl: 'http://192.168.18.22:8080/api/v1',
  wsBaseUrl: 'ws://192.168.18.22:8080/ws',
  environment: 'local' as 'local' | 'staging' | 'production',
  brandName: 'Ride',
  /** Google OAuth Web client ID — required for production Google Sign-In. */
  googleWebClientId: '' as string,
};
