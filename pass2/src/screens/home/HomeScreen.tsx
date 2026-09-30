import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {AppState, Pressable, StyleSheet, Text, View} from 'react-native';
import {
  useIsFocused,
  type CompositeScreenProps,
} from '@react-navigation/native';
import type {BottomTabScreenProps} from '@react-navigation/bottom-tabs';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {
  MapPlaceholder,
  type MapHandle,
} from '../../components/MapPlaceholder';
import {RideSheet} from '../../components/ui/Sheet';
import {FloatingMapButton} from '../../components/ui/FloatingMapButton';
import {BrandMark} from '../../components/ui/BrandMark';
import {WhereToControl} from '../../components/ui/WhereToControl';
import {Icon} from '../../components/ui/Icon';
import {useAuth} from '../../state/AuthContext';
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
  const mapRef = useRef<MapHandle>(null);
  const [rides, setRides] = useState<Ride[]>([]);
  const [expanded, setExpanded] = useState(false);
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
      if (places.length >= 4) {
        break;
      }
    }
    return places;
  }, [rides]);

  const openBooking = useCallback(
    (place?: RecentPlace) => {
      if (place) {
        navigation.navigate('Booking', {
          destinationLabel: place.label,
          dropoffLat: place.lat,
          dropoffLng: place.lng,
        });
        return;
      }
      navigation.navigate('DestinationSearch');
    },
    [navigation],
  );

  return (
    <View style={styles.root}>
      <MapPlaceholder
        ref={mapRef}
        fill
        locationEnabled={focused}
        showLabel={false}
        showRecenterButton={false}
      />

      {/* Atmospheric edges — not a heavy black wash */}
      <View style={styles.edgeTop} pointerEvents="none" />
      <View style={styles.edgeBottom} pointerEvents="none" />

      <View
        style={[styles.topBar, {paddingTop: insets.top + spacing.sm}]}
        pointerEvents="box-none">
        <FloatingMapButton
          icon="user"
          accessibilityLabel="Open profile"
          onPress={() => navigation.navigate('Profile')}
        />
        <BrandMark />
        <FloatingMapButton
          icon="locate"
          accessibilityLabel="Recenter map"
          onPress={() => mapRef.current?.recenter()}
        />
      </View>

      <View style={styles.bottom} pointerEvents="box-none">
        {active ? (
          <Pressable
            onPress={() =>
              navigation.navigate('ActiveRide', {rideId: active.id})
            }
            style={({pressed}) => [
              styles.activeChip,
              pressed && styles.pressed,
            ]}>
            <View style={styles.livePulse} />
            <View style={styles.activeCopy}>
              <Text style={styles.activeStatus}>
                {formatStatusLabel(active.status)}
              </Text>
              <Text style={styles.activeDest} numberOfLines={1}>
                {active.dropoffAddress ?? 'Open trip'}
              </Text>
            </View>
            <Icon name="chevronRight" size={16} color={colors.primary} />
          </Pressable>
        ) : null}

        <RideSheet
          floating
          expanded={expanded}
          onToggle={() => setExpanded(v => !v)}
          collapsedChildren={
            <WhereToControl onPress={() => openBooking()} />
          }
          expandedChildren={
            <View style={styles.expanded}>
              {recentPlaces.length > 0 ? (
                <>
                  <Text style={styles.sectionLabel}>Recent</Text>
                  {recentPlaces.map(place => (
                    <Pressable
                      key={place.key}
                      onPress={() => openBooking(place)}
                      style={({pressed}) => [
                        styles.placeRow,
                        pressed && styles.pressed,
                      ]}>
                      <Text style={styles.placeLabel} numberOfLines={1}>
                        {place.label}
                      </Text>
                    </Pressable>
                  ))}
                </>
              ) : (
                <Text style={styles.empty}>
                  Your recent places will appear here.
                </Text>
              )}
              {error ? <Text style={styles.error}>{error}</Text> : null}
            </View>
          }
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {flex: 1, backgroundColor: colors.background},
  edgeTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 96,
    backgroundColor: 'rgba(11, 13, 18, 0.28)',
  },
  edgeBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 160,
    backgroundColor: 'rgba(11, 13, 18, 0.22)',
  },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bottom: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    gap: spacing.sm,
  },
  activeChip: {
    marginHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.glass,
    borderRadius: radius.xl,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    ...elevation.sm,
  },
  livePulse: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.success,
  },
  activeCopy: {flex: 1},
  activeStatus: {...typography.caption, color: colors.textMuted},
  activeDest: {...typography.bodyStrong, color: colors.text},
  expanded: {gap: 2, paddingBottom: spacing.xs},
  sectionLabel: {
    ...typography.label,
    color: colors.textMuted,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  placeRow: {paddingVertical: 12},
  placeLabel: {...typography.body, color: colors.text},
  empty: {...typography.secondary, color: colors.textMuted, lineHeight: 20},
  error: {...typography.caption, color: colors.error},
  pressed: {opacity: 0.9},
});
