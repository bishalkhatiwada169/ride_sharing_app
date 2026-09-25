import React, {useState} from 'react';
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {requestOtp, verifyOtp} from './src/services/auth-api';
import {registerDevice} from './src/services/notification-api';
import {
  acceptOffer,
  becomeDriver,
  completeRide,
  goOnline,
  markArrived,
  markArriving,
  pendingOffers,
  startRide,
  updateLocation,
  type Offer,
  type Ride,
} from './src/services/ride-api';

type Session = {
  accessToken: string;
  refreshToken: string;
  phone: string;
};

export default function App(): React.JSX.Element {
  const [phone, setPhone] = useState('+9779822222222');
  const [otp, setOtp] = useState('');
  const [pin, setPin] = useState('');
  const [session, setSession] = useState<Session | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('Driver · Ride Platform');
  const [offers, setOffers] = useState<Offer[]>([]);
  const [ride, setRide] = useState<Ride | null>(null);

  async function run(label: string, fn: () => Promise<void>) {
    setBusy(true);
    setMessage(label);
    try {
      await fn();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  if (!session) {
    return (
      <SafeAreaView style={styles.root}>
        <Text style={styles.brand}>Ride</Text>
        <Text style={styles.sub}>Driver</Text>
        <TextInput
          style={styles.input}
          value={phone}
          onChangeText={setPhone}
          placeholder="Phone E.164"
          autoCapitalize="none"
        />
        <Pressable
          style={styles.btn}
          disabled={busy}
          onPress={() =>
            run('OTP sent — check backend logs', async () => {
              await requestOtp(phone);
            })
          }>
          <Text style={styles.btnText}>Request OTP</Text>
        </Pressable>
        <TextInput
          style={styles.input}
          value={otp}
          onChangeText={setOtp}
          placeholder="OTP code"
          keyboardType="number-pad"
        />
        <Pressable
          style={styles.btn}
          disabled={busy}
          onPress={() =>
            run('Signing in…', async () => {
              const tokens = await verifyOtp(phone, otp);
              setSession({
                accessToken: tokens.accessToken,
                refreshToken: tokens.refreshToken,
                phone,
              });
              await registerDevice(
                tokens.accessToken,
                'android',
                `mock-driver-${tokens.user.id}`,
              );
              setMessage('Signed in — apply as driver next');
            })
          }>
          <Text style={styles.btnText}>Verify OTP</Text>
        </Pressable>
        <Text style={styles.msg}>{message}</Text>
        {busy && <ActivityIndicator color="#1A2A4A" />}
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root}>
      <ScrollView contentContainerStyle={styles.pad}>
        <Text style={styles.brand}>Ride</Text>
        <Text style={styles.sub}>{session.phone}</Text>

        <Pressable
          style={styles.btn}
          disabled={busy}
          onPress={() =>
            run('Driver role refreshed', async () => {
              const next = await becomeDriver(
                session.accessToken,
                session.refreshToken,
              );
              setSession({
                ...session,
                accessToken: next.accessToken,
                refreshToken: next.refreshToken,
              });
            })
          }>
          <Text style={styles.btnText}>Apply driver + refresh token</Text>
        </Pressable>

        <Pressable
          style={styles.btn}
          disabled={busy}
          onPress={() =>
            run('Online + location set', async () => {
              await goOnline(session.accessToken);
              await updateLocation(session.accessToken, 27.7172, 85.324);
            })
          }>
          <Text style={styles.btnText}>Go online (needs admin approve)</Text>
        </Pressable>

        <Pressable
          style={styles.btnSecondary}
          disabled={busy}
          onPress={() =>
            run('Offers loaded', async () => {
              const list = await pendingOffers(session.accessToken);
              setOffers(list);
              setMessage(`${list.length} pending offer(s)`);
            })
          }>
          <Text style={styles.btnTextDark}>Refresh offers</Text>
        </Pressable>

        {offers.map(o => (
          <Pressable
            key={o.id}
            style={styles.btn}
            disabled={busy}
            onPress={() =>
              run('Accepted', async () => {
                const accepted = await acceptOffer(session.accessToken, o.id);
                setRide(accepted);
                setOffers([]);
                setMessage(`Ride ${accepted.status}`);
              })
            }>
            <Text style={styles.btnText}>
              Accept offer {o.distanceM ?? '?'}m
            </Text>
          </Pressable>
        ))}

        {ride && (
          <>
            <Pressable
              style={styles.btnSecondary}
              disabled={busy}
              onPress={() =>
                run('Arriving', async () => {
                  setRide(await markArriving(session.accessToken, ride.id));
                })
              }>
              <Text style={styles.btnTextDark}>Arriving</Text>
            </Pressable>
            <Pressable
              style={styles.btnSecondary}
              disabled={busy}
              onPress={() =>
                run('Arrived', async () => {
                  setRide(await markArrived(session.accessToken, ride.id));
                })
              }>
              <Text style={styles.btnTextDark}>Arrived</Text>
            </Pressable>
            <TextInput
              style={styles.input}
              value={pin}
              onChangeText={setPin}
              placeholder="Trip PIN"
              keyboardType="number-pad"
            />
            <Pressable
              style={styles.btn}
              disabled={busy}
              onPress={() =>
                run('Started', async () => {
                  setRide(await startRide(session.accessToken, ride.id, pin));
                })
              }>
              <Text style={styles.btnText}>Start with PIN</Text>
            </Pressable>
            <Pressable
              style={styles.btn}
              disabled={busy}
              onPress={() =>
                run('Completed', async () => {
                  setRide(await completeRide(session.accessToken, ride.id));
                })
              }>
              <Text style={styles.btnText}>Complete</Text>
            </Pressable>
          </>
        )}

        <Text style={styles.msg}>{message}</Text>
        {busy && <ActivityIndicator color="#1A2A4A" />}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {flex: 1, backgroundColor: '#E8EEF5'},
  pad: {padding: 24, gap: 12},
  brand: {
    fontSize: 42,
    fontWeight: '700',
    color: '#1A2A4A',
    letterSpacing: -1,
  },
  sub: {fontSize: 16, color: '#4A5A78', marginBottom: 8},
  input: {
    borderWidth: 1,
    borderColor: '#B8C4D8',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: '#F7FAFF',
    fontSize: 16,
  },
  btn: {
    backgroundColor: '#1A2A4A',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  btnSecondary: {
    backgroundColor: '#D5DEEC',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  btnText: {color: '#E8EEF5', fontWeight: '600', fontSize: 16},
  btnTextDark: {color: '#1A2A4A', fontWeight: '600', fontSize: 16},
  msg: {marginTop: 8, color: '#4A5A78', fontSize: 14},
});
