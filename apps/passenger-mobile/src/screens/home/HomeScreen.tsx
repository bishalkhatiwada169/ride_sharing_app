import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {
  AppState,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  useIsFocused,
  type CompositeScreenProps,
} from '@react-navigation/native';
import type {BottomTabScreenProps} from '@react-navigation/bottom-tabs';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {BrandMark} from '../../components/ui/BrandMark';
import {Icon} from '../../components/ui/Icon';
import {useAuth} from '../../state/AuthContext';
import {usePassengerLocation} from '../../hooks/usePassengerLocation';
import {listRides} from '../../services/ride-api';
import {parseApiError} from '../../utils/format';
import {formatStatusLabel, isActiveRide, type Ride} from '../../types/ride';
import {
  colors,
  elevation,
  radius,
  spacing,
  typography,
} from '../../theme/tokens';
import type {MainTabParamList, RootStackParamList} from '../../navigation/types';

type Props = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, 'Home'>,
  NativeStackScreenProps<RootStackParamList>
>;

type RecentPlace = {
  key: string;
  label: string;
  lat: number;
  lng: number;
};

export function HomeScreen({navigation}: Props) {
  const focused = useIsFocused();
  const insets = useSafeAreaInsets();
  const {session} = useAuth();
  const location = usePassengerLocation(focused);
  const [rides, setRides] = useState<Ride[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!session) {
      return;
    }
    try {
      setRides(await listRides(session.accessToken));
      setError(null);
    } catch (e) {
      setError(parseApiError(e));
    }
  }, [session]);

  useEffect(() => {
    if (focused) {
      void load();
    }
  }, [focused, load]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', next => {
      if (next === 'active') {
        void load();
      }
    });
    return () => sub.remove();
  }, [load]);

  const active = rides.find(r => isActiveRide(r.status));
  const needsRating = rides.find(r => r.status === 'RIDE_COMPLETED');

  const nearLabel = useMemo(() => {
    if (location.coords) {
      return 'Current location';
    }
    return 'Finding your location…';
  }, [location.coords]);

  const recentPlaces = useMemo(() => {
    const seen = new Set<string>();
    const places: RecentPlace[] = [];
    for (const r of rides) {
      const label = r.dropoffAddress?.trim();
      if (!label || seen.has(label.toLowerCase())) {
        continue;
      }
      seen.add(label.toLowerCase());
      places.push({
        key: r.id,
        label,
        lat: r.dropoffLat,
        lng: r.dropoffLng,
      });
      if (places.length >= 3) {
        break;
      }
    }
    return places;
  }, [rides]);

  const openSearch = useCallback(
    (vehicle?: 'ECONOMY' | 'COMFORT') => {
      navigation.navigate(
        'DestinationSearch',
        vehicle ? {preferredVehicle: vehicle} : undefined,
      );
    },
    [navigation],
  );

  const openBooking = useCallback(
    (vehicle: 'ECONOMY' | 'COMFORT', place?: RecentPlace) => {
      if (place) {
        navigation.navigate('Booking', {
          destinationLabel: place.label,
          dropoffLat: place.lat,
          dropoffLng: place.lng,
          preferredVehicle: vehicle,
        });
        return;
      }
      openSearch(vehicle);
    },
    [navigation, openSearch],
  );

  return (
    <View style={[styles.root, {paddingTop: insets.top}]}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <BrandMark size="lg" />
        </View>

        <Pressable
          onPress={() => openSearch()}
          style={({pressed}) => [styles.nearRow, pressed && styles.pressed]}>
          <View style={styles.nearCopy}>
            <Text style={styles.nearEyebrow}>You are near</Text>
            <Text style={styles.nearValue} numberOfLines={1}>
              {nearLabel}
            </Text>
          </View>
          <Icon name="chevronRight" size={18} color={colors.textMuted} />
        </Pressable>

        <View style={styles.services}>
          <Pressable
            onPress={() => openBooking('ECONOMY')}
            style={({pressed}) => [
              styles.serviceCard,
              pressed && styles.pressed,
            ]}>
            <View style={[styles.serviceArt, styles.bikeArt]}>
              <Icon name="locate" size={28} color={colors.primary} />
            </View>
            <Text style={styles.serviceLabel}>Bike</Text>
          </Pressable>
          <Pressable
            onPress={() => openBooking('COMFORT')}
            style={({pressed}) => [
              styles.serviceCard,
              pressed && styles.pressed,
            ]}>
            <View style={[styles.serviceArt, styles.carArt]}>
              <Icon name="car" size={28} color={colors.primary} />
            </View>
            <Text style={styles.serviceLabel}>Car</Text>
          </Pressable>
        </View>

        <Pressable
          onPress={() => openSearch()}
          style={({pressed}) => [styles.whereCard, pressed && styles.pressed]}>
          <Icon name="search" size={20} color={colors.primary} />
          <Text style={styles.whereText}>Where are you going?</Text>
        </Pressable>

        {active || needsRating ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Ongoing</Text>
            {active ? (
              <Pressable
                onPress={() =>
                  navigation.navigate('ActiveRide', {rideId: active.id})
                }
                style={({pressed}) => [
                  styles.ongoingCard,
                  pressed && styles.pressed,
                ]}>
                <View style={styles.ongoingIcon}>
                  <Icon name="car" size={18} color={colors.textOnPrimary} />
                </View>
                <View style={styles.ongoingCopy}>
                  <Text style={styles.ongoingTitle}>
                    {formatStatusLabel(active.status)}
                  </Text>
                  <Text style={styles.ongoingSub} numberOfLines={1}>
                    {active.dropoffAddress ?? 'Open trip'}
                  </Text>
                </View>
                <Icon name="chevronRight" size={16} color={colors.textMuted} />
              </Pressable>
            ) : needsRating ? (
              <Pressable
                onPress={() =>
                  navigation.navigate('Rating', {rideId: needsRating.id})
                }
                style={({pressed}) => [
                  styles.ongoingCard,
                  pressed && styles.pressed,
                ]}>
                <View style={styles.ongoingIcon}>
                  <Icon name="car" size={18} color={colors.textOnPrimary} />
                </View>
                <View style={styles.ongoingCopy}>
                  <Text style={styles.ongoingTitle}>
                    Ride has ended. Please rate your rider
                  </Text>
                  <Text style={styles.ongoingSub} numberOfLines={1}>
                    {needsRating.dropoffAddress ?? 'Trip'}
                  </Text>
                </View>
                <Icon name="chevronRight" size={16} color={colors.textMuted} />
              </Pressable>
            ) : null}
          </View>
        ) : null}

        {recentPlaces.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Recent</Text>
            {recentPlaces.map(p => (
              <Pressable
                key={p.key}
                onPress={() => openBooking('COMFORT', p)}
                style={({pressed}) => [
                  styles.recentRow,
                  pressed && styles.pressed,
                ]}>
                <Icon name="pin" size={16} color={colors.primary} />
                <Text style={styles.recentLabel} numberOfLines={1}>
                  {p.label}
                </Text>
              </Pressable>
            ))}
          </View>
        ) : null}

        <View style={styles.promo}>
          <Text style={styles.promoTitle}>Invite Friends & Get Discount</Text>
          <Text style={styles.promoBody}>
            Share Ride with friends and unlock ride credits when they take
            their first trip.
          </Text>
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {flex: 1, backgroundColor: colors.background},
  scroll: {paddingBottom: spacing.xl, gap: spacing.md},
  header: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
  },
  nearRow: {
    marginHorizontal: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    flexDirection: 'row',
    alignItems: 'center',
    ...elevation.sm,
  },
  nearCopy: {flex: 1, gap: 2},
  nearEyebrow: {...typography.caption, color: colors.textMuted},
  nearValue: {...typography.bodyStrong, color: colors.text},
  services: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
  },
  serviceCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    gap: spacing.sm,
    ...elevation.sm,
  },
  serviceArt: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bikeArt: {backgroundColor: 'rgba(227,28,35,0.08)'},
  carArt: {backgroundColor: 'rgba(227,28,35,0.08)'},
  serviceLabel: {...typography.cardTitle, color: colors.text},
  whereCard: {
    marginHorizontal: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    ...elevation.sm,
  },
  whereText: {...typography.bodyStrong, color: colors.textMuted, flex: 1},
  section: {paddingHorizontal: spacing.md, gap: spacing.sm},
  sectionTitle: {...typography.section, color: colors.text},
  ongoingCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    ...elevation.sm,
  },
  ongoingIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ongoingCopy: {flex: 1, gap: 2},
  ongoingTitle: {...typography.cardTitle, color: colors.text},
  ongoingSub: {...typography.caption, color: colors.textMuted},
  recentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  recentLabel: {...typography.body, color: colors.text, flex: 1},
  promo: {
    marginHorizontal: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.sm,
    ...elevation.sm,
  },
  promoTitle: {...typography.section, color: colors.text},
  promoBody: {...typography.secondary, color: colors.textSecondary, lineHeight: 20},
  error: {
    ...typography.caption,
    color: colors.error,
    paddingHorizontal: spacing.md,
  },
  pressed: {opacity: 0.92},
});
