import { Env } from "../config/env";

async function api<T>(
  path: string,
  token: string | null,
  init: RequestInit = {},
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init.headers as Record<string, string>),
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${Env.apiBaseUrl}${path}`, { ...init, headers });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `HTTP ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export type Ride = {
  id: string;
  status: string;
  tripPin: string | null;
};

export type Offer = {
  id: string;
  rideId: string;
  status: string;
  distanceM: number | null;
  expiresAt: string;
};

export async function becomeDriver(token: string, refreshToken: string) {
  await api("/drivers/me/application", token, {
    method: "POST",
    body: JSON.stringify({ displayName: "Mobile Driver" }),
  });
  return api<{ accessToken: string; refreshToken: string }>(
    "/auth/token/refresh",
    null,
    { method: "POST", body: JSON.stringify({ refreshToken }) },
  );
}

export function goOnline(token: string) {
  return api("/drivers/me/online", token, { method: "POST", body: "{}" });
}

export function updateLocation(token: string, lat: number, lng: number) {
  return api("/drivers/me/location", token, {
    method: "PUT",
    body: JSON.stringify({ lat, lng }),
  });
}

export function pendingOffers(token: string) {
  return api<Offer[]>("/matching/offers/me", token);
}

export function acceptOffer(token: string, offerId: string) {
  return api<Ride>(`/matching/offers/${offerId}/accept`, token, {
    method: "POST",
    body: "{}",
  });
}

export function markArriving(token: string, rideId: string) {
  return api<Ride>(`/rides/${rideId}/arriving`, token, {
    method: "POST",
    body: "{}",
  });
}

export function markArrived(token: string, rideId: string) {
  return api<Ride>(`/rides/${rideId}/arrived`, token, {
    method: "POST",
    body: "{}",
  });
}

export function startRide(token: string, rideId: string, pin: string) {
  return api<Ride>(`/rides/${rideId}/start`, token, {
    method: "POST",
    body: JSON.stringify({ pin }),
  });
}

export function completeRide(token: string, rideId: string) {
  return api<Ride>(`/rides/${rideId}/complete`, token, {
    method: "POST",
    body: "{}",
  });
}
