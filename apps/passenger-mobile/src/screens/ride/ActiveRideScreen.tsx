import React, {useCallback, useEffect, useState} from 'react';
import {Alert, StyleSheet, Text, View} from 'react-native';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {Screen} from '../../components/ui/Screen';
import {Card} from '../../components/ui/Card';
import {Button} from '../../components/ui/Button';
import {MapPlaceholder} from '../../components/MapPlaceholder';
import {StatusChip} from '../../components/ui/StatusChip';
import {ErrorState} from '../../components/ui/EmptyState';
import {useAuth} from '../../state/AuthContext';
import {cancelRide, getRide} from '../../services/ride-api';
import {createTripShare, triggerSos} from '../../services/safety-api';
import {
  canCancelRide,
  isActiveRide,
  type Ride,
} from '../../types/ride';
import {
  formatDistance,
  formatDuration,
  parseApiError,
} from '../../utils/format';
import {colors, spacing, typography} from '../../theme/tokens';
import type {RootStackParamList} from '../../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'ActiveRide'>;

export function ActiveRideScreen({route, navigation}: Props) {
  const {rideId} = route.params;
  const {session} = useAuth();
  const [ride, setRide] = useState<Ride | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [sharePath, setSharePath] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!session) return;
    try {
      const data = await getRide(session.accessToken, rideId);
      setRide(data);
      setError(null);
      if (data.status === 'RIDE_COMPLETED') {
        navigation.replace('Rating', {rideId: data.id});
      }
    } catch (e) {
      setError(parseApiError(e));
    }
  }, [session, rideId, navigation]);

  useEffect(() => {
    void load();
    const id = setInterval(() => void load(), 4000);
    return () => clearInterval(id);
  }, [load]);

  async function onCancel() {
    if (!session || !ride) return;
    Alert.alert('Cancel ride?', 'This cannot be undone.', [
      {text: 'Keep ride', style: 'cancel'},
      {
        text: 'Cancel ride',
        style: 'destructive',
        onPress: async () => {
          setBusy(true);
          try {
            const updated = await cancelRide(session.accessToken, ride.id);
            setRide(updated);
          } catch (e) {
            Alert.alert('Cancel failed', parseApiError(e));
          } finally {
            setBusy(false);
          }
        },
      },
    ]);
  }

  function onSos() {
    if (!session || !ride) return;
    Alert.alert(
      'Emergency SOS',
      'This alerts safety operations for your active trip. Continue only if you need help.',
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
    if (!session || !ride) return;
    setBusy(true);
    try {
      const share = await createTripShare(session.accessToken, ride.id);
      setSharePath(share.sharePath);
      Alert.alert('Trip share created', share.sharePath);
    } catch (e) {
      Alert.alert('Share failed', parseApiError(e));
    } finally {
      setBusy(false);
    }
  }

  if (error && !ride) {
    return (
      <Screen title="Trip">
        <ErrorState message={error} onRetry={load} />
      </Screen>
    );
  }

  if (!ride) {
    return (
      <Screen title="Trip">
        <Text style={styles.meta}>Loading trip…</Text>
      </Screen>
    );
  }

  return (
    <Screen scroll title="Your trip" subtitle={ride.id.slice(0, 8)}>
      <MapPlaceholder
        label={
          isActiveRide(ride.status) ? 'Live trip map placeholder' : 'Trip map'
        }
        height={200}
      />

      <Card>
        <StatusChip status={ride.status} />
        {ride.status === 'SEARCHING_DRIVER' ? (
          <Text style={styles.pin}>Looking for a nearby driver…</Text>
        ) : null}
        {ride.status === 'NO_DRIVER_FOUND' ? (
          <Text style={styles.warn}>No drivers were available for this request.</Text>
        ) : null}
        {ride.status === 'EXPIRED' ? (
          <Text style={styles.warn}>Search timed out. Please book again.</Text>
        ) : null}
        {ride.status === 'CANCELLED_BY_PASSENGER' ||
        ride.status === 'CANCELLED_BY_DRIVER' ? (
          <Text style={styles.warn}>This trip was cancelled.</Text>
        ) : null}
        {ride.tripPin ? (
          <Text style={styles.pin}>Trip PIN {ride.tripPin}</Text>
        ) : null}
        <Text style={styles.line}>
          From: {ride.pickupAddress ?? `${ride.pickupLat}, ${ride.pickupLng}`}
        </Text>
        <Text style={styles.line}>
          To: {ride.dropoffAddress ?? `${ride.dropoffLat}, ${ride.dropoffLng}`}
        </Text>
        <Text style={styles.meta}>
          {formatDistance(ride.distanceM)} · {formatDuration(ride.durationS)}
        </Text>
        <Text style={styles.meta}>
          Payment: {ride.paymentMethod} · {ride.paymentStatus}
        </Text>
        <Text style={styles.meta}>
          Driver: {ride.driverUserId ? ride.driverUserId.slice(0, 8) + '…' : '—'}
        </Text>
        <Text style={styles.meta}>
          Vehicle: {ride.vehicleId ? ride.vehicleId.slice(0, 8) + '…' : '—'} ·{' '}
          {ride.vehicleTypeRequested}
        </Text>
      </Card>

      <View style={styles.actions}>
        {canCancelRide(ride.status) ? (
          <Button
            label="Cancel ride"
            variant="ghost"
            onPress={onCancel}
            loading={busy}
          />
        ) : null}
        {isActiveRide(ride.status) ? (
          <>
            <Button label="SOS" variant="danger" onPress={onSos} loading={busy} />
            <Button
              label="Share trip"
              variant="secondary"
              onPress={onShare}
              loading={busy}
            />
          </>
        ) : null}
        <Button
          label="Support"
          variant="ghost"
          onPress={() => navigation.navigate('Support')}
        />
        {sharePath ? (
          <Text style={styles.meta}>Share link path: {sharePath}</Text>
        ) : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  meta: {...typography.caption, color: colors.inkSoft},
  line: {...typography.body, color: colors.ink},
  pin: {...typography.subtitle, color: colors.accent},
  warn: {...typography.body, color: colors.danger},
  actions: {gap: spacing.sm},
});
