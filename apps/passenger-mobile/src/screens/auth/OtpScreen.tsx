import React, {useState} from 'react';
import {StyleSheet, Text} from 'react-native';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {Screen} from '../../components/ui/Screen';
import {Button} from '../../components/ui/Button';
import {TextField} from '../../components/ui/TextField';
import {verifyOtp, requestOtp} from '../../services/auth-api';
import {useAuth} from '../../state/AuthContext';
import {parseApiError} from '../../utils/format';
import {colors, spacing, typography} from '../../theme/tokens';
import type {AuthStackParamList} from '../../navigation/types';

type Props = NativeStackScreenProps<AuthStackParamList, 'Otp'>;

export function OtpScreen({route, navigation}: Props) {
  const {phoneE164} = route.params;
  const {signIn} = useAuth();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  async function onVerify() {
    if (code.trim().length < 4) {
      setError('Enter the code from your SMS');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const tokens = await verifyOtp(phoneE164, code.trim());
      await signIn(tokens);
    } catch (e) {
      setError(parseApiError(e));
    } finally {
      setLoading(false);
    }
  }

  async function onResend() {
    setResending(true);
    setError(null);
    try {
      await requestOtp(phoneE164);
    } catch (e) {
      setError(parseApiError(e));
    } finally {
      setResending(false);
    }
  }

  return (
    <Screen
      scroll
      title="Verify"
      subtitle={phoneE164}
      right={
        <Button
          label="Edit"
          variant="ghost"
          onPress={() => navigation.goBack()}
        />
      }>
      <Text style={styles.lead}>Enter the one-time code</Text>
      <TextField
        label="Code"
        value={code}
        onChangeText={setCode}
        keyboardType="number-pad"
        maxLength={8}
        error={error}
      />
      <Button label="Verify & continue" onPress={onVerify} loading={loading} />
      <Button
        label="Resend code"
        variant="secondary"
        onPress={onResend}
        loading={resending}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  lead: {...typography.body, color: colors.inkSoft, marginBottom: spacing.sm},
});
