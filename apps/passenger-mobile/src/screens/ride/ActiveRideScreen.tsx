import React, {useCallback, useEffect, useRef, useState} from 'react';
import {Alert, AppState, StyleSheet, Text, View} from 'react-native';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {MapPlaceholder} from '../../components/MapPlaceholder';
import {BottomSheet} from '../../components/ui/Sheet';
import {Button} from '../../components/ui/Button';
import {FloatingMapButton} from '../../components/ui/FloatingMapButton';
import {LocationRow} from '../../components/ui/LocationRow';
import {AnimatedStatus} from '../../components/ui/AnimatedStatus';
import {ErrorState} from '../../components/ui/EmptyState';
import {useAuth} from '../../state/AuthContext';
import {cancelRide, getRide} from '../../services/ride-api';
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
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const completedNav = useRef(false);

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
    const sub = AppState.addEventListener('change', next => {
      if (next === 'active') {
        void load();
      }
    });
    return () => sub.remove();
  }, [load]);

  async function onCancel() {
    if (!session || !ride) {
      return;
    }
    Alert.alert('Cancel this ride?', 'This cannot be undone.', [
      {text: 'Keep ride', style: 'cancel'},
      {
        text: 'Cancel',
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
      const share = await createTripShare(session.accessToken, ride.id);
      Alert.alert(
        'Trip share ready',
        'A live share link was created. Open it from Safety or share it with a trusted contact.',
      );
      if (__DEV__) {
        // eslint-disable-next-line no-console
        console.info('[trip-share]', share.sharePath);
      }
    } catch (e) {
      Alert.alert('Share failed', parseApiError(e));
    } finally {
      setBusy(false);
    }
  }

  if (error && !ride) {
    return (
      <View style={[styles.root, {padding: spacing.lg, paddingTop: insets.top}]}>
        <ErrorState title="Unable to load trip" message={error} onRetry={load} />
        <Button label="Back" variant="ghost" onPress={() => navigation.goBack()} />
      </View>
    );
  }

  const vehicleLabel =
    ride?.vehicleTypeRequested === 'ECONOMY'
      ? 'Economy'
      : ride?.vehicleTypeRequested === 'COMFORT'
        ? 'Comfort'
        : ride?.vehicleTypeRequested === 'XL'
          ? 'XL'
          : ride?.vehicleTypeRequested;

  const markers =
    ride != null
      ? [
          {
            latitude: ride.pickupLat,
            longitude: ride.pickupLng,
            title: 'Pickup',
            kind: 'pickup' as const,
          },
          {
            latitude: ride.dropoffLat,
            longitude: ride.dropoffLng,
            title: ride.dropoffAddress ?? 'Destination',
            kind: 'dropoff' as const,
          },
        ]
      : undefined;

  return (
    <View style={styles.root}>
      <MapPlaceholder
        fill
        locationEnabled={!!ride && isActiveRide(ride.status)}
        showLabel={false}
        showRecenterButton={false}
        followUser={!ride}
        fitToMarkers={!!ride}
        markers={markers}
      />

      <View style={styles.edgeBottom} pointerEvents="none" />

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
          ) : (
            <>
              <AnimatedStatus text={formatStatusLabel(ride.status)} />

              {ride.tripPin ? (
                <View style={styles.pin}>
                  <Text style={styles.pinLabel}>Your PIN</Text>
                  <Text style={styles.pinValue}>{ride.tripPin}</Text>
                </View>
              ) : null}

              <LocationRow
                compact
                pickupLabel={ride.pickupAddress ?? 'Current location'}
                destinationLabel={ride.dropoffAddress ?? 'Destination'}
              />

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

              <View style={styles.driver}>
                <Text style={styles.driverTitle}>
                  {ride.status === 'SEARCHING_DRIVER' ||
                  ride.status === 'REQUESTED'
                    ? 'Looking for a nearby driver'
                    : ride.driverUserId
                      ? 'Driver assigned'
                      : 'Looking for a nearby driver'}
                </Text>
                <Text style={styles.driverSub}>
                  {ride.status === 'SEARCHING_DRIVER' ||
                  ride.status === 'REQUESTED'
                    ? 'Hang tight — we’ll update this when someone accepts'
                    : ride.driverUserId
                      ? 'Driver and vehicle details appear when available'
                      : 'Hang tight — we’ll update this when someone accepts'}
                </Text>
              </View>

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
                  label="Cancel ride"
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
  edgeBottom: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 140,
    backgroundColor: 'rgba(11, 13, 18, 0.2)',
  },
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
  metaRow: {flexDirection: 'row', flexWrap: 'wrap', gap: 4},
  meta: {...typography.secondary, color: colors.textMuted},
  driver: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    paddingTop: spacing.md,
    gap: 4,
  },
  driverTitle: {...typography.cardTitle, color: colors.text},
  driverSub: {...typography.caption, color: colors.textMuted, lineHeight: 18},
  actions: {flexDirection: 'row', gap: spacing.sm},
  flex: {flex: 1},
});
