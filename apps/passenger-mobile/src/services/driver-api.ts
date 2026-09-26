import {apiRequest} from './api-client';
import type {TokenPair} from '../types/ride';
import {refreshSession} from './auth-api';

export type DriverOffer = {
  id: string;
  rideId: string;
  status: string;
  distanceM: number | null;
  expiresAt: string;
};

export type DriverRide = {
  id: string;
  status: string;
  tripPin: string | null;
};

export async function becomeDriver(
  accessToken: string,
  refreshToken: string,
  displayName = 'Driver',
): Promise<TokenPair> {
  await apiRequest('/drivers/me/application', {
    method: 'POST',
    token: accessToken,
    body: {displayName},
  });
  return refreshSession(refreshToken);
}

export function goOnline(token: string) {
  return apiRequest('/drivers/me/online', {
    method: 'POST',
    token,
    body: {},
  });
}

export function goOffline(token: string) {
  return apiRequest('/drivers/me/offline', {
    method: 'POST',
    token,
    body: {},
  });
}

export function updateDriverLocation(token: string, lat: number, lng: number) {
  return apiRequest('/drivers/me/location', {
    method: 'PUT',
    token,
    body: {lat, lng},
  });
}

export function pendingOffers(token: string) {
  return apiRequest<DriverOffer[]>('/matching/offers/me', {token});
}

export function acceptOffer(token: string, offerId: string) {
  return apiRequest<DriverRide>(`/matching/offers/${offerId}/accept`, {
    method: 'POST',
    token,
    body: {},
  });
}

export function markArriving(token: string, rideId: string) {
  return apiRequest<DriverRide>(`/rides/${rideId}/arriving`, {
    method: 'POST',
    token,
    body: {},
  });
}

export function markArrived(token: string, rideId: string) {
  return apiRequest<DriverRide>(`/rides/${rideId}/arrived`, {
    method: 'POST',
    token,
    body: {},
  });
}

export function startDriverRide(token: string, rideId: string, pin: string) {
  return apiRequest<DriverRide>(`/rides/${rideId}/start`, {
    method: 'POST',
    token,
    body: {pin},
  });
}

export function completeDriverRide(token: string, rideId: string) {
  return apiRequest<DriverRide>(`/rides/${rideId}/complete`, {
    method: 'POST',
    token,
    body: {},
  });
}

/** Dual-role accounts get passenger history from GET /rides; drivers use this. */
export function listDriverRides(token: string) {
  return apiRequest<
    Array<{id: string; status: string; tripPin: string | null}>
  >('/rides/driver/history', {token});
}

export function getDriverProfile(token: string) {
  return apiRequest<{
    online: boolean;
    availabilityStatus: string;
    verificationStatus: string;
  }>('/drivers/me', {token});
}
