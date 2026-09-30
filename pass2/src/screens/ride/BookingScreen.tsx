import React, {useEffect, useMemo, useRef, useState} from 'react';
import {Alert, Pressable, StyleSheet, Text, View} from 'react-native';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {
  MapPlaceholder,
  type MapPoint,
} from '../../components/MapPlaceholder';
import {BottomSheet} from '../../components/ui/Sheet';
import {Button} from '../../components/ui/Button';
import {FloatingMapButton} from '../../components/ui/FloatingMapButton';
import {LocationRow} from '../../components/ui/LocationRow';
import {FareBlock} from '../../components/ui/FareBlock';
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

const VEHICLES: {type: VehicleType; title: string}[] = [
  {type: 'ECONOMY', title: 'Standard'},
  {type: 'COMFORT', title: 'Comfort'},
  {type: 'XL', title: 'XL'},
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

  const [vehicleType, setVehicleType] = useState<VehicleType>('ECONOMY');
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

  const vehicleTitle =
    VEHICLES.find(v => v.type === vehicleType)?.title ?? vehicleType;

  if (!destinationReady) {
    return <View style={styles.root} />;
  }

  return (
    <View style={styles.root}>
      <MapPlaceholder
        fill
        locationEnabled
        showLabel={false}
        showRecenterButton={false}
        followUser={false}
        fitToMarkers
        markers={markers}
        controlsBottomOffset={220}
      />

      <View style={[styles.top, {top: insets.top + spacing.sm}]}>
        <FloatingMapButton
          icon="chevronRight"
          accessibilityLabel="Go back"
          onPress={() => navigation.goBack()}
          style={styles.backFlip}
        />
        <Pressable
          onPress={() => navigation.replace('DestinationSearch')}
          style={styles.changeDest}>
          <Text style={styles.changeDestText}>Change</Text>
        </Pressable>
      </View>

      <View style={styles.sheetWrap} pointerEvents="box-none">
        <BottomSheet floating>
          <Text style={styles.title}>Confirm your ride</Text>

          <LocationRow
            pickupLabel={
              pickupReady ? 'Current location' : 'Finding your location…'
            }
            destinationLabel={destination}
          />
          {destinationSecondary ? (
            <Text style={styles.destSub} numberOfLines={2}>
              {destinationSecondary}
            </Text>
          ) : null}

          <View style={styles.vehicleRow}>
            {VEHICLES.map(v => {
              const on = vehicleType === v.type;
              return (
                <Pressable
                  key={v.type}
                  onPress={() => setVehicleType(v.type)}
                  style={[styles.chip, on && styles.chipOn]}>
                  <Text style={[styles.chipText, on && styles.chipTextOn]}>
                    {v.title}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {loading && !quote ? (
            <Text style={styles.quiet}>Getting fare…</Text>
          ) : null}

          {quote ? (
            <>
              <View style={styles.divider} />
              <FareBlock
                rideLabel={vehicleTitle}
                fare={formatMoney(quote.totalMinor, quote.currency)}
                meta={`~${formatDuration(quote.durationS)} · ${formatDistance(quote.distanceM)} · Cash`}
              />
            </>
          ) : null}

          {!!error && <Text style={styles.error}>{error}</Text>}

          <Button
            label={
              confirming
                ? 'Confirming…'
                : loading
                  ? 'Getting fare…'
                  : 'Confirm ride'
            }
            loading={confirming || (loading && !quote)}
            disabled={!quote || !pickupReady || confirming}
            onPress={() =>
              Alert.alert(
                'Confirm ride',
                quote
                  ? `Book for ${formatMoney(quote.totalMinor, quote.currency)}?`
                  : 'Confirm this trip?',
                [
                  {text: 'Back', style: 'cancel'},
                  {text: 'Confirm', onPress: () => void onConfirm()},
                ],
              )
            }
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
  changeDest: {
    backgroundColor: colors.glass,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  changeDestText: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '700',
  },
  sheetWrap: {position: 'absolute', left: 0, right: 0, bottom: 0},
  title: {...typography.section, color: colors.text},
  destSub: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: -spacing.sm,
  },
  vehicleRow: {flexDirection: 'row', gap: spacing.sm},
  chip: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: radius.md,
    backgroundColor: colors.mist,
  },
  chipOn: {backgroundColor: colors.primaryMuted},
  chipText: {...typography.bodyStrong, color: colors.textMuted},
  chipTextOn: {color: colors.primary},
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
  },
  quiet: {...typography.secondary, color: colors.textMuted},
  error: {...typography.secondary, color: colors.error},
});
