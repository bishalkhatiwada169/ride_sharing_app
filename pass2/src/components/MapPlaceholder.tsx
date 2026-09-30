import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import {Platform, Pressable, StyleSheet, Text, View} from 'react-native';
import MapView, {
  Circle,
  Marker,
  PROVIDER_GOOGLE,
  type Region,
} from 'react-native-maps';
import {usePassengerLocation} from '../hooks/usePassengerLocation';
import {Icon} from './ui/Icon';
import {colors, elevation, radius, spacing, typography} from '../theme/tokens';

const FALLBACK_REGION: Region = {
  latitude: 27.7172,
  longitude: 85.324,
  latitudeDelta: 0.045,
  longitudeDelta: 0.045,
};

const FOLLOW_DELTAS = {
  latitudeDelta: 0.0085,
  longitudeDelta: 0.0085,
};

const COARSE_DELTAS = {
  latitudeDelta: 0.04,
  longitudeDelta: 0.04,
};

const FOLLOW_MOVE_THRESHOLD_M = 12;

export type MapPoint = {
  latitude: number;
  longitude: number;
  title?: string;
  kind?: 'pickup' | 'dropoff';
};

export type MapHandle = {
  recenter: () => void;
  isFollowing: () => boolean;
  fitPoints: (points: MapPoint[]) => void;
};

type Props = {
  label?: string;
  height?: number;
  fill?: boolean;
  locationEnabled?: boolean;
  controlsBottomOffset?: number;
  showLabel?: boolean;
  /** When false, parent can render FloatingMapButton + call ref.recenter(). */
  showRecenterButton?: boolean;
  markers?: MapPoint[];
  /** When set, camera frames these points (pickup + destination). */
  fitToMarkers?: boolean;
  followUser?: boolean;
};

