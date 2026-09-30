import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
  ActivityIndicator,
  FlatList,
  Keyboard,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {FloatingMapButton} from '../../components/ui/FloatingMapButton';
import {Icon} from '../../components/ui/Icon';
import {useAuth} from '../../state/AuthContext';
import {usePassengerLocation} from '../../hooks/usePassengerLocation';
import {listRides} from '../../services/ride-api';
import {searchPlaces, type PlaceResult} from '../../services/places-api';
import {parseApiError} from '../../utils/format';
import {colors, radius, spacing, typography} from '../../theme/tokens';
import type {RootStackParamList} from '../../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'DestinationSearch'>;

const DEBOUNCE_MS = 350;

type RecentItem = {
  key: string;
  name: string;
  secondary: string;
  latitude: number;
  longitude: number;
};

export function DestinationSearchScreen({navigation, route}: Props) {
  const insets = useSafeAreaInsets();
  const {session} = useAuth();
  const location = usePassengerLocation(true);
  const inputRef = useRef<TextInput>(null);
  const requestId = useRef(0);
  const abortRef = useRef<AbortController | null>(null);

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PlaceResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recents, setRecents] = useState<RecentItem[]>([]);

  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 280);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!session) {
      return;
    }
    void listRides(session.accessToken)
      .then(rides => {
        const seen = new Set<string>();
        const next: RecentItem[] = [];
        for (const r of rides) {
          const name = r.dropoffAddress?.trim();
          if (!name || seen.has(name.toLowerCase())) {
            continue;
          }
          seen.add(name.toLowerCase());
          next.push({
            key: r.id,
            name,
            secondary: 'Recent trip',
            latitude: r.dropoffLat,
            longitude: r.dropoffLng,
          });
          if (next.length >= 5) {
            break;
          }
        }
        setRecents(next);
      })
      .catch(() => undefined);
  }, [session]);

  const runSearch = useCallback(
    async (text: string) => {
      const q = text.trim();
      if (q.length < 2) {
        setResults([]);
        setLoading(false);
        setError(null);
        return;
      }

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      const id = ++requestId.current;

      setLoading(true);
      setError(null);
      try {
        const places = await searchPlaces(q, controller.signal, location.coords);
        if (id !== requestId.current) {
          return;
        }
        setResults(places);
      } catch (e) {
        if ((e as {name?: string})?.name === 'AbortError') {
          return;
        }
        if (id !== requestId.current) {
          return;
        }
        setResults([]);
        setError(
          e instanceof TypeError
            ? 'Check your connection and try again.'
            : 'Couldn’t search right now. Try again.',
        );
      } finally {
        if (id === requestId.current) {
          setLoading(false);
        }
      }
    },
    [location.coords],
  );

  useEffect(() => {
    const handle = setTimeout(() => void runSearch(query), DEBOUNCE_MS);
    return () => clearTimeout(handle);
  }, [query, runSearch]);

  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  function selectPlace(place: {
    name: string;
    secondary?: string;
    latitude: number;
    longitude: number;
  }) {
    const lat = place.latitude;
    const lng = place.longitude;
    const name = place.name?.trim();
    if (
      !name ||
      lat == null ||
      lng == null ||
      Number.isNaN(lat) ||
      Number.isNaN(lng)
    ) {
      setError("Couldn't use that destination");
      return;
    }
    Keyboard.dismiss();
    navigation.replace('Booking', {
      destinationLabel: name,
      destinationSecondary: place.secondary,
      dropoffLat: lat,
      dropoffLng: lng,
      preferredVehicle: route.params?.preferredVehicle,
    });
  }

  const showRecents = query.trim().length < 2 && recents.length > 0;
  const showEmpty =
    !loading &&
    !error &&
    query.trim().length >= 2 &&
    results.length === 0;

  const listData = useMemo(() => {
    if (query.trim().length >= 2) {
      return results.map(r => ({
        key: r.id,
        name: r.name,
        secondary: r.secondary,
        latitude: r.latitude,
        longitude: r.longitude,
      }));
    }
    return recents;
  }, [query, results, recents]);

  return (
    <View style={[styles.root, {paddingTop: insets.top + spacing.sm}]}>
      <View style={styles.header}>
        <FloatingMapButton
          icon="chevronRight"
          accessibilityLabel="Back"
          onPress={() => navigation.goBack()}
          style={styles.back}
        />
        <Text style={styles.title}>Where are you going?</Text>
        <View style={styles.spacer} />
      </View>

      <View style={styles.searchShell}>
        <Icon name="search" size={18} color={colors.primary} />
        <TextInput
          ref={inputRef}
          value={query}
          onChangeText={setQuery}
          placeholder="Search destination"
          placeholderTextColor={colors.textMuted}
          style={styles.input}
          returnKeyType="search"
          autoCorrect={false}
          autoCapitalize="words"
        />
        {query.length > 0 ? (
          <Pressable
            onPress={() => {
              setQuery('');
              setResults([]);
              setError(null);
              inputRef.current?.focus();
            }}
            hitSlop={10}
            accessibilityLabel="Clear search">
            <Icon name="close" size={16} color={colors.textMuted} />
          </Pressable>
        ) : null}
        {loading ? (
          <ActivityIndicator size="small" color={colors.primary} />
        ) : null}
      </View>

      {showRecents ? (
        <Text style={styles.section}>Recent</Text>
      ) : query.trim().length >= 2 ? (
        <Text style={styles.section}>Results</Text>
      ) : (
        <Text style={styles.hint}>
          Search places around Kathmandu
        </Text>
      )}

      {error ? (
        <View style={styles.stateBox}>
          <Text style={styles.errorTitle}>Couldn’t search right now</Text>
          <Text style={styles.errorBody}>{error}</Text>
          <Pressable onPress={() => void runSearch(query)} hitSlop={8}>
            <Text style={styles.retry}>Try again</Text>
          </Pressable>
        </View>
      ) : null}

      {showEmpty ? (
        <View style={styles.stateBox}>
          <Text style={styles.errorTitle}>No places found</Text>
          <Text style={styles.errorBody}>Try a different search</Text>
        </View>
      ) : null}

      <FlatList
        data={listData}
        keyExtractor={item => item.key}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          paddingBottom: Math.max(insets.bottom, spacing.lg) + 72,
        }}
        renderItem={({item}) => (
          <Pressable
            onPress={() => selectPlace(item)}
            style={({pressed}) => [
              styles.row,
              pressed && styles.rowPressed,
            ]}>
            <View style={styles.pin}>
              <Icon name="pin" size={16} color={colors.primary} />
            </View>
            <View style={styles.rowCopy}>
              <Text style={styles.rowTitle} numberOfLines={1}>
                {item.name}
              </Text>
              {item.secondary ? (
                <Text style={styles.rowSub} numberOfLines={2}>
                  {item.secondary}
                </Text>
              ) : null}
            </View>
          </Pressable>
        )}
        ListFooterComponent={
          query.trim().length >= 2 && results.length > 0 ? (
            <Text style={styles.attr}>Places data © OpenStreetMap · Photon</Text>
          ) : null
        }
      />

      <View
        style={[
          styles.pickupBar,
          {paddingBottom: Math.max(insets.bottom, spacing.md)},
        ]}>
        <Text style={styles.pickupLabel}>Pickup</Text>
        <Text style={styles.pickupValue}>
          {location.coords ? 'Current location' : 'Finding your location…'}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {flex: 1, backgroundColor: colors.background},
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  back: {transform: [{rotate: '180deg'}]},
  title: {
    ...typography.section,
    color: colors.text,
    flex: 1,
    textAlign: 'center',
  },
  spacer: {width: 44},
  searchShell: {
    marginHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 52,
    paddingHorizontal: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceElevated,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderStrong,
  },
  input: {
    flex: 1,
    ...typography.body,
    color: colors.text,
    paddingVertical: spacing.sm,
  },
  section: {
    ...typography.label,
    color: colors.textMuted,
    textTransform: 'uppercase',
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
    marginHorizontal: spacing.lg,
  },
  hint: {
    ...typography.secondary,
    color: colors.textMuted,
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  rowPressed: {backgroundColor: colors.mist},
  pin: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowCopy: {flex: 1, gap: 2},
  rowTitle: {...typography.bodyStrong, color: colors.text},
  rowSub: {...typography.caption, color: colors.textMuted, lineHeight: 16},
  stateBox: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: 6,
  },
  errorTitle: {...typography.bodyStrong, color: colors.text},
  errorBody: {...typography.secondary, color: colors.textMuted},
  retry: {...typography.bodyStrong, color: colors.primary, marginTop: 4},
  attr: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  pickupBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    backgroundColor: colors.glass,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    gap: 2,
  },
  pickupLabel: {...typography.label, color: colors.textMuted},
  pickupValue: {...typography.bodyStrong, color: colors.text},
});
