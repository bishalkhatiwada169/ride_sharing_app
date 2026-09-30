import React, {useCallback, useEffect, useRef, useState} from 'react';
import {
  Alert,
  AppState,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {MapPlaceholder} from '../../components/MapPlaceholder';
import {BottomSheet} from '../../components/ui/Sheet';
import {Button} from '../../components/ui/Button';
import {BrandMark} from '../../components/ui/BrandMark';
import {Icon} from '../../components/ui/Icon';
import {LocationRow} from '../../components/ui/LocationRow';
import {useAuth} from '../../state/AuthContext';
import {useAppMode} from '../../state/ModeContext';
import {usePassengerLocation} from '../../hooks/usePassengerLocation';
import {getRide} from '../../services/ride-api';
import {
  acceptOffer,
  becomeDriver,
  completeDriverRide,
  getDriverProfile,
  goOffline,
  goOnline,
  listDriverRides,
  markArrived,
  markArriving,
  pendingOffers,
  startDriverRide,
  updateDriverLocation,
  type DriverOffer,
  type DriverRide,
} from '../../services/driver-api';
import {isActiveRide, isTerminalRide, type RideStatus} from '../../types/ride';
import {parseApiError} from '../../utils/format';
import {
  colors,
  elevation,
  radius,
  spacing,
  typography,
} from '../../theme/tokens';

type EnrichedOffer = DriverOffer & {
  pickupLabel?: string;
  dropoffLabel?: string;
};

function humanRideStatus(status: string): string {
  switch (status) {
    case 'DRIVER_ACCEPTED':
      return 'Heading to pickup';
    case 'DRIVER_ARRIVING':
      return 'Arriving at pickup';
    case 'DRIVER_ARRIVED':
      return 'Waiting for passenger';
    case 'RIDE_STARTED':
      return 'Trip in progress';
    case 'RIDE_COMPLETED':
      return 'Trip completed';
    case 'CANCELLED_BY_PASSENGER':
    case 'CANCELLED_BY_DRIVER':
      return 'Ride cancelled';
    case 'NO_DRIVER_FOUND':
    case 'EXPIRED':
      return 'Ride ended';
    default:
      return 'Updating trip…';
  }
}

function RequestCard({
  offer,
  busy,
  onAccept,
}: {
  offer: EnrichedOffer;
  busy: boolean;
  onAccept: () => void;
}) {
  const distance =
    offer.distanceM != null
      ? offer.distanceM < 1000
        ? `${Math.round(offer.distanceM)} m away`
        : `${(offer.distanceM / 1000).toFixed(1)} km away`
      : 'Nearby';

  return (
    <View style={styles.requestCard}>
      <View style={styles.requestHead}>
        <View style={styles.requestPulse} />
        <Text style={styles.requestEyebrow}>Passenger request</Text>
      </View>
      <Text style={styles.requestDistance}>{distance}</Text>
      <LocationRow
        compact
        pickupLabel={offer.pickupLabel ?? 'Pickup'}
        destinationLabel={offer.dropoffLabel ?? 'Destination'}
      />
      <Button label="Accept" onPress={onAccept} loading={busy} />
    </View>
  );
}

export function DriverHomeScreen() {
  const insets = useSafeAreaInsets();
  const {session, signIn} = useAuth();
  const {setMode} = useAppMode();
  const location = usePassengerLocation(true);
  const [online, setOnline] = useState(false);
  const [offers, setOffers] = useState<EnrichedOffer[]>([]);
  const [ride, setRide] = useState<DriverRide | null>(null);
  const [pin, setPin] = useState('');
  const [busy, setBusy] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [status, setStatus] = useState('Go online to receive passenger requests');
  const acceptLock = useRef(false);
  const rideIdRef = useRef<string | null>(null);
  rideIdRef.current = ride?.id ?? null;

  const hasDriverRole = !!session?.user.roles?.includes('DRIVER');
  const rideActive = !!ride && !isTerminalRide(ride.status as RideStatus);
  const recoverInFlight = useRef(false);

  /**
   * Auto-accept assigns the ride with no pending offer. Discover that trip via
   * driver history so Listening… does not stick until relaunch.
   */
  const recoverActiveRide = useCallback(
    async (isCancelled?: () => boolean): Promise<boolean> => {
      if (
        !session ||
        !hasDriverRole ||
        rideIdRef.current ||
        recoverInFlight.current
      ) {
        return !!rideIdRef.current;
      }
      recoverInFlight.current = true;
      try {
        const history = await listDriverRides(session.accessToken);
        if (isCancelled?.() || rideIdRef.current) {
          return !!rideIdRef.current;
        }
        const active = history.find(r =>
          isActiveRide(r.status as RideStatus),
        );
        if (!active) {
          return false;
        }
        setRide({
          id: active.id,
          status: active.status,
          tripPin: active.tripPin,
        });
        setOffers([]);
        setStatus(humanRideStatus(active.status));
        acceptLock.current = true;
        return true;
      } catch {
        return false;
      } finally {
        recoverInFlight.current = false;
      }
    },
    [session, hasDriverRole],
  );

  /** While listening: recover auto-accepted trips, then poll offers. */
  const refreshListening = useCallback(async () => {
    if (!session || !online || rideIdRef.current) {
      return;
    }
    const recovered = await recoverActiveRide();
    if (recovered || rideIdRef.current) {
      return;
    }
    try {
      const raw = await pendingOffers(session.accessToken);
      if (rideIdRef.current) {
        return;
      }
      const enriched = await Promise.all(
        raw.map(async o => {
          try {
            const rideDetail = await getRide(session.accessToken, o.rideId);
            return {
              ...o,
              pickupLabel: rideDetail.pickupAddress ?? 'Pickup',
              dropoffLabel: rideDetail.dropoffAddress ?? 'Destination',
            };
          } catch {
            return {...o};
          }
        }),
      );
      if (!rideIdRef.current) {
        setOffers(enriched);
      }
    } catch {
      /* quiet poll */
    }
  }, [session, online, recoverActiveRide]);

  const refreshActiveRide = useCallback(async () => {
    const rideId = rideIdRef.current;
    if (!session || !rideId) {
      return;
    }
    try {
      const data = await getRide(session.accessToken, rideId);
      setRide({
        id: data.id,
        status: data.status,
        tripPin: data.tripPin,
      });
      setStatus(humanRideStatus(data.status));
      if (isTerminalRide(data.status)) {
        setStatus("You're online and ready for requests");
        setRide(null);
        setPin('');
        acceptLock.current = false;
      }
    } catch {
      /* quiet */
    }
  }, [session]);

  useEffect(() => {
    if (!online || rideActive) {
      if (!online) {
        setOffers([]);
      }
      return;
    }
    void refreshListening();
    const id = setInterval(() => void refreshListening(), 3500);
    return () => clearInterval(id);
  }, [online, rideActive, refreshListening]);

  useEffect(() => {
    if (!rideActive) {
      return;
    }
    void refreshActiveRide();
    const id = setInterval(() => void refreshActiveRide(), 4000);
    return () => clearInterval(id);
  }, [rideActive, refreshActiveRide]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', next => {
      if (next !== 'active') {
        return;
      }
      if (rideActive) {
        void refreshActiveRide();
      } else if (online) {
        void refreshListening();
      }
    });
    return () => sub.remove();
  }, [online, rideActive, refreshActiveRide, refreshListening]);

  useEffect(() => {
    if (!session || !online || !location.coords) {
      return;
    }
    void updateDriverLocation(
      session.accessToken,
      location.coords.latitude,
      location.coords.longitude,
    ).catch(() => undefined);
  }, [session, online, location.coords]);

  /** Cold start / role load: sync online flag and recover any assigned trip. */
  useEffect(() => {
    if (!session || !hasDriverRole || rideActive) {
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const profile = await getDriverProfile(session.accessToken);
        if (cancelled) {
          return;
        }
        setOnline(!!profile.online);
        if (profile.online) {
          setStatus("You're online and ready for requests");
        }
        if (!cancelled) {
          await recoverActiveRide(() => cancelled);
        }
      } catch {
        /* quiet */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [session, hasDriverRole, rideActive, recoverActiveRide]);

  async function onBecomeDriver() {
    if (!session) {
      return;
    }
    setBusy(true);
    try {
      const tokens = await becomeDriver(
        session.accessToken,
        session.refreshToken,
        session.user.displayName || 'Driver',
      );
      await signIn(tokens);
      setStatus('Application sent — after approval, go online');
    } catch (e) {
      Alert.alert('Couldn’t apply', parseApiError(e));
    } finally {
      setBusy(false);
    }
  }

  async function onToggleOnline() {
    if (!session) {
      return;
    }
    setToggling(true);
    try {
      if (online) {
        await goOffline(session.accessToken);
        setOnline(false);
        setOffers([]);
        setStatus('You’re offline — go online when ready');
      } else {
        await goOnline(session.accessToken);
        if (location.coords) {
          await updateDriverLocation(
            session.accessToken,
            location.coords.latitude,
            location.coords.longitude,
          );
        }
        setOnline(true);
        setStatus("You're online and ready for requests");
      }
    } catch (e) {
      Alert.alert(
        online ? 'Couldn’t go offline' : 'Couldn’t go online',
        parseApiError(e),
      );
    } finally {
      setToggling(false);
    }
  }

  async function onAccept(offer: EnrichedOffer) {
    if (!session || acceptLock.current) {
      return;
    }
    acceptLock.current = true;
    setBusy(true);
    try {
      const next = await acceptOffer(session.accessToken, offer.id);
      setRide(next);
      setOffers([]);
      setStatus(humanRideStatus(next.status));
    } catch (e) {
      Alert.alert('Accept failed', parseApiError(e));
      acceptLock.current = false;
    } finally {
      setBusy(false);
    }
  }

  async function runRideAction(
    label: string,
    action: () => Promise<DriverRide>,
    clearAfter = false,
  ) {
    if (!session || busy) {
      return;
    }
    setBusy(true);
    try {
      const next = await action();
      if (clearAfter || isTerminalRide(next.status as RideStatus)) {
        setRide(null);
        setPin('');
        acceptLock.current = false;
        setStatus("You're online and ready for requests");
      } else {
        setRide(next);
        setStatus(humanRideStatus(next.status));
      }
    } catch (e) {
      Alert.alert(label, parseApiError(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.root}>
      <MapPlaceholder
        fill
        locationEnabled
        showLabel={false}
        showRecenterButton={false}
      />
      <View style={styles.edge} pointerEvents="none" />

      <View style={[styles.top, {paddingTop: insets.top + spacing.sm}]}>
        <BrandMark size="sm" />
        <Pressable
          onPress={() => void setMode('passenger')}
          style={styles.switchChip}>
          <Text style={styles.switchText}>Passenger</Text>
        </Pressable>
      </View>

      <View style={styles.sheetWrap} pointerEvents="box-none">
        <BottomSheet floating>
          <View style={styles.statusRow}>
            <View>
              <Text style={styles.headline}>Driver</Text>
              <Text style={styles.status}>{status}</Text>
            </View>
            {hasDriverRole ? (
              <View
                style={[
                  styles.statePill,
                  online ? styles.stateOnline : styles.stateOffline,
                ]}>
                <View
                  style={[
                    styles.stateDot,
                    {
                      backgroundColor: online
                        ? colors.success
                        : colors.textMuted,
                    },
                  ]}
                />
                <Text
                  style={[
                    styles.stateLabel,
                    {color: online ? colors.success : colors.textMuted},
                  ]}>
                  {online ? 'ONLINE' : 'OFFLINE'}
                </Text>
              </View>
            ) : null}
          </View>

          {!hasDriverRole ? (
            <Button
              label="Become a driver"
              onPress={onBecomeDriver}
              loading={busy}
            />
          ) : !rideActive ? (
            <Button
              label={online ? 'Go offline' : 'Go online'}
              variant={online ? 'secondary' : 'primary'}
              onPress={onToggleOnline}
              loading={toggling}
            />
          ) : null}

          {offers.length > 0 && !rideActive ? (
            <View style={styles.offers}>
              {offers.map(o => (
                <RequestCard
                  key={o.id}
                  offer={o}
                  busy={busy}
                  onAccept={() => void onAccept(o)}
                />
              ))}
            </View>
          ) : online && !rideActive ? (
            <View style={styles.waiting}>
              <Icon name="locate" size={20} color={colors.success} />
              <Text style={styles.empty}>
                Listening for passenger requests…
              </Text>
            </View>
          ) : null}

          {rideActive && ride ? (
            <View style={styles.trip}>
              <Text style={styles.section}>Active trip</Text>
              <Text style={styles.tripStatus}>
                {humanRideStatus(ride.status)}
              </Text>
              {ride.status === 'DRIVER_ACCEPTED' ? (
                <Button
                  label="Arriving"
                  variant="secondary"
                  loading={busy}
                  onPress={() =>
                    void runRideAction("Couldn't update", () =>
                      markArriving(session!.accessToken, ride.id),
                    )
                  }
                />
              ) : null}
              {ride.status === 'DRIVER_ARRIVING' ? (
                <Button
                  label="Arrived"
                  variant="secondary"
                  loading={busy}
                  onPress={() =>
                    void runRideAction("Couldn't update", () =>
                      markArrived(session!.accessToken, ride.id),
                    )
                  }
                />
              ) : null}
              {ride.status === 'DRIVER_ARRIVED' ? (
                <>
                  <TextInput
                    value={pin}
                    onChangeText={setPin}
                    placeholder="Passenger PIN"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="number-pad"
                    style={styles.pin}
                  />
                  <Button
                    label="Start trip"
                    loading={busy}
                    onPress={() =>
                      void runRideAction('Start failed', () =>
                        startDriverRide(
                          session!.accessToken,
                          ride.id,
                          pin.trim(),
                        ),
                      )
                    }
                  />
                </>
              ) : null}
              {ride.status === 'RIDE_STARTED' ? (
                <Button
                  label="Complete trip"
                  loading={busy}
                  onPress={() =>
                    void runRideAction(
                      'Complete failed',
                      () => completeDriverRide(session!.accessToken, ride.id),
                      true,
                    )
                  }
                />
              ) : null}
            </View>
          ) : null}
        </BottomSheet>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {flex: 1, backgroundColor: colors.background},
  edge: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 140,
    backgroundColor: 'rgba(11, 13, 18, 0.2)',
  },
  top: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 2,
  },
  switchChip: {
    backgroundColor: colors.glass,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  switchText: {...typography.caption, color: colors.primary, fontWeight: '700'},
  sheetWrap: {position: 'absolute', left: 0, right: 0, bottom: 0},
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  headline: {...typography.section, color: colors.text},
  status: {
    ...typography.secondary,
    color: colors.textSecondary,
    lineHeight: 20,
    marginTop: 4,
    maxWidth: 220,
  },
  statePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.pill,
  },
  stateOnline: {backgroundColor: colors.successMuted},
  stateOffline: {backgroundColor: colors.mist},
  stateDot: {width: 7, height: 7, borderRadius: 4},
  stateLabel: {...typography.label, letterSpacing: 0.8},
  offers: {gap: spacing.md},
  requestCard: {
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceElevated,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.primary,
    ...elevation.sm,
  },
  requestHead: {flexDirection: 'row', alignItems: 'center', gap: spacing.sm},
  requestPulse: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  requestEyebrow: {...typography.label, color: colors.primary},
  requestDistance: {...typography.bodyStrong, color: colors.text},
  waiting: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  empty: {...typography.secondary, color: colors.textMuted, flex: 1},
  trip: {gap: spacing.sm},
  section: {
    ...typography.label,
    color: colors.textMuted,
    textTransform: 'uppercase',
  },
  tripStatus: {...typography.bodyStrong, color: colors.text},
  pin: {
    ...typography.body,
    color: colors.text,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    paddingVertical: spacing.sm,
  },
});
