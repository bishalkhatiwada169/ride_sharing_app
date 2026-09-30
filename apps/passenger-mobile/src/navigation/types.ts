export type AuthStackParamList = {
  RoleSelect: undefined;
  Welcome: undefined;
  Phone: undefined;
  Otp: {phoneE164: string};
};

export type MainTabParamList = {
  Home: undefined;
  History: undefined;
  Profile: undefined;
};

export type DriverTabParamList = {
  DriverHome: undefined;
  Profile: undefined;
};

export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
  DriverMain: undefined;
  Booking:
    | undefined
    | {
        destinationLabel?: string;
        destinationSecondary?: string;
        dropoffLat?: number;
        dropoffLng?: number;
        preferredVehicle?: 'ECONOMY' | 'COMFORT' | 'XL';
      };
  DestinationSearch:
    | undefined
    | {preferredVehicle?: 'ECONOMY' | 'COMFORT' | 'XL'};
  ActiveRide: {rideId: string};
  RideDetail: {rideId: string};
  Rating: {rideId: string};
  Support: undefined;
  Safety: undefined;
};
