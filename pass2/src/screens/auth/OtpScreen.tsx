import React, {useEffect, useRef, useState} from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {BrandMark} from '../../components/ui/BrandMark';
import {Button} from '../../components/ui/Button';
import {FloatingMapButton} from '../../components/ui/FloatingMapButton';
import {verifyOtp, requestOtp} from '../../services/auth-api';
import {useAuth} from '../../state/AuthContext';
import {useAppMode} from '../../state/ModeContext';
import {parseApiError} from '../../utils/format';
import {colors, radius, spacing, typography} from '../../theme/tokens';
import type {AuthStackParamList} from '../../navigation/types';

type Props = NativeStackScreenProps<AuthStackParamList, 'Otp'>;

const LEN = 6;
const RESEND_SECONDS = 30;

export function OtpScreen({route, navigation}: Props) {
  const {phoneE164} = route.params;
  const insets = useSafeAreaInsets();
  const {signIn} = useAuth();
  const {mode} = useAppMode();
  const isDriver = mode === 'driver';
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(RESEND_SECONDS);
  const hiddenRef = useRef<TextInput>(null);

  useEffect(() => {
    if (secondsLeft <= 0) {
      return;
    }
    const id = setTimeout(() => setSecondsLeft(s => s - 1), 1000);
    return () => clearTimeout(id);
  }, [secondsLeft]);

  async function submit(next: string) {
    if (next.length < 4) {
      setError('Enter the code we sent you');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const tokens = await verifyOtp(phoneE164, next);
      await signIn(tokens);
    } catch (e) {
      setError(parseApiError(e));
    } finally {
      setLoading(false);
    }
  }

  async function onResend() {
    if (secondsLeft > 0 || resending) {
      return;
    }
    setResending(true);
    setError(null);
    try {
      await requestOtp(phoneE164);
      setSecondsLeft(RESEND_SECONDS);
      setCode('');
    } catch (e) {
      setError(parseApiError(e));
    } finally {
      setResending(false);
    }
  }

  const digits = Array.from({length: LEN}, (_, i) => code[i] ?? '');
  const canResend = secondsLeft <= 0 && !resending;

  return (
    <View style={[styles.root, {paddingTop: insets.top + spacing.sm}]}>
      <View style={styles.top}>
        <FloatingMapButton
          icon="chevronRight"
          accessibilityLabel="Back"
          onPress={() => navigation.goBack()}
          style={styles.back}
        />
        <BrandMark size="sm" />
        <View style={styles.spacer} />
      </View>

      <View style={styles.body}>
        <Text style={styles.badge}>
          {isDriver ? 'DRIVER' : 'PASSENGER'}
        </Text>
        <Text style={styles.title}>
          {isDriver ? 'Verify to drive' : 'Enter your code'}
        </Text>
        <Text style={styles.sub}>
          Sent to <Text style={styles.phone}>{phoneE164}</Text>
        </Text>

        <Pressable
          onPress={() => hiddenRef.current?.focus()}
          style={styles.slots}>
          {digits.map((d, i) => (
            <View
              key={i}
              style={[
                styles.slot,
                code.length === i && styles.slotActive,
                loading && styles.slotBusy,
              ]}>
              <Text style={styles.digit}>{d}</Text>
            </View>
          ))}
        </Pressable>

        <TextInput
          ref={hiddenRef}
          value={code}
          onChangeText={t => {
            const next = t.replace(/\D/g, '').slice(0, LEN);
            setCode(next);
            setError(null);
            if (next.length === LEN) {
              void submit(next);
            }
          }}
          keyboardType="number-pad"
          textContentType="oneTimeCode"
          autoFocus
          editable={!loading}
          style={styles.hidden}
          caretHidden
        />

        {loading ? (
          <Text style={styles.verifying}>Verifying…</Text>
        ) : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Pressable onPress={onResend} disabled={!canResend} hitSlop={8}>
          <Text style={[styles.resend, !canResend && styles.resendDisabled]}>
            {resending
              ? 'Sending…'
              : canResend
                ? 'Resend code'
                : `Resend in ${secondsLeft}s`}
          </Text>
        </Pressable>
      </View>

      <View
        style={[
          styles.footer,
          {paddingBottom: Math.max(insets.bottom, spacing.lg)},
        ]}>
        <Button
          label={loading ? 'Verifying…' : 'Verify'}
          onPress={() => void submit(code)}
          loading={loading}
          disabled={code.length < 4}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {flex: 1, backgroundColor: colors.background},
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
  },
  back: {transform: [{rotate: '180deg'}]},
  spacer: {width: 44},
  body: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xxl,
    gap: spacing.md,
  },
  badge: {...typography.label, color: colors.primary, letterSpacing: 1.2},
  title: {...typography.title, color: colors.text},
  sub: {...typography.body, color: colors.textSecondary, lineHeight: 22},
  phone: {color: colors.text, fontWeight: '600'},
  slots: {flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md},
  slot: {
    flex: 1,
    aspectRatio: 0.85,
    maxHeight: 56,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceElevated,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  slotActive: {borderColor: colors.primary},
  slotBusy: {opacity: 0.7},
  digit: {...typography.numeric, color: colors.text},
  hidden: {position: 'absolute', opacity: 0, height: 0, width: 0},
  verifying: {...typography.secondary, color: colors.textMuted},
  error: {...typography.secondary, color: colors.error},
  resend: {...typography.bodyStrong, color: colors.primary},
  resendDisabled: {color: colors.textMuted},
  footer: {paddingHorizontal: spacing.lg},
});
