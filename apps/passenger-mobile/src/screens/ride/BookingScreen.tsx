import React, {useState} from 'react';
import {Alert, StyleSheet, Text, View} from 'react-native';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {Screen} from '../../components/ui/Screen';
import {Button} from '../../components/ui/Button';
import {TextField} from '../../components/ui/TextField';
import {Card} from '../../components/ui/Card';
import {MapPlaceholder} from '../../components/MapPlaceholder';
import {useAuth} from '../../state/AuthContext';
import {bookRide, createQuote} from '../../services/ride-api';
import {
  formatDistance,
  formatDuration,
  formatMoney,
  parseApiError,
} from '../../utils/format';
import type {Quote, VehicleType} from '../../types/ride';
import {colors, spacing, typography} from '../../theme/tokens';
import type {RootStackParamList} from '../../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Booking'>;

const VEHICLES: VehicleType[] = ['ECONOMY', 'COMFORT', 'XL'];

export function BookingScreen({navigation}: Props) {
  const {session} = useAuth();
  const [pickupAddress, setPickupAddress] = useState('');
  const [dropoffAddress, setDropoffAddress] = useState('');
  const [pickupLat, setPickupLat] = useState('');
  const [pickupLng, setPickupLng] = useState('');
  const [dropoffLat, setDropoffLat] = useState('');
  const [dropoffLng, setDropoffLng] = useState('');
  const [vehicleType, setVehicleType] = useState<VehicleType>('ECONOMY');
  const [quote, setQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onQuote() {
    if (!session) {
      return;
    }
    if (!pickupAddress.trim() || !dropoffAddress.trim()) {
      setError('Enter pickup and destination addresses');
      return;
    }
    const pLat = Number(pickupLat);
    const pLng = Number(pickupLng);
    const dLat = Number(dropoffLat);
    const dLng = Number(dropoffLng);
    if ([pLat, pLng, dLat, dLng].some(n => Number.isNaN(n))) {
      setError('Enter valid latitude/longitude (map picker not available yet)');
      return;
    }
    setLoading(true);
    setError(null);
    setQuote(null);
    try {
      const q = await createQuote(session.accessToken, {
        vehicleType,
        pickupLat: pLat,
        pickupLng: pLng,
        dropoffLat: dLat,
        dropoffLng: dLng,
        pickupAddress: pickupAddress.trim(),
        dropoffAddress: dropoffAddress.trim(),
      });
      setQuote(q);
    } catch (e) {
      setError(parseApiError(e));
    } finally {
      setLoading(false);
    }
  }

  async function onConfirm() {
    if (!session || !quote) return;
    setLoading(true);
    setError(null);
    try {
      const ride = await bookRide(session.accessToken, quote.id, 'CASH');
      navigation.replace('ActiveRide', {rideId: ride.id});
    } catch (e) {
      setError(parseApiError(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen scroll title="Book a ride" subtitle="Server-priced fare quote">
      <MapPlaceholder label="Route preview placeholder" height={140} />
      <Text style={styles.hint}>
        Map picking is not available yet. Enter addresses and coordinates
        manually (e.g. lat 27.7172, lng 85.3240 for local testing).
      </Text>

      <TextField
        label="Pickup address"
        value={pickupAddress}
        onChangeText={setPickupAddress}
        placeholder="e.g. Thamel"
      />
      <View style={styles.row}>
        <TextField
          label="Pickup lat"
          value={pickupLat}
          onChangeText={setPickupLat}
          keyboardType="decimal-pad"
          style={styles.half}
        />
        <TextField
          label="Pickup lng"
          value={pickupLng}
          onChangeText={setPickupLng}
          keyboardType="decimal-pad"
          style={styles.half}
        />
      </View>

      <TextField
        label="Destination"
        value={dropoffAddress}
        onChangeText={setDropoffAddress}
        placeholder="e.g. Patan"
      />
      <View style={styles.row}>
        <TextField
          label="Drop lat"
          value={dropoffLat}
          onChangeText={setDropoffLat}
          keyboardType="decimal-pad"
          style={styles.half}
        />
        <TextField
          label="Drop lng"
          value={dropoffLng}
          onChangeText={setDropoffLng}
          keyboardType="decimal-pad"
          style={styles.half}
        />
      </View>

      <Text style={styles.label}>Vehicle</Text>
      <View style={styles.row}>
        {VEHICLES.map(v => (
          <Button
            key={v}
            label={v}
            variant={vehicleType === v ? 'primary' : 'ghost'}
            style={styles.chip}
            onPress={() => setVehicleType(v)}
          />
        ))}
      </View>

      {!!error && <Text style={styles.error}>{error}</Text>}

      <Button label="Get fare quote" onPress={onQuote} loading={loading && !quote} />

      {quote && (
        <Card>
          <Text style={styles.quoteTitle}>Fare quote</Text>
          <Text style={styles.quoteFare}>
            {formatMoney(quote.totalMinor, quote.currency)}
          </Text>
          <Text style={styles.meta}>
            {formatDistance(quote.distanceM)} · {formatDuration(quote.durationS)} ·{' '}
            {quote.vehicleType}
          </Text>
          <Text style={styles.meta}>
            Expires {new Date(quote.expiresAt).toLocaleTimeString()}
          </Text>
          <Button
            label="Confirm ride"
            onPress={() =>
              Alert.alert(
                'Confirm booking',
                `Book for ${formatMoney(quote.totalMinor, quote.currency)} (cash)?`,
                [
                  {text: 'Back', style: 'cancel'},
                  {text: 'Confirm', onPress: () => void onConfirm()},
                ],
              )
            }
            loading={loading}
          />
        </Card>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: {flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap'},
  half: {flex: 1},
  chip: {flexGrow: 1},
  label: {...typography.label, color: colors.inkSoft, textTransform: 'uppercase'},
  error: {...typography.caption, color: colors.danger},
  quoteTitle: {...typography.bodyStrong, color: colors.ink},
  quoteFare: {...typography.title, color: colors.accent},
  meta: {...typography.caption, color: colors.inkSoft},
  hint: {...typography.caption, color: colors.inkSoft, marginBottom: spacing.sm},
});
