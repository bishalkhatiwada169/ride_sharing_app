import React, {useCallback, useEffect, useState} from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import type {CompositeScreenProps} from '@react-navigation/native';
import type {BottomTabScreenProps} from '@react-navigation/bottom-tabs';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {Screen} from '../../components/ui/Screen';
import {Card} from '../../components/ui/Card';
import {Button} from '../../components/ui/Button';
import {MapPlaceholder} from '../../components/MapPlaceholder';
import {StatusChip} from '../../components/ui/StatusChip';
import {EmptyState, ErrorState} from '../../components/ui/EmptyState';
import {useAuth} from '../../state/AuthContext';
import {listRides} from '../../services/ride-api';
import {formatDistance, parseApiError} from '../../utils/format';
import {isActiveRide, type Ride} from '../../types/ride';
import {colors, spacing, typography} from '../../theme/tokens';
import type {MainTabParamList, RootStackParamList} from '../../navigation/types';

type Props = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, 'Home'>,
  NativeStackScreenProps<RootStackParamList>
>;

export function HomeScreen({navigation}: Props) {
  const {session} = useAuth();
  const [rides, setRides] = useState<Ride[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!session) {
      return;
    }
    setError(null);
    try {
      const data = await listRides(session.accessToken);
      setRides(data);
    } catch (e) {
      setError(parseApiError(e));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [session]);

  useEffect(() => {
    void load();
  }, [load]);

  const active = rides.find(r => isActiveRide(r.status));
  const recent = rides.filter(r => !isActiveRide(r.status)).slice(0, 5);
  const greeting =
    session?.user.displayName || session?.user.phoneE164 || 'Passenger';

  return (
    <Screen
      scroll
      title={`Hi, ${greeting}`}
      subtitle="Where are you heading?"
      refreshing={refreshing}
      onRefresh={() => {
        setRefreshing(true);
        void load();
      }}
      right={
        <Pressable onPress={() => navigation.navigate('Safety')}>
          <Text style={styles.sosLink}>SOS</Text>
        </Pressable>
      }>
      <MapPlaceholder label="Your area" height={200} />

      {active ? (
        <Card>
          <Text style={styles.cardTitle}>Active trip</Text>
          <StatusChip status={active.status} />
          <Text style={styles.meta}>
            {active.pickupAddress ?? 'Pickup'} →{' '}
            {active.dropoffAddress ?? 'Dropoff'}
          </Text>
          <Button
            label="Open trip"
            onPress={() =>
              navigation.navigate('ActiveRide', {rideId: active.id})
            }
          />
        </Card>
      ) : (
        <Card>
          <Text style={styles.where}>Where to?</Text>
          <Text style={styles.meta}>
            Set pickup and destination to get a fare from the server.
          </Text>
          <Button
            label="Book a ride"
            onPress={() => navigation.navigate('Booking')}
          />
        </Card>
      )}

      <View style={styles.row}>
        <Button
          label="Safety"
          variant="secondary"
          style={styles.half}
          onPress={() => navigation.navigate('Safety')}
        />
        <Button
          label="Profile"
          variant="ghost"
          style={styles.half}
          onPress={() => navigation.navigate('Profile')}
        />
      </View>

      <Text style={styles.section}>Recent</Text>
      {loading && rides.length === 0 ? (
        <Text style={styles.meta}>Loading…</Text>
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : recent.length === 0 ? (
        <EmptyState
          title="No trips yet"
          message="Your completed and cancelled rides will show up here."
        />
      ) : (
        recent.map(r => (
          <Pressable
            key={r.id}
            onPress={() => navigation.navigate('RideDetail', {rideId: r.id})}>
            <Card>
              <StatusChip status={r.status} />
              <Text style={styles.meta}>
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

const styles = StyleSheet.create({
  where: {...typography.subtitle, color: colors.ink},
  cardTitle: {...typography.bodyStrong, color: colors.ink},
  meta: {...typography.caption, color: colors.inkSoft},
  section: {...typography.label, color: colors.inkSoft, marginTop: spacing.sm},
  row: {flexDirection: 'row', gap: spacing.sm},
  half: {flex: 1},
  sosLink: {...typography.bodyStrong, color: colors.danger},
});
