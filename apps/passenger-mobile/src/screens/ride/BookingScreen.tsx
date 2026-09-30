import React, {useEffect, useMemo, useRef, useState} from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {
  MapPlaceholder,
  type MapPoint,
} from '../../components/MapPlaceholder';
import {BottomSheet} from '../../components/ui/Sheet';
import {Button} from '../../components/ui/Button';
import {FloatingMapButton} from '../../components/ui/FloatingMapButton';
import {Icon} from '../../components/ui/Icon';
import {useAuth} from '../../state/AuthContext';
import {usePassengerLocation} from '../../hooks/usePassengerLocation';
import {bookRide, createQuote} from '../../services/ride-api';
import {
  formatDistance,
  formatDuration,
  formatMoney,
  parseApiError,
} from '../../utils/format';
import type {Quote, VehicleType} from '../../types/ride';
import {colors, radius, spacing, typography} from '../../theme/tokens';
import type {RootStackParamList} from '../../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Booking'>;

const VEHICLES: {
  type: VehicleType;
  title: string;
  icon: 'locate' | 'car';
}[] = [
  {type: 'ECONOMY', title: 'BIKE', icon: 'locate'},
  {type: 'COMFORT', title: 'CAR LITE', icon: 'car'},
  {type: 'XL', title: 'CAR', icon: 'car'},
];

