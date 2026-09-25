import {apiRequest} from './api-client';
import type {Quote, Ride, VehicleType} from '../types/ride';

export type QuoteInput = {
  vehicleType: VehicleType;
  pickupLat: number;
  pickupLng: number;
  dropoffLat: number;
  dropoffLng: number;
  pickupAddress: string;
  dropoffAddress: string;
};

export function createQuote(token: string, body: QuoteInput) {
  return apiRequest<Quote>('/pricing/quotes', {
    method: 'POST',
    token,
    body,
  });
}

export function getQuote(token: string, id: string) {
  return apiRequest<Quote>(`/pricing/quotes/${id}`, {token});
}

export function bookRide(
  token: string,
  fareQuoteId: string,
  paymentMethod: 'CASH' | 'DIGITAL' = 'CASH',
) {
  return apiRequest<Ride>('/rides', {
    method: 'POST',
    token,
    body: {fareQuoteId, paymentMethod},
  });
}

export function getRide(token: string, id: string) {
  return apiRequest<Ride>(`/rides/${id}`, {token});
}

export function listRides(token: string) {
  return apiRequest<Ride[]>('/rides', {token});
}

export function cancelRide(token: string, id: string, reason?: string) {
  return apiRequest<Ride>(`/rides/${id}/cancel`, {
    method: 'POST',
    token,
    body: {reason: reason ?? 'Cancelled by passenger'},
  });
}

export function rateRide(
  token: string,
  rideId: string,
  score: number,
  comment?: string,
) {
  return apiRequest(`/ratings/rides/${rideId}`, {
    method: 'POST',
    token,
    body: {score, comment: comment || undefined},
  });
}
