import {useCallback, useEffect, useRef, useState} from 'react';
import {AppState, type AppStateStatus} from 'react-native';
import Geolocation from '@react-native-community/geolocation';
import {
  checkLocationPermission,
  openAppSettings,
  openLocationSettings,
  requestLocationPermission,
  type LocationPermissionStatus,
} from '../services/location-permissions';

Geolocation.setRNConfiguration({
  skipPermissionRequests: true,
  authorizationLevel: 'whenInUse',
  locationProvider: 'playServices',
  enableBackgroundLocationUpdates: false,
});

export type PassengerCoords = {
  latitude: number;
  longitude: number;
  accuracy: number | null;
  timestamp: number;
};

export type LocationServicesStatus = 'unknown' | 'on' | 'off';

export type PassengerLocation = {
  permission: LocationPermissionStatus;
  services: LocationServicesStatus;
  coords: PassengerCoords | null;
  /** True until the first position arrives. */
  locating: boolean;
  statusMessage: string | null;
  requestingPermission: boolean;
  requestPermission: () => Promise<void>;
  openSettings: () => void;
  openLocationSettings: () => void;
};

const WATCH_OPTIONS = {
  enableHighAccuracy: true,
  distanceFilter: 12,
  interval: 3000,
  fastestInterval: 1500,
  maximumAge: 10000,
  timeout: 25000,
} as const;

function mapGeoError(code: number | undefined, message?: string): {
  services: LocationServicesStatus;
  statusMessage: string;
} {
  if (code === 1) {
    return {
      services: 'unknown',
      statusMessage:
        'Location permission is required to show where you are on the map.',
    };
  }
  if (code === 2) {
    const lower = (message ?? '').toLowerCase();
    if (
      lower.includes('disabled') ||
      lower.includes('location services') ||
      lower.includes('provider')
    ) {
      return {
        services: 'off',
        statusMessage:
          'Location is turned off. Enable it to show where you are.',
      };
    }
    return {
      services: 'on',
      statusMessage: 'Still searching… Try outdoors or near a window.',
    };
  }
  if (code === 3) {
    return {
      services: 'on',
      statusMessage: 'Still refining your location…',
    };
  }
  return {
    services: 'unknown',
    statusMessage: message || 'Unable to read your location right now.',
  };
}

function shouldReplace(
  prev: PassengerCoords | null,
  next: PassengerCoords,
): boolean {
  if (!prev) {
    return true;
  }
  if (
    next.accuracy != null &&
    prev.accuracy != null &&
    next.accuracy + 15 < prev.accuracy
  ) {
    return true;
  }
  if (next.timestamp - prev.timestamp > 20000) {
    return true;
  }
  const dLat = Math.abs(next.latitude - prev.latitude);
  const dLng = Math.abs(next.longitude - prev.longitude);
  if (dLat > 0.00018 || dLng > 0.00018) {
    return true;
  }
  if (
    prev.accuracy != null &&
    next.accuracy != null &&
    prev.accuracy > 100 &&
    next.accuracy < prev.accuracy
  ) {
    return true;
  }
  return false;
}

/**
 * Foreground passenger GPS.
 * Strategy: cached/network fix first (fast), then GPS refine + watch.
 * Location requests are serialized to avoid a Play Services clearWatch NPE.
 */
