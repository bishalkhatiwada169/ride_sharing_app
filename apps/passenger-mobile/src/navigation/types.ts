export type AuthStackParamList = {
  Splash: undefined;
  Phone: undefined;
  Otp: {phoneE164: string};
};

export type MainTabParamList = {
  Home: undefined;
  History: undefined;
  Safety: undefined;
  Profile: undefined;
};

export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
  Booking: undefined;
  ActiveRide: {rideId: string};
  RideDetail: {rideId: string};
  Rating: {rideId: string};
  Support: undefined;
};
