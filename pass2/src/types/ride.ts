/** Backend RideStatus — source of truth; do not invent parallel enums. */
export type RideStatus =
  | 'REQUESTED'
  | 'SEARCHING_DRIVER'
  | 'DRIVER_ACCEPTED'
  | 'DRIVER_ARRIVING'
  | 'DRIVER_ARRIVED'
  | 'RIDE_STARTED'
  | 'RIDE_COMPLETED'
  | 'CANCELLED_BY_PASSENGER'
  | 'CANCELLED_BY_DRIVER'
  | 'NO_DRIVER_FOUND'
  | 'EXPIRED'
  | 'PAYMENT_FAILED';

export type VehicleType = 'ECONOMY' | 'COMFORT' | 'XL';

export type Quote = {
  id: string;
  vehicleType: VehicleType;
  distanceM: number;
  durationS: number;
  currency: string;
  totalMinor: number;
  breakdown?: Record<string, unknown>;
  expiresAt: string;
};

export type Ride = {
  id: string;
  passengerUserId: string;
  driverUserId: string | null;
  vehicleId: string | null;
  status: RideStatus;
  vehicleTypeRequested: VehicleType;
  pickupLat: number;
  pickupLng: number;
  pickupAddress: string | null;
  dropoffLat: number;
  dropoffLng: number;
  dropoffAddress: string | null;
  fareQuoteId: string;
  distanceM: number | null;
  durationS: number | null;
  paymentMethod: string;
  paymentStatus: string;
  tripPin: string | null;
  requestedAt: string | null;
  assignedAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
};

export type AuthUser = {
  id: string;
  phoneE164: string | null;
  displayName: string | null;
  email: string | null;
  roles: string[];
};

export type TokenPair = {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresInSeconds: number;
  user: AuthUser;
};

export const ACTIVE_RIDE_STATUSES: RideStatus[] = [
  'REQUESTED',
  'SEARCHING_DRIVER',
  'DRIVER_ACCEPTED',
  'DRIVER_ARRIVING',
  'DRIVER_ARRIVED',
  'RIDE_STARTED',
];

export const CANCELABLE_STATUSES: RideStatus[] = [
  'SEARCHING_DRIVER',
  'DRIVER_ACCEPTED',
  'DRIVER_ARRIVING',
  'DRIVER_ARRIVED',
];

export function isActiveRide(status: RideStatus): boolean {
  return ACTIVE_RIDE_STATUSES.includes(status);
}

export function canCancelRide(status: RideStatus): boolean {
  return CANCELABLE_STATUSES.includes(status);
}

export function isTerminalRide(status: RideStatus): boolean {
  return (
    status === 'RIDE_COMPLETED' ||
    status === 'CANCELLED_BY_PASSENGER' ||
    status === 'CANCELLED_BY_DRIVER' ||
    status === 'NO_DRIVER_FOUND' ||
    status === 'EXPIRED' ||
    status === 'PAYMENT_FAILED'
  );
}

export function formatStatusLabel(status: RideStatus): string {
  switch (status) {
    case 'SEARCHING_DRIVER':
    case 'REQUESTED':
      return 'Finding your driver';
    case 'DRIVER_ACCEPTED':
      return 'Driver is on the way';
    case 'DRIVER_ARRIVING':
      return 'Driver is arriving';
    case 'DRIVER_ARRIVED':
      return 'Driver has arrived';
    case 'RIDE_STARTED':
      return 'Ride in progress';
    case 'RIDE_COMPLETED':
      return "You've arrived";
    case 'CANCELLED_BY_PASSENGER':
    case 'CANCELLED_BY_DRIVER':
      return 'Ride cancelled';
    case 'NO_DRIVER_FOUND':
      return 'No driver found';
    case 'EXPIRED':
      return 'Search expired';
    case 'PAYMENT_FAILED':
      return 'Payment issue';
    default:
      return 'Updating your trip…';
  }
}
