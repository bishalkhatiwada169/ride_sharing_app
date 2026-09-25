import React, {useState} from 'react';
import {ActivityIndicator, StyleSheet, Text, View} from 'react-native';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {Screen} from '../../components/ui/Screen';
import {Button} from '../../components/ui/Button';
import {TextField} from '../../components/ui/TextField';
import {Env} from '../../config/env';
import {requestOtp} from '../../services/auth-api';
import {isValidE164, parseApiError} from '../../utils/format';
import {colors, spacing, typography} from '../../theme/tokens';
import type {AuthStackParamList} from '../../navigation/types';

type Props = NativeStackScreenProps<AuthStackParamList, 'Phone'>;

export function PhoneScreen({navigation}: Props) {
  const [phone, setPhone] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onContinue() {
    const value = phone.trim();
    if (!isValidE164(value)) {
      setError('Enter a valid phone in E.164 format (e.g. +97798…)');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await requestOtp(value);
      navigation.navigate('Otp', {phoneE164: value});
    } catch (e) {
      setError(parseApiError(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen scroll title={Env.brandName} subtitle="Passenger">
      <Text style={styles.lead}>Enter your mobile number to continue</Text>
      <TextField
        label="Phone"
        value={phone}
        onChangeText={setPhone}
        placeholder="+97798…"
        keyboardType="phone-pad"
        autoComplete="tel"
        autoCapitalize="none"
        error={error}
      />
      <Button label="Send code" onPress={onContinue} loading={loading} />
      <Text style={styles.hint}>
        We will text a one-time code. Local mock SMS prints the code in backend
        logs.
      </Text>
    </Screen>
  );
}

export function SplashScreen() {
  return (
    <View style={styles.splash}>
      <Text style={styles.brand}>{Env.brandName}</Text>
      <ActivityIndicator color={colors.accent} />
    </View>
  );
}

const styles = StyleSheet.create({
  lead: {...typography.body, color: colors.inkSoft, marginBottom: spacing.sm},
  hint: {...typography.caption, color: colors.inkSoft},
  splash: {
    flex: 1,
    backgroundColor: colors.fog,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
  },
  brand: {...typography.display, color: colors.accent},
});