export function usePassengerLocation(enabled: boolean): PassengerLocation {
  const [permission, setPermission] =
    useState<LocationPermissionStatus>('unknown');
  const [services, setServices] = useState<LocationServicesStatus>('unknown');
  const [coords, setCoords] = useState<PassengerCoords | null>(null);
  const [locating, setLocating] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [requestingPermission, setRequestingPermission] = useState(false);

  const watchIdRef = useRef<number | null>(null);
  const askedRef = useRef(false);
  const enabledRef = useRef(enabled);
  const coordsRef = useRef<PassengerCoords | null>(null);
  const sessionRef = useRef(0);
  enabledRef.current = enabled;

  const stopWatch = useCallback(() => {
    const id = watchIdRef.current;
    watchIdRef.current = null;
    if (id == null) {
      return;
    }
    try {
      Geolocation.clearWatch(id);
    } catch {
      // Play Services may already have cleared the listener.
    }
  }, []);

  const applyPosition = useCallback(
    (
      latitude: number,
      longitude: number,
      accuracy: number | null,
      timestamp: number,
    ) => {
      const next = {latitude, longitude, accuracy, timestamp};
      if (!shouldReplace(coordsRef.current, next)) {
        return;
      }
      coordsRef.current = next;
      setServices('on');
      setLocating(false);
      setStatusMessage(
        accuracy != null && accuracy > 120
          ? 'Approximate location — refining…'
          : null,
      );
      setCoords(next);
    },
    [],
  );

  const startWatch = useCallback(() => {
    const session = ++sessionRef.current;
    stopWatch();
    setLocating(prev => coordsRef.current == null || prev);
    if (coordsRef.current == null) {
      setStatusMessage('Finding you…');
    }

    const beginWatch = () => {
      if (session !== sessionRef.current || !enabledRef.current) {
        return;
      }
      stopWatch();
      watchIdRef.current = Geolocation.watchPosition(
        position => {
          if (session !== sessionRef.current) {
            return;
          }
          applyPosition(
            position.coords.latitude,
            position.coords.longitude,
            position.coords.accuracy ?? null,
            position.timestamp,
          );
        },
        error => {
          if (session !== sessionRef.current) {
            return;
          }
          if (coordsRef.current == null) {
            const mapped = mapGeoError(error.code, error.message);
            setServices(mapped.services);
            setStatusMessage(mapped.statusMessage);
          }
          if (error.code === 1) {
            setPermission(prev => (prev === 'blocked' ? prev : 'denied'));
          }
        },
        WATCH_OPTIONS,
      );
    };

    const refineGps = () => {
      if (session !== sessionRef.current || !enabledRef.current) {
        return;
      }
      Geolocation.getCurrentPosition(
        position => {
          if (session !== sessionRef.current) {
            return;
          }
          applyPosition(
            position.coords.latitude,
            position.coords.longitude,
            position.coords.accuracy ?? null,
            position.timestamp,
          );
          beginWatch();
        },
        error => {
          if (session !== sessionRef.current) {
            return;
          }
          if (coordsRef.current == null) {
            const mapped = mapGeoError(error.code, error.message);
            setServices(mapped.services);
            setStatusMessage(mapped.statusMessage);
            setLocating(false);
          }
          beginWatch();
        },
        {
          enableHighAccuracy: true,
          maximumAge: 0,
          timeout: 18000,
        },
      );
    };

    // 1) Fast path: last-known / network (often <1–2s indoors)
    Geolocation.getCurrentPosition(
      position => {
        if (session !== sessionRef.current) {
          return;
        }
        applyPosition(
          position.coords.latitude,
          position.coords.longitude,
          position.coords.accuracy ?? null,
          position.timestamp,
        );
        refineGps();
      },
      () => {
        if (session !== sessionRef.current) {
          return;
        }
        refineGps();
      },
      {
        enableHighAccuracy: false,
        maximumAge: 120000,
        timeout: 6000,
      },
    );
  }, [applyPosition, stopWatch]);

  const requestPermission = useCallback(async () => {
    setRequestingPermission(true);
    try {
      const result = await requestLocationPermission();
      setPermission(result);
      askedRef.current = true;
      if (result === 'granted' && enabledRef.current) {
        setStatusMessage('Finding you…');
        setLocating(true);
        startWatch();
      } else if (result === 'blocked') {
        sessionRef.current += 1;
        stopWatch();
        setLocating(false);
        setStatusMessage(
          'Location is blocked. Open settings to allow location.',
        );
      } else if (result === 'denied') {
        sessionRef.current += 1;
        stopWatch();
        setLocating(false);
        setStatusMessage('Allow location to show where you are.');
      }
    } finally {
      setRequestingPermission(false);
    }
  }, [startWatch, stopWatch]);

  useEffect(() => {
    if (!enabled) {
      sessionRef.current += 1;
      stopWatch();
      setLocating(false);
      return;
    }

    let cancelled = false;

    (async () => {
      const current = await checkLocationPermission();
      if (cancelled) {
        return;
      }
      setPermission(current);

      if (current === 'granted') {
        startWatch();
        return;
      }

      if (!askedRef.current) {
        askedRef.current = true;
        await requestPermission();
      }
    })();

    return () => {
      cancelled = true;
      sessionRef.current += 1;
      stopWatch();
    };
  }, [enabled, requestPermission, startWatch, stopWatch]);

  useEffect(() => {
    const onAppState = (next: AppStateStatus) => {
      if (!enabledRef.current) {
        return;
      }
      if (next === 'active' && permission === 'granted') {
        startWatch();
      } else if (next === 'background') {
        // Avoid stopping on brief "inactive" (permission dialogs / keyguard).
        sessionRef.current += 1;
        stopWatch();
      }
    };
    const sub = AppState.addEventListener('change', onAppState);
    return () => sub.remove();
  }, [permission, startWatch, stopWatch]);

  return {
    permission,
    services,
    coords,
    locating,
    statusMessage,
    requestingPermission,
    requestPermission,
    openSettings: openAppSettings,
    openLocationSettings,
  };
}
