import React, {useRef, useState} from 'react';
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
import {useAppMode} from '../../state/ModeContext';
import {requestOtp} from '../../services/auth-api';
import {isValidE164, parseApiError} from '../../utils/format';
import {colors, spacing, typography} from '../../theme/tokens';
import type {AuthStackParamList} from '../../navigation/types';

type Props = NativeStackScreenProps<AuthStackParamList, 'Phone'>;

export function PhoneScreen({navigation}: Props) {
  const insets = useSafeAreaInsets();
  const {mode} = useAppMode();
  const isDriver = mode === 'driver';
  const inputRef = useRef<TextInput>(null);
  const [phone, setPhone] = useState('+977');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onContinue() {
    const value = phone.trim();
    if (!isValidE164(value)) {
      setError('Use full number with country code, e.g. +97798…');
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
          {isDriver ? 'DRIVER LOGIN' : 'PASSENGER LOGIN'}
        </Text>
        <Text style={styles.title}>
          {isDriver ? 'Driver number' : 'Your number'}
        </Text>
        <Text style={styles.sub}>
          {isDriver
            ? 'We’ll text a code so you can go online and receive passenger requests.'
            : 'We’ll text a code. No password to remember.'}
        </Text>

        <Pressable
          onPress={() => inputRef.current?.focus()}
          style={[
            styles.phoneShell,
            isDriver && styles.phoneShellDriver,
          ]}>
          <Text style={styles.prefix}>NP</Text>
          <TextInput
            ref={inputRef}
            value={phone}
            onChangeText={t => {
              setPhone(t);
              setError(null);
            }}
            keyboardType="phone-pad"
            autoComplete="tel"
            autoFocus
            placeholder="+97798…"
            placeholderTextColor={colors.textMuted}
            style={styles.input}
          />
        </Pressable>
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </View>

      <View
        style={[
          styles.footer,
          {paddingBottom: Math.max(insets.bottom, spacing.lg)},
        ]}>
        <Button
          label={isDriver ? 'Send driver code' : 'Send code'}
          onPress={onContinue}
          loading={loading}
        />
      </View>
    </View>
  );
}

export {SplashScreen} from './SplashScreen';

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
  badge: {
    ...typography.label,
    color: colors.primary,
    letterSpacing: 1.2,
  },
  title: {...typography.title, color: colors.text},
  sub: {...typography.body, color: colors.textSecondary, lineHeight: 22},
  phoneShell: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderBottomWidth: 2,
    borderBottomColor: colors.primary,
    paddingVertical: spacing.md,
  },
  phoneShellDriver: {borderBottomColor: colors.success},
  prefix: {...typography.label, color: colors.textMuted},
  input: {
    flex: 1,
    ...typography.title,
    color: colors.text,
    padding: 0,
  },
  error: {...typography.secondary, color: colors.error},
  footer: {paddingHorizontal: spacing.lg},
});
