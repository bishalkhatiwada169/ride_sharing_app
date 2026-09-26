import React, {useCallback, useEffect, useState} from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {useIsFocused, type CompositeScreenProps} from '@react-navigation/native';
import type {BottomTabScreenProps} from '@react-navigation/bottom-tabs';
import {Screen} from '../../components/ui/Screen';
import {EmptyState, ErrorState} from '../../components/ui/EmptyState';
import {SkeletonCard} from '../../components/ui/Skeleton';
import {useAuth} from '../../state/AuthContext';
import {getRide, listRides} from '../../services/ride-api';
import {formatDistance, parseApiError} from '../../utils/format';
import {formatStatusLabel, type Ride} from '../../types/ride';
import {colors, spacing, typography} from '../../theme/tokens';
import type {MainTabParamList, RootStackParamList} from '../../navigation/types';

type HistoryProps = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, 'History'>,
  NativeStackScreenProps<RootStackParamList>
>;

function formatTripDate(iso: string | null): string {
  if (!iso) {
    return 'Trip';
  }
  return new Date(iso)
    .toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
    })
    .toUpperCase();
}

function TripRow({
  ride,
  onPress,
}: {
  ride: Ride;
  onPress: () => void;
}) {
  const completed = ride.status === 'RIDE_COMPLETED';
  return (
    <Pressable
      onPress={onPress}
      style={({pressed}) => [styles.trip, pressed && styles.pressed]}>
      <Text style={styles.date}>{formatTripDate(ride.requestedAt)}</Text>

      <View style={styles.route}>
        <View style={styles.rail}>
          <View style={styles.dotPickup} />
          <View style={styles.line} />
          <View style={styles.dotDrop} />
        </View>
        <View style={styles.routeCopy}>
          <Text style={styles.place} numberOfLines={1}>
            {ride.pickupAddress ?? 'Pickup'}
          </Text>
          <Text style={[styles.place, styles.dest]} numberOfLines={1}>
            {ride.dropoffAddress ?? 'Destination'}
          </Text>
        </View>
      </View>

      <View style={styles.footer}>
        <Text
          style={[
            styles.status,
            completed && styles.statusDone,
            ride.status.startsWith('CANCEL') && styles.statusCancel,
          ]}>
          {formatStatusLabel(ride.status)}
        </Text>
        <Text style={styles.meta}>{formatDistance(ride.distanceM)}</Text>
      </View>
    </Pressable>
  );
}

export function HistoryScreen({navigation}: HistoryProps) {
  const focused = useIsFocused();
  const {session} = useAuth();
  const [rides, setRides] = useState<Ride[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!session) {
      return;
    }
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
    if (focused) {
      void load();
    }
  }, [focused, load]);

  return (
    <Screen
      scroll
      title="Your trips"
      refreshing={loading && rides.length > 0}
      onRefresh={load}>
      {error ? (
        <ErrorState message={error} onRetry={load} />
      ) : loading && rides.length === 0 ? (
        <>
          <SkeletonCard />
          <SkeletonCard />
        </>
      ) : rides.length === 0 ? (
        <EmptyState
          title="No trips yet"
          message="Your trips will appear here."
          actionLabel="Where to?"
          onAction={() => navigation.navigate('DestinationSearch')}
          icon="car"
        />
      ) : (
        <View style={styles.list}>
          {rides.map(r => (
            <TripRow
              key={r.id}
              ride={r}
              onPress={() =>
                navigation.navigate('RideDetail', {rideId: r.id})
              }
            />
          ))}
        </View>
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
    if (!session) {
      return;
    }
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
      <Screen title="Trip">
        <ErrorState message={error} />
      </Screen>
    );
  }
  if (!ride) {
    return (
      <Screen title="Trip">
        <SkeletonCard />
      </Screen>
    );
  }

  return (
    <Screen scroll title="Trip" subtitle={formatStatusLabel(ride.status)}>
      <View style={styles.detail}>
        <Text style={styles.date}>{formatTripDate(ride.requestedAt)}</Text>
        <View style={styles.route}>
          <View style={styles.rail}>
            <View style={styles.dotPickup} />
            <View style={styles.line} />
            <View style={styles.dotDrop} />
          </View>
          <View style={styles.routeCopy}>
            <Text style={styles.placeLabel}>Pickup</Text>
            <Text style={styles.place}>{ride.pickupAddress ?? 'Pickup'}</Text>
            <Text style={[styles.placeLabel, styles.destGap]}>Destination</Text>
            <Text style={styles.place}>
              {ride.dropoffAddress ?? 'Destination'}
            </Text>
          </View>
        </View>
        <Text style={styles.meta}>
          {formatDistance(ride.distanceM)}
          {ride.vehicleTypeRequested ? ` · ${ride.vehicleTypeRequested}` : ''}
        </Text>
      </View>
      {ride.status === 'RIDE_COMPLETED' ? (
        <Pressable
          onPress={() => navigation.navigate('Rating', {rideId: ride.id})}>
          <Text style={styles.link}>Rate this trip</Text>
        </Pressable>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: {gap: spacing.lg},
  trip: {
    gap: spacing.sm,
    paddingBottom: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  pressed: {opacity: 0.88},
  date: {
    ...typography.label,
    color: colors.textMuted,
    letterSpacing: 1.2,
  },
  route: {flexDirection: 'row', gap: spacing.md},
  rail: {width: 12, alignItems: 'center', paddingTop: 6},
  dotPickup: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  line: {
    width: 1,
    flexGrow: 1,
    minHeight: 16,
    backgroundColor: colors.borderStrong,
    marginVertical: 4,
  },
  dotDrop: {
    width: 8,
    height: 8,
    borderRadius: 2,
    backgroundColor: colors.text,
  },
  routeCopy: {flex: 1, gap: 10},
  place: {...typography.bodyStrong, color: colors.text},
  dest: {marginTop: 2},
  placeLabel: {...typography.caption, color: colors.textMuted},
  destGap: {marginTop: spacing.sm},
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
  },
  status: {...typography.secondary, color: colors.textSecondary},
  statusDone: {color: colors.success},
  statusCancel: {color: colors.error},
  meta: {...typography.secondary, color: colors.textMuted},
  detail: {gap: spacing.md},
  link: {
    ...typography.bodyStrong,
    color: colors.primary,
    marginTop: spacing.sm,
  },
});