function distanceMeters(
  a: {latitude: number; longitude: number},
  b: {latitude: number; longitude: number},
): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const R = 6371000;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export const MapPlaceholder = forwardRef<MapHandle, Props>(
  function MapPlaceholder(
    {
      label = 'Map',
      height = 180,
      fill = false,
      locationEnabled = false,
      controlsBottomOffset = 0,
      showLabel = true,
      showRecenterButton = true,
      markers,
      fitToMarkers = false,
      followUser = true,
    },
    ref,
  ) {
    const mapRef = useRef<MapView | null>(null);
    const [followMode, setFollowMode] = useState(followUser);
    const [hasCenteredOnce, setHasCenteredOnce] = useState(false);
    const lastFollowCoords = useRef<{
      latitude: number;
      longitude: number;
    } | null>(null);
    const animatingRef = useRef(false);
    const fittedKey = useRef<string>('');

    const location = usePassengerLocation(locationEnabled);
    const hasPermission = location.permission === 'granted';
    const coords = location.coords;

    const fitPoints = useCallback((points: MapPoint[]) => {
      if (!mapRef.current || points.length === 0) {
        return;
      }
      if (points.length === 1) {
        mapRef.current.animateToRegion(
          {
            latitude: points[0].latitude,
            longitude: points[0].longitude,
            ...FOLLOW_DELTAS,
          },
          500,
        );
        return;
      }
      mapRef.current.fitToCoordinates(
        points.map(p => ({
          latitude: p.latitude,
          longitude: p.longitude,
        })),
        {
          edgePadding: {top: 100, right: 48, bottom: 280, left: 48},
          animated: true,
        },
      );
    }, []);

    const animateToPassenger = useCallback(
      (
        latitude: number,
        longitude: number,
        duration = 650,
        accuracy: number | null = null,
      ) => {
        if (!mapRef.current || animatingRef.current) {
          return;
        }
        animatingRef.current = true;
        const deltas =
          accuracy != null && accuracy > 100 ? COARSE_DELTAS : FOLLOW_DELTAS;
        mapRef.current.animateToRegion(
          {latitude, longitude, ...deltas},
          duration,
        );
        lastFollowCoords.current = {latitude, longitude};
        setTimeout(() => {
          animatingRef.current = false;
        }, duration + 50);
      },
      [],
    );

    const onRecenter = useCallback(() => {
      if (!coords) {
        if (location.permission !== 'granted') {
          void location.requestPermission();
        } else if (location.services === 'off') {
          location.openLocationSettings();
        }
        return;
      }
      setFollowMode(true);
      animateToPassenger(
        coords.latitude,
        coords.longitude,
        550,
        coords.accuracy,
      );
    }, [animateToPassenger, coords, location]);

    useImperativeHandle(
      ref,
      () => ({
        recenter: onRecenter,
        isFollowing: () => followMode,
        fitPoints,
      }),
      [followMode, onRecenter, fitPoints],
    );

    useEffect(() => {
      if (!fitToMarkers || !markers || markers.length === 0) {
        return;
      }
      const key = markers
        .map(
          m =>
            `${m.kind ?? 'p'}:${m.latitude.toFixed(5)},${m.longitude.toFixed(5)}`,
        )
        .join('|');
      if (key === fittedKey.current) {
        return;
      }
      fittedKey.current = key;
      setFollowMode(false);
      const t = setTimeout(() => fitPoints(markers), 350);
      return () => clearTimeout(t);
    }, [fitToMarkers, markers, fitPoints]);

    useEffect(() => {
      if (!followUser || fitToMarkers) {
        return;
      }
      if (!locationEnabled || !coords || hasCenteredOnce) {
        return;
      }
      setHasCenteredOnce(true);
      setFollowMode(true);
      animateToPassenger(
        coords.latitude,
        coords.longitude,
        500,
        coords.accuracy,
      );
    }, [
      animateToPassenger,
      coords,
      hasCenteredOnce,
      locationEnabled,
      followUser,
      fitToMarkers,
    ]);

    useEffect(() => {
      if (!followUser || fitToMarkers) {
        return;
      }
      if (!locationEnabled || !followMode || !coords || !hasCenteredOnce) {
        return;
      }
      const prev = lastFollowCoords.current;
      const moved =
        !prev || distanceMeters(prev, coords) >= FOLLOW_MOVE_THRESHOLD_M;
      if (!moved) {
        return;
      }
      animateToPassenger(
        coords.latitude,
        coords.longitude,
        400,
        coords.accuracy,
      );
    }, [
      animateToPassenger,
      coords,
      followMode,
      hasCenteredOnce,
      locationEnabled,
      followUser,
      fitToMarkers,
    ]);

    const onPanDrag = useCallback(() => {
      if (followMode) {
        setFollowMode(false);
      }
    }, [followMode]);

    const showBanner =
      locationEnabled &&
      (location.services === 'off' ||
        location.permission === 'denied' ||
        location.permission === 'blocked' ||
        (!!location.statusMessage && !coords));

    const accuracy =
      coords?.accuracy != null && coords.accuracy > 0 ? coords.accuracy : null;
    const showAccuracyRing =
      hasPermission && accuracy != null && accuracy >= 25 && accuracy <= 250;

    return (
      <View
        style={[
          styles.box,
          fill ? styles.fill : {height},
          fill && styles.fillBox,
        ]}
        accessibilityLabel={label || 'Map'}>
        <MapView
          ref={mapRef}
          style={StyleSheet.absoluteFill}
          provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
          initialRegion={FALLBACK_REGION}
          scrollEnabled
          zoomEnabled
          rotateEnabled={false}
          pitchEnabled={false}
          showsUserLocation={hasPermission}
          showsMyLocationButton={false}
          showsCompass={false}
          toolbarEnabled={false}
          moveOnMarkerPress={false}
          onPanDrag={locationEnabled ? onPanDrag : undefined}>
          {showAccuracyRing && coords ? (
            <Circle
              center={{
                latitude: coords.latitude,
                longitude: coords.longitude,
              }}
              radius={accuracy!}
              strokeWidth={1}
              strokeColor={colors.accuracyStroke}
              fillColor={colors.accuracyFill}
            />
          ) : null}
          {(markers ?? []).map((m, i) => (
            <Marker
              key={`${m.kind ?? 'm'}-${i}-${m.latitude}-${m.longitude}`}
              coordinate={{
                latitude: m.latitude,
                longitude: m.longitude,
              }}
              title={m.title}
              pinColor={
                m.kind === 'dropoff' ? colors.text : colors.primary
              }
            />
          ))}
        </MapView>

        {locationEnabled && showRecenterButton ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Recenter map on my location"
            hitSlop={8}
            onPress={onRecenter}
            style={({pressed}) => [
              styles.recenterBtn,
              {bottom: spacing.md + controlsBottomOffset},
              pressed ? styles.recenterPressed : null,
              followMode && coords ? styles.recenterActive : null,
            ]}>
            <Icon
              name="locate"
              size={20}
              color={
                followMode && coords ? colors.primary : colors.textSecondary
              }
            />
          </Pressable>
        ) : null}

        {showBanner ? (
          <View style={[styles.banner, fill && styles.bannerFill]}>
            <Text style={styles.bannerText}>
              {location.services === 'off'
                ? 'Location is turned off. Enable location to show where you are.'
                : location.statusMessage ||
                  'Allow location to show where you are on the map.'}
            </Text>
            <View style={styles.bannerActions}>
              {location.permission === 'blocked' ? (
                <Pressable onPress={location.openSettings} hitSlop={6}>
                  <Text style={styles.bannerAction}>Open settings</Text>
                </Pressable>
              ) : null}
              {location.permission === 'denied' ? (
                <Pressable
                  onPress={() => void location.requestPermission()}
                  hitSlop={6}>
                  <Text style={styles.bannerAction}>Allow location</Text>
                </Pressable>
              ) : null}
              {location.services === 'off' ? (
                <Pressable onPress={location.openLocationSettings} hitSlop={6}>
                  <Text style={styles.bannerAction}>Enable location</Text>
                </Pressable>
              ) : null}
            </View>
          </View>
        ) : null}

        {showLabel && label && !showBanner && !fill ? (
          <View style={styles.labelChip} pointerEvents="none">
            <Text style={styles.label}>{label}</Text>
          </View>
        ) : null}
      </View>
    );
  },
);

const styles = StyleSheet.create({
  box: {
    borderRadius: radius.lg,
    backgroundColor: colors.mapPlaceholder,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  fill: {flex: 1, width: '100%'},
  fillBox: {borderRadius: 0, borderWidth: 0},
  labelChip: {
    position: 'absolute',
    left: spacing.sm,
    top: spacing.sm,
    backgroundColor: colors.mapOverlay,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
  },
  label: {...typography.caption, color: colors.mapPlaceholderInk},
  recenterBtn: {
    position: 'absolute',
    right: spacing.md,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.glass,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    ...elevation.sm,
  },
  recenterActive: {borderColor: colors.primary},
  recenterPressed: {opacity: 0.88, transform: [{scale: 0.96}]},
  banner: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    top: spacing.md,
    backgroundColor: colors.mapOverlay,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.sm,
    ...elevation.sm,
  },
  bannerFill: {top: spacing.xl + 36},
  bannerText: {
    ...typography.secondary,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  bannerActions: {flexDirection: 'row', gap: spacing.lg},
  bannerAction: {...typography.label, color: colors.primary},
});
