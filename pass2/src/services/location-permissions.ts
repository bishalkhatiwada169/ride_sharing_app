import {Linking, PermissionsAndroid, Platform} from 'react-native';

export type LocationPermissionStatus =
  | 'unknown'
  | 'granted'
  | 'denied'
  | 'blocked';

/**
 * Foreground location only (MAP-2). Never requests background location.
 */
export async function checkLocationPermission(): Promise<LocationPermissionStatus> {
  if (Platform.OS !== 'android') {
    return 'granted';
  }

  const fine = await PermissionsAndroid.check(
    PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
  );
  if (fine) {
    return 'granted';
  }
  const coarse = await PermissionsAndroid.check(
    PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
  );
  return coarse ? 'granted' : 'denied';
}

/**
 * Request fine (and coarse) location once. Maps never_ask_again → blocked.
 */
export async function requestLocationPermission(): Promise<LocationPermissionStatus> {
  if (Platform.OS !== 'android') {
    return 'granted';
  }

  const current = await checkLocationPermission();
  if (current === 'granted') {
    return 'granted';
  }

  const result = await PermissionsAndroid.requestMultiple([
    PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
    PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
  ]);

  const fine = result[PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION];
  const coarse = result[PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION];

  if (
    fine === PermissionsAndroid.RESULTS.GRANTED ||
    coarse === PermissionsAndroid.RESULTS.GRANTED
  ) {
    return 'granted';
  }

  if (
    fine === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN ||
    coarse === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN
  ) {
    return 'blocked';
  }

  return 'denied';
}

export function openAppSettings(): void {
  void Linking.openSettings();
}

/** Opens system location settings when possible; falls back to app settings. */
export function openLocationSettings(): void {
  if (Platform.OS === 'android') {
    Linking.sendIntent('android.settings.LOCATION_SOURCE_SETTINGS').catch(() => {
      openAppSettings();
    });
    return;
  }
  openAppSettings();
}
