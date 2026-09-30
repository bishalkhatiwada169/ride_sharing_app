import React from 'react';
import {
  Alert,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {BrandMark} from '../../components/ui/BrandMark';
import {FloatingMapButton} from '../../components/ui/FloatingMapButton';
import {useAppMode} from '../../state/ModeContext';
import {Env} from '../../config/env';
import {
  colors,
  elevation,
  radius,
  spacing,
  typography,
} from '../../theme/tokens';
import type {AuthStackParamList} from '../../navigation/types';

type Props = NativeStackScreenProps<AuthStackParamList, 'Welcome'>;

/**
 * Role-specific login methods — shown after Passenger / Driver choice.
 */
export function WelcomeScreen({navigation}: Props) {
  const insets = useSafeAreaInsets();
  const {mode} = useAppMode();
  const isDriver = mode === 'driver';

  function onPhone() {
    navigation.navigate('Phone');
  }

  function onGoogle() {
    Alert.alert(
      'Continue with Google',
      Env.googleWebClientId
        ? 'Google Sign-In will open next.'
        : 'Add your Google Web Client ID to enable Google Sign-In. Phone works now.',
      [
        {text: 'Use phone', onPress: onPhone},
        {text: 'OK', style: 'cancel'},
      ],
    );
  }

  function onApple() {
    if (Platform.OS !== 'ios') {
      Alert.alert(
        'Apple Sign-In',
        'Available on iPhone. Use phone or Google on Android.',
      );
      return;
    }
    Alert.alert('Continue with Apple', 'Use phone for now on this build.', [
      {text: 'Use phone', onPress: onPhone},
      {text: 'OK', style: 'cancel'},
    ]);
  }

  return (
    <View style={styles.root}>
      <View
        style={[
          styles.glow,
          isDriver ? styles.glowDriver : styles.glowPassenger,
        ]}
        pointerEvents="none"
      />

      <View style={[styles.top, {paddingTop: insets.top + spacing.sm}]}>
        <FloatingMapButton
          icon="chevronRight"
          accessibilityLabel="Change role"
          onPress={() => navigation.navigate('RoleSelect')}
          style={styles.back}
        />
        <BrandMark size="sm" />
        <View style={styles.spacer} />
      </View>

      <View style={styles.heroCopy}>
        <Text style={styles.badge}>
          {isDriver ? 'DRIVER' : 'PASSENGER'}
        </Text>
        <Text style={styles.headline}>
          {isDriver ? 'Ready to earn?' : 'Welcome'}
        </Text>
        <Text style={styles.sub}>
          {isDriver
            ? 'Sign in to go online and receive passenger trip requests near you.'
            : 'Enter your phone to book rides across Kathmandu.'}
        </Text>
      </View>

      <View
        style={[
          styles.sheet,
          isDriver && styles.sheetDriver,
          {paddingBottom: Math.max(insets.bottom, spacing.lg)},
        ]}>
        <Pressable
          onPress={onPhone}
          style={({pressed}) => [
            styles.primary,
            isDriver && styles.primaryDriver,
            pressed && styles.pressed,
          ]}>
          <Text
            style={[
              styles.primaryText,
              isDriver && styles.primaryTextDriver,
            ]}>
            {isDriver ? 'Driver phone login' : 'Continue with phone'}
          </Text>
        </Pressable>

        <View style={styles.dividerRow}>
          <View style={styles.line} />
          <Text style={styles.or}>or</Text>
          <View style={styles.line} />
        </View>

        <Pressable
          onPress={onGoogle}
          style={({pressed}) => [styles.social, pressed && styles.pressed]}>
          <Text style={styles.socialG}>G</Text>
          <Text style={styles.socialText}>Continue with Google</Text>
        </Pressable>

        {Platform.OS === 'ios' ? (
          <Pressable
            onPress={onApple}
            style={({pressed}) => [styles.social, pressed && styles.pressed]}>
            <Text style={styles.socialText}>Continue with Apple</Text>
          </Pressable>
        ) : null}

        <Pressable onPress={() => navigation.navigate('RoleSelect')} hitSlop={8}>
          <Text style={styles.switchRole}>
            {isDriver ? 'I want to ride instead' : 'I want to drive instead'}
          </Text>
        </Pressable>

        <Text style={styles.legal}>
          By continuing you agree to Ride’s Terms and Privacy Policy.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {flex: 1, backgroundColor: colors.background},
  glow: {
    position: 'absolute',
    top: -40,
    left: -60,
    right: -60,
    height: 420,
  },
  glowPassenger: {backgroundColor: 'rgba(242, 184, 75, 0.09)'},
  glowDriver: {backgroundColor: 'rgba(94, 207, 154, 0.07)'},
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
  },
  back: {transform: [{rotate: '180deg'}]},
  spacer: {width: 44},
  heroCopy: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    gap: spacing.sm,
  },
  badge: {
    ...typography.label,
    color: colors.primary,
    letterSpacing: 1.4,
  },
  headline: {...typography.display, color: colors.text, fontSize: 34},
  sub: {...typography.body, color: colors.textSecondary, lineHeight: 24},
  sheet: {
    backgroundColor: colors.glass,
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    gap: spacing.md,
    ...elevation.md,
  },
  sheetDriver: {
    borderColor: 'rgba(94, 207, 154, 0.25)',
  },
  primary: {
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    minHeight: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryDriver: {backgroundColor: colors.success},
  primaryText: {...typography.button, color: colors.textOnPrimary},
  primaryTextDriver: {color: colors.background},
  dividerRow: {flexDirection: 'row', alignItems: 'center', gap: spacing.sm},
  line: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
  },
  or: {...typography.caption, color: colors.textMuted},
  social: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    minHeight: 52,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceElevated,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderStrong,
  },
  socialG: {
    ...typography.button,
    color: colors.primary,
    width: 22,
    textAlign: 'center',
  },
  socialText: {...typography.bodyStrong, color: colors.text},
  pressed: {opacity: 0.9, transform: [{scale: 0.99}]},
  switchRole: {
    ...typography.bodyStrong,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  legal: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 16,
  },
});
