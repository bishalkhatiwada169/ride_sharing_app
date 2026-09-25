import React, {useCallback, useEffect, useState} from 'react';
import {Pressable, StyleSheet, Text} from 'react-native';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {Screen} from '../../components/ui/Screen';
import {Card} from '../../components/ui/Card';
import {StatusChip} from '../../components/ui/StatusChip';
import {EmptyState, ErrorState} from '../../components/ui/EmptyState';
import {useAuth} from '../../state/AuthContext';
import {getRide, listRides} from '../../services/ride-api';
import {formatDistance, parseApiError} from '../../utils/format';
import type {Ride} from '../../types/ride';
import {colors, typography} from '../../theme/tokens';
import type {MainTabParamList, RootStackParamList} from '../../navigation/types';
import type {CompositeScreenProps} from '@react-navigation/native';
import type {BottomTabScreenProps} from '@react-navigation/bottom-tabs';

type HistoryProps = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, 'History'>,
  NativeStackScreenProps<RootStackParamList>
>;

export function HistoryScreen({navigation}: HistoryProps) {
  const {session} = useAuth();
  const [rides, setRides] = useState<Ride[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!session) return;
    setError(null);
    try {
      setRides(await listRides(session.accessToken));
    } catch (e) {
      setError(parseApiError(e));
    } finally {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <Screen
      scroll
      title="History"
      subtitle="Your trips"
      refreshing={loading}
      onRefresh={load}>
      {error ? (
        <ErrorState message={error} onRetry={load} />
      ) : rides.length === 0 && !loading ? (
        <EmptyState
          title="No rides yet"
          message="Book a trip from Home to see it here."
          actionLabel="Book"
          onAction={() => navigation.navigate('Booking')}
        />
      ) : (
        rides.map(r => (
          <Pressable
            key={r.id}
            onPress={() => navigation.navigate('RideDetail', {rideId: r.id})}>
            <Card>
              <StatusChip status={r.status} />
              <Text style={styles.line}>
                {r.pickupAddress ?? 'Pickup'} → {r.dropoffAddress ?? 'Dropoff'}
              </Text>
              <Text style={styles.meta}>
                {formatDistance(r.distanceM)}
                {r.requestedAt
                  ? ` · ${new Date(r.requestedAt).toLocaleString()}`
                  : ''}
              </Text>
            </Card>
          </Pressable>
        ))
      )}
    </Screen>
  );
}

type DetailProps = NativeStackScreenProps<RootStackParamList, 'RideDetail'>;

export function RideDetailScreen({route, navigation}: DetailProps) {
  const {rideId} = route.params;
  const {session} = useAuth();
  const [ride, setRide] = useState<Ride | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!session) return;
    void (async () => {
      try {
        setRide(await getRide(session.accessToken, rideId));
      } catch (e) {
        setError(parseApiError(e));
      }
    })();
  }, [session, rideId]);

  if (error) {
    return (
      <Screen title="Trip detail">
        <ErrorState message={error} />
      </Screen>
    );
  }
  if (!ride) {
    return (
      <Screen title="Trip detail">
        <Text style={styles.meta}>Loading…</Text>
      </Screen>
    );
  }

  return (
    <Screen scroll title="Trip detail" subtitle={ride.status}>
      <Card>
        <StatusChip status={ride.status} />
        <Text style={styles.line}>{ride.pickupAddress ?? 'Pickup'}</Text>
        <Text style={styles.line}>{ride.dropoffAddress ?? 'Dropoff'}</Text>
        <Text style={styles.meta}>
          {formatDistance(ride.distanceM)} · {ride.paymentMethod} ·{' '}
          {ride.paymentStatus}
        </Text>
        <Text style={styles.meta}>
          Driver {ride.driverUserId?.slice(0, 8) ?? '—'} · Vehicle{' '}
          {ride.vehicleId?.slice(0, 8) ?? '—'}
        </Text>
      </Card>
      {ride.status === 'RIDE_COMPLETED' ? (
        <Pressable onPress={() => navigation.navigate('Rating', {rideId: ride.id})}>
          <Text style={styles.link}>Rate this trip</Text>
        </Pressable>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  line: {...typography.body, color: colors.ink},
  meta: {...typography.caption, color: colors.inkSoft},
  link: {...typography.bodyStrong, color: colors.accent},
});
