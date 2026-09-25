import {apiRequest} from './api-client';

export type EmergencyContact = {
  id: string;
  name: string;
  phoneE164: string;
  relationship: string | null;
};

export type SosResult = {
  id: string;
  type: string;
  status: string;
};

export type ShareResult = {
  token: string;
  sharePath: string;
  expiresAt: string;
};

export function listEmergencyContacts(token: string) {
  return apiRequest<EmergencyContact[]>('/safety/emergency-contacts', {token});
}

export function saveEmergencyContacts(
  token: string,
  contacts: {name: string; phoneE164: string; relationship?: string}[],
) {
  return apiRequest<EmergencyContact[]>('/safety/emergency-contacts', {
    method: 'PUT',
    token,
    body: {contacts},
  });
}

export function triggerSos(
  token: string,
  rideId: string,
  notes?: string,
) {
  return apiRequest<SosResult>(`/safety/rides/${rideId}/sos`, {
    method: 'POST',
    token,
    body: {notes: notes ?? 'Passenger SOS'},
  });
}

export function createTripShare(token: string, rideId: string) {
  return apiRequest<ShareResult>(`/safety/rides/${rideId}/share`, {
    method: 'POST',
    token,
    body: {},
  });
}

export function revokeTripShare(token: string, rideId: string) {
  return apiRequest(`/safety/rides/${rideId}/share`, {
    method: 'DELETE',
    token,
  });
}

export function reportIncident(
  token: string,
  body: {category: string; description: string; rideId?: string},
) {
  return apiRequest('/safety/incidents', {method: 'POST', token, body});
}