export function BookingScreen({navigation, route}: Props) {
  const insets = useSafeAreaInsets();
  const {session} = useAuth();
  const location = usePassengerLocation(true);
  const params = route.params;

  const destination = params?.destinationLabel?.trim() ?? '';
  const dropLat = params?.dropoffLat;
  const dropLng = params?.dropoffLng;
  const destinationSecondary = params?.destinationSecondary;

  const [vehicleType, setVehicleType] = useState<VehicleType>(
    params?.preferredVehicle ?? 'COMFORT',
  );
  const [quote, setQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const confirmLock = useRef(false);

  const pickupReady = !!location.coords;
  const destinationReady =
    !!destination &&
    dropLat != null &&
    dropLng != null &&
    !Number.isNaN(dropLat) &&
    !Number.isNaN(dropLng);

  useEffect(() => {
    if (!destinationReady) {
      navigation.replace('DestinationSearch');
    }
  }, [destinationReady, navigation]);

  useEffect(() => {
    if (!session || !location.coords || !destinationReady) {
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    setQuote(null);
    void (async () => {
      try {
        const next = await createQuote(session.accessToken, {
          vehicleType,
          pickupLat: location.coords!.latitude,
          pickupLng: location.coords!.longitude,
          dropoffLat: dropLat!,
          dropoffLng: dropLng!,
          pickupAddress: 'Current location',
          dropoffAddress: destination,
        });
        if (!cancelled) {
          setQuote(next);
        }
      } catch (e) {
        if (!cancelled) {
          setError(parseApiError(e));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [
    session,
    location.coords?.latitude,
    location.coords?.longitude,
    destinationReady,
    vehicleType,
    destination,
    dropLat,
    dropLng,
  ]);

  const markers = useMemo(() => {
    const list: MapPoint[] = [];
    if (location.coords) {
      list.push({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        title: 'Pickup',
        kind: 'pickup',
      });
    }
    if (destinationReady) {
      list.push({
        latitude: dropLat!,
        longitude: dropLng!,
        title: destination,
        kind: 'dropoff',
      });
    }
    return list;
  }, [location.coords, destinationReady, dropLat, dropLng, destination]);

  async function onConfirm() {
    if (!session || !quote || confirming || confirmLock.current) {
      return;
    }
    confirmLock.current = true;
    setConfirming(true);
    setError(null);
    try {
      const ride = await bookRide(session.accessToken, quote.id, 'CASH');
      navigation.replace('ActiveRide', {rideId: ride.id});
    } catch (e) {
      setError(parseApiError(e) || "Couldn't request the ride. Try again.");
      confirmLock.current = false;
      setConfirming(false);
    }
  }

  if (!destinationReady) {
    return <View style={styles.root} />;
  }

  const selected = VEHICLES.find(v => v.type === vehicleType) ?? VEHICLES[1];

  return (
    <View style={styles.root}>
      <MapPlaceholder
        fill
        locationEnabled
        showLabel={false}
        showRecenterButton={false}
        followUser={false}
        fitToMarkers
        showRoute
        markers={markers}
        controlsBottomOffset={240}
      />

      <View style={[styles.top, {top: insets.top + spacing.sm}]}>
        <FloatingMapButton
          icon="chevronRight"
          accessibilityLabel="Go back"
          onPress={() => navigation.goBack()}
          style={styles.backFlip}
        />
        <FloatingMapButton
          icon="search"
          accessibilityLabel="Change destination"
          onPress={() => navigation.replace('DestinationSearch')}
        />
      </View>

      <View style={styles.sheetWrap} pointerEvents="box-none">
        <BottomSheet floating>
          <View style={styles.vehicleRow}>
            {VEHICLES.map(v => {
              const on = vehicleType === v.type;
              const price =
                on && quote
                  ? formatMoney(quote.totalMinor, quote.currency)
                  : null;
              return (
                <Pressable
                  key={v.type}
                  onPress={() => setVehicleType(v.type)}
                  style={[styles.chip, on && styles.chipOn]}>
                  <Icon
                    name={v.icon}
                    size={22}
                    color={on ? colors.primary : colors.textMuted}
                  />
                  <Text style={[styles.chipText, on && styles.chipTextOn]}>
                    {v.title}
                  </Text>
                  {price ? (
                    <Text style={[styles.chipPrice, on && styles.chipPriceOn]}>
                      {price}
                    </Text>
                  ) : (
                    <Text style={styles.chipMeta}>
                      {loading && on ? '…' : ' '}
                    </Text>
                  )}
                </Pressable>
              );
            })}
          </View>

          <View style={styles.selectedBlock}>
            <Icon name={selected.icon} size={36} color={colors.primary} />
            <View style={styles.selectedCopy}>
              <Text style={styles.selectedTitle}>{selected.title}</Text>
              {quote ? (
                <Text style={styles.selectedMeta}>
                  ~{formatDuration(quote.durationS)} ·{' '}
                  {formatDistance(quote.distanceM)} · Cash
                </Text>
              ) : (
                <Text style={styles.selectedMeta}>
                  {loading ? 'Getting fare…' : 'Select a ride'}
                </Text>
              )}
            </View>
            {quote ? (
              <Text style={styles.selectedPrice}>
                {formatMoney(quote.totalMinor, quote.currency)}
              </Text>
            ) : null}
          </View>

          {destinationSecondary ? (
            <Text style={styles.destSub} numberOfLines={1}>
              To {destination}
            </Text>
          ) : null}

          {!!error && <Text style={styles.error}>{error}</Text>}

          <Button
            label={
              confirming
                ? 'SENDING…'
                : loading
                  ? 'GETTING FARE…'
                  : 'SEND PICKUP REQUEST'
            }
            loading={confirming || (loading && !quote)}
            disabled={!quote || !pickupReady || confirming}
            onPress={() => void onConfirm()}
            style={styles.cta}
          />
        </BottomSheet>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {flex: 1, backgroundColor: colors.background},
  top: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    zIndex: 2,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  backFlip: {transform: [{rotate: '180deg'}]},
  sheetWrap: {position: 'absolute', left: 0, right: 0, bottom: 0},
  vehicleRow: {flexDirection: 'row', gap: spacing.sm},
  chip: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
    paddingVertical: 10,
    borderRadius: radius.md,
    backgroundColor: colors.mist,
  },
  chipOn: {
    backgroundColor: colors.primaryMuted,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  chipText: {...typography.caption, color: colors.textMuted, fontWeight: '700'},
  chipTextOn: {color: colors.primary},
  chipPrice: {...typography.caption, color: colors.textMuted, fontWeight: '700'},
  chipPriceOn: {color: colors.text},
  chipMeta: {...typography.caption, color: colors.textMuted},
  selectedBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  selectedCopy: {flex: 1, gap: 2},
  selectedTitle: {...typography.section, color: colors.text},
  selectedMeta: {...typography.caption, color: colors.textMuted},
  selectedPrice: {...typography.price, color: colors.text, fontSize: 26},
  destSub: {...typography.caption, color: colors.textMuted},
  error: {...typography.secondary, color: colors.error},
  cta: {borderRadius: radius.md, minHeight: 52},
});
