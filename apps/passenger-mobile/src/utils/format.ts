import {ApiError} from '../services/api-client';

export function formatMoney(minor: number, currency: string): string {
  const major = minor / 100;
  const code = (currency || 'NPR').toUpperCase();
  if (code === 'NPR' || code === 'NRS') {
    return `रू${Math.round(major)}`;
  }
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: code,
      maximumFractionDigits: 0,
    }).format(major);
  } catch {
    return `${code} ${major.toFixed(0)}`;
  }
}

export function formatDistance(meters: number | null | undefined): string {
  if (meters == null) {
    return '—';
  }
  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }
  return `${(meters / 1000).toFixed(1)} km`;
}

export function formatDuration(seconds: number | null | undefined): string {
  if (seconds == null) {
    return '—';
  }
  const m = Math.max(1, Math.round(seconds / 60));
  return `${m} min`;
}

export function isValidE164(phone: string): boolean {
  return /^\+[1-9]\d{7,14}$/.test(phone.trim());
}

/** Map API/network failures to short user-facing copy (no stack traces). */
export function parseApiError(err: unknown): string {
  if (err instanceof TypeError) {
    return 'Network error. Check your connection and try again.';
  }
  if (err instanceof ApiError) {
    if (err.status === 401) {
      return 'Your session expired. Please sign in again.';
    }
    if (err.status === 403) {
      return 'You do not have permission for this action.';
    }
    if (err.status === 404) {
      return 'The requested item was not found.';
    }
    if (err.status === 409) {
      try {
        const j = JSON.parse(err.body) as {code?: string; message?: string};
        if (j.code === 'RIDE_ACTIVE') {
          return 'You already have an active ride. Open it from Home or cancel it first.';
        }
        if (j.message) {
          return j.message;
        }
      } catch {
        // fall through
      }
      return 'This action conflicts with the current ride state.';
    }
    if (err.status >= 500) {
      return 'Server error. Please try again in a moment.';
    }
    try {
      const j = JSON.parse(err.body) as {message?: string; code?: string};
      if (j.code === 'NO_DRIVER_FOUND' || j.message?.toLowerCase().includes('no driver')) {
        return 'No drivers are available right now. Try again shortly.';
      }
      if (j.message) {
        return j.message;
      }
    } catch {
      if (err.body && err.body.length < 200 && !err.body.includes('Exception')) {
        return err.body;
      }
    }
    if (err.status === 400) {
      return 'Please check your input and try again.';
    }
    return 'Request failed. Please try again.';
  }
  if (err instanceof Error) {
    const raw = err.message;
    try {
      const j = JSON.parse(raw) as {message?: string; code?: string};
      if (j.code === 'RIDE_ACTIVE') {
        return 'You already have an active ride. Open it from Home or cancel it first.';
      }
      if (j.message) {
        return j.message;
      }
    } catch {
      // plain text
    }
    if (raw.includes('Network request failed') || raw.includes('Failed to fetch')) {
      return 'Network error. Check your connection and try again.';
    }
    return raw.length < 180 ? raw : 'Something went wrong. Please try again.';
  }
  return 'Something went wrong';
}
