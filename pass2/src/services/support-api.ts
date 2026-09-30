import {apiRequest} from './api-client';

export type SupportTicket = {
  id: string;
  category: string;
  status: string;
  priority: string;
  subject: string;
  description: string | null;
  createdAt: string;
};

export function createTicket(
  token: string,
  body: {
    category: string;
    subject: string;
    description?: string;
    rideId?: string;
    priority?: string;
  },
) {
  return apiRequest<SupportTicket>('/support/tickets', {
    method: 'POST',
    token,
    body,
  });
}

export function listMyTickets(token: string) {
  return apiRequest<SupportTicket[]>('/support/tickets/me', {token});
}
