import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  AppState,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {
  MapPlaceholder,
  type MapPoint,
} from '../../components/MapPlaceholder';
import {BottomSheet} from '../../components/ui/Sheet';
import {Button} from '../../components/ui/Button';
import {FloatingMapButton} from '../../components/ui/FloatingMapButton';
import {ErrorState} from '../../components/ui/EmptyState';
import {useAuth} from '../../state/AuthContext';
import {
  cancelRide,
  getDriverLocation,
  getRide,
} from '../../services/ride-api';
import {createTripShare, triggerSos} from '../../services/safety-api';
import {
  canCancelRide,
  formatStatusLabel,
  isActiveRide,
  isTerminalRide,
  type Ride,
} from '../../types/ride';
import {
  formatDistance,
  formatDuration,
  parseApiError,
} from '../../utils/format';
import {colors, radius, spacing, typography} from '../../theme/tokens';
import type {RootStackParamList} from '../../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'ActiveRide'>;

export function ActiveRideScreen({route, navigation}: Props) {
  const {rideId} = route.params;
  const insets = useSafeAreaInsets();
  const {session} = useAuth();
  const [ride, setRide] = useState<Ride | null>(null);
  const [driverLoc, setDriverLoc] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const completedNav = useRef(false);

  const searching =
    !!ride &&
    (ride.status === 'REQUESTED' || ride.status === 'SEARCHING_DRIVER');
  const tracking =
    !!ride &&
    isActiveRide(ride.status) &&
    !searching &&
    !!ride.driverUserId;

  const load = useCallback(async () => {
    if (!session) {
      return;
    }
    try {
      const data = await getRide(session.accessToken, rideId);
      setRide(data);
      setError(null);
      if (data.status === 'RIDE_COMPLETED' && !completedNav.current) {
        completedNav.current = true;
        navigation.replace('Rating', {rideId: data.id});
      }
    } catch (e) {
      setError(parseApiError(e));
    }
  }, [session, rideId, navigation]);

  const loadDriver = useCallback(async () => {
    if (!session || !tracking) {
      return;
    }
    try {
      const loc = await getDriverLocation(session.accessToken, rideId);
      setDriverLoc({lat: loc.lat, lng: loc.lng});
    } catch {
      /* quiet — driver may not have pinged yet */
    }
  }, [session, rideId, tracking]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!ride || isTerminalRide(ride.status)) {
      return;
    }
    const id = setInterval(() => void load(), 4000);
    return () => clearInterval(id);
  }, [ride?.status, load]);

  useEffect(() => {
    if (!tracking) {
      return;
    }
    void loadDriver();
    const id = setInterval(() => void loadDriver(), 3000);
    return () => clearInterval(id);
  }, [tracking, loadDriver]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', next => {
      if (next === 'active') {
        void load();
        void loadDriver();
      }
    });
    return () => sub.remove();
  }, [load, loadDriver]);

  async function onCancel() {
    if (!session || !ride) {
      return;
    }
    Alert.alert('Cancel this request?', 'This cannot be undone.', [
      {text: 'Keep', style: 'cancel'},
      {
        text: 'Cancel request',
        style: 'destructive',
        onPress: async () => {
          setBusy(true);
          try {
            setRide(await cancelRide(session.accessToken, ride.id));
          } catch (e) {
            Alert.alert('Couldn’t cancel', parseApiError(e));
          } finally {
            setBusy(false);
          }
        },
      },
    ]);
  }

  function onSos() {
    if (!session || !ride) {
      return;
    }
    Alert.alert(
      'Emergency SOS',
      'This alerts safety operations for your active trip.',
      [
        {text: 'Not now', style: 'cancel'},
        {
          text: 'Send SOS',
          style: 'destructive',
          onPress: async () => {
            setBusy(true);
            try {
              await triggerSos(session.accessToken, ride.id);
              Alert.alert('SOS sent', 'Help has been notified.');
            } catch (e) {
              Alert.alert('SOS failed', parseApiError(e));
            } finally {
              setBusy(false);
            }
          },
        },
      ],
    );
  }

  async function onShare() {
    if (!session || !ride) {
      return;
    }
    setBusy(true);
    try {
      await createTripShare(session.accessToken, ride.id);
      Alert.alert(
        'Trip share ready',
        'A live share link was created for a trusted contact.',
      );
    } catch (e) {
      Alert.alert('Share failed', parseApiError(e));
    } finally {
      setBusy(false);
    }
  }

  const markers = useMemo(() => {
    if (!ride) {
      return undefined;
    }
    const list: MapPoint[] = [];
    if (searching) {
      list.push({
        latitude: ride.pickupLat,
        longitude: ride.pickupLng,
        title: ride.pickupAddress ?? 'You',
        kind: 'pickup',
      });
      return list;
    }
    list.push({
      latitude: ride.pickupLat,
      longitude: ride.pickupLng,
      title: ride.pickupAddress ?? 'Pickup',
      kind: 'pickup',
    });
    list.push({
      latitude: ride.dropoffLat,
      longitude: ride.dropoffLng,
      title: ride.dropoffAddress ?? 'Destination',
      kind: 'dropoff',
    });
    if (driverLoc) {
      list.push({
        latitude: driverLoc.lat,
        longitude: driverLoc.lng,
        title: 'Driver',
        kind: 'driver',
      });
    }
    return list;
  }, [ride, searching, driverLoc]);

  const vehicleLabel =
    ride?.vehicleTypeRequested === 'ECONOMY'
      ? 'Bike'
      : ride?.vehicleTypeRequested === 'COMFORT'
        ? 'Car Lite'
        : ride?.vehicleTypeRequested === 'XL'
          ? 'Car'
          : ride?.vehicleTypeRequested;

  if (error && !ride) {
    return (
      <View style={[styles.root, {padding: spacing.lg, paddingTop: insets.top}]}>
        <ErrorState title="Unable to load trip" message={error} onRetry={load} />
        <Button label="Back" variant="ghost" onPress={() => navigation.goBack()} />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <MapPlaceholder
        fill
        locationEnabled={!!ride && isActiveRide(ride.status)}
        showLabel={false}
        showRecenterButton={false}
        followUser={false}
        fitToMarkers={!!markers?.length}
        showRoute={!searching && !!markers && markers.length >= 2}
        searchingStyle={searching}
        showsUserLocation={!searching}
        markers={markers}
      />

      <View style={[styles.top, {paddingTop: insets.top + spacing.sm}]}>
        <FloatingMapButton
          icon="chevronRight"
          accessibilityLabel="Go back"
          onPress={() => navigation.goBack()}
          style={styles.backFlip}
        />
      </View>

      <View style={styles.sheetWrap} pointerEvents="box-none">
        <BottomSheet floating>
          {!ride ? (
            <Text style={styles.quiet}>Loading your trip…</Text>
          ) : searching ? (
            <View style={styles.searching}>
              <View style={styles.searchRow}>
                <ActivityIndicator color={colors.primary} size="large" />
                <Text style={styles.searchTitle}>
                  Searching for {vehicleLabel ?? 'ride'}…
                </Text>
              </View>
              <Button
                label="CANCEL REQUEST"
                variant="ghost"
                onPress={onCancel}
                loading={busy}
                style={styles.cancelBtn}
              />
            </View>
          ) : (
            <>
              <Text style={styles.status}>{formatStatusLabel(ride.status)}</Text>

              {ride.tripPin ? (
                <View style={styles.pin}>
                  <Text style={styles.pinLabel}>Your PIN</Text>
                  <Text style={styles.pinValue}>{ride.tripPin}</Text>
                </View>
              ) : null}

              <View style={styles.locBlock}>
                <Text style={styles.locLabel}>Pickup</Text>
                <Text style={styles.locValue} numberOfLines={1}>
                  {ride.pickupAddress ?? 'Current location'}
                </Text>
                <Text style={styles.locLabel}>Destination</Text>
                <Text style={styles.locValue} numberOfLines={1}>
                  {ride.dropoffAddress ?? 'Destination'}
                </Text>
              </View>

              <View style={styles.metaRow}>
                {vehicleLabel ? (
                  <Text style={styles.meta}>{vehicleLabel}</Text>
                ) : null}
                {ride.distanceM != null ? (
                  <Text style={styles.meta}>
                    · {formatDistance(ride.distanceM)}
                  </Text>
                ) : null}
                {ride.durationS != null ? (
                  <Text style={styles.meta}>
                    · ~{formatDuration(ride.durationS)}
                  </Text>
                ) : null}
              </View>

              <Text style={styles.trackHint}>
                {driverLoc
                  ? 'Live: driver location on the map'
                  : 'Waiting for driver location…'}
              </Text>

              {isActiveRide(ride.status) ? (
                <View style={styles.actions}>
                  <Button
                    label="Share trip"
                    variant="secondary"
                    onPress={onShare}
                    loading={busy}
                    style={styles.flex}
                  />
                  <Button
                    label="SOS"
                    variant="danger"
                    onPress={onSos}
                    loading={busy}
                    style={styles.flex}
                  />
                </View>
              ) : null}
              {canCancelRide(ride.status) ? (
                <Button
                  label="CANCEL REQUEST"
                  variant="ghost"
                  onPress={onCancel}
                  loading={busy}
                />
              ) : null}
              {isTerminalRide(ride.status) &&
              ride.status !== 'RIDE_COMPLETED' ? (
                <Button
                  label="Back to home"
                  onPress={() => navigation.navigate('Main')}
                />
              ) : null}
            </>
          )}
        </BottomSheet>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {flex: 1, backgroundColor: colors.background},
  top: {
    position: 'absolute',
    left: 0,
    right: 0,
    paddingHorizontal: spacing.md,
    zIndex: 2,
  },
  backFlip: {transform: [{rotate: '180deg'}], alignSelf: 'flex-start'},
  sheetWrap: {position: 'absolute', left: 0, right: 0, bottom: 0},
  quiet: {...typography.body, color: colors.textMuted},
  searching: {gap: spacing.lg, paddingVertical: spacing.sm},
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  searchTitle: {...typography.section, color: colors.text, flex: 1},
  cancelBtn: {minHeight: 48},
  status: {...typography.section, color: colors.text},
  pin: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.primaryMuted,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
  },
  pinLabel: {...typography.label, color: colors.textMuted},
  pinValue: {...typography.numeric, color: colors.primary},
  locBlock: {gap: 4},
  locLabel: {...typography.caption, color: colors.textMuted},
  locValue: {...typography.bodyStrong, color: colors.text},
  metaRow: {flexDirection: 'row', flexWrap: 'wrap', gap: 4},
  meta: {...typography.secondary, color: colors.textMuted},
  trackHint: {...typography.caption, color: colors.primary, fontWeight: '600'},
  actions: {flexDirection: 'row', gap: spacing.sm},
  flex: {flex: 1},
});
