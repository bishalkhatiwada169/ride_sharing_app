import React, {useRef, useState} from 'react';
import {
  Animated,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {BrandMark} from '../../components/ui/BrandMark';
import {Icon} from '../../components/ui/Icon';
import {useAppMode, type AppMode} from '../../state/ModeContext';
import {
  colors,
  elevation,
  radius,
  spacing,
  typography,
} from '../../theme/tokens';
import type {AuthStackParamList} from '../../navigation/types';

type Props = NativeStackScreenProps<AuthStackParamList, 'RoleSelect'>;

export function RoleSelectScreen({navigation}: Props) {
  const insets = useSafeAreaInsets();
  const {setMode} = useAppMode();
  const passengerScale = useRef(new Animated.Value(1)).current;
  const driverScale = useRef(new Animated.Value(1)).current;

  async function onChoose(mode: AppMode, scale: Animated.Value) {
    Animated.sequence([
      Animated.timing(scale, {
        toValue: 0.97,
        duration: 90,
        useNativeDriver: true,
      }),
      Animated.timing(scale, {
        toValue: 1,
        duration: 120,
        useNativeDriver: true,
      }),
    ]).start();
    await setMode(mode);
    navigation.navigate('Welcome');
  }

  return (
    <View style={[styles.root, {paddingTop: insets.top + spacing.lg}]}>
      <View style={styles.glow} pointerEvents="none" />

      <View style={styles.brand}>
        <BrandMark size="lg" />
        <Text style={styles.tagline}>Modern transport for Kathmandu</Text>
      </View>

      <View style={styles.hero}>
        <Text style={styles.eyebrow}>GET STARTED</Text>
        <Text style={styles.headline}>Who are you today?</Text>
        <Text style={styles.sub}>
          Choose how you want to use the app. You can switch later in Profile.
        </Text>
      </View>

      <View
        style={[
          styles.choices,
          {paddingBottom: Math.max(insets.bottom, spacing.lg)},
        ]}>
        <Animated.View style={{transform: [{scale: passengerScale}]}}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Continue as passenger"
            onPress={() => void onChoose('passenger', passengerScale)}
            style={({pressed}) => [
              styles.card,
              styles.cardPassenger,
              pressed && styles.pressed,
            ]}>
            <View style={styles.iconWrap}>
              <Icon name="car" size={26} color={colors.primary} />
            </View>
            <View style={styles.cardCopy}>
              <Text style={styles.cardTitle}>Passenger</Text>
              <Text style={styles.cardSub}>
                Ride anywhere around Kathmandu
              </Text>
            </View>
            <Icon name="chevronRight" size={18} color={colors.primary} />
          </Pressable>
        </Animated.View>

        <Animated.View style={{transform: [{scale: driverScale}]}}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Continue as driver"
            onPress={() => void onChoose('driver', driverScale)}
            style={({pressed}) => [
              styles.card,
              styles.cardDriver,
              pressed && styles.pressed,
            ]}>
            <View style={[styles.iconWrap, styles.iconDriver]}>
              <Icon name="locate" size={26} color={colors.success} />
            </View>
            <View style={styles.cardCopy}>
              <Text style={styles.cardTitle}>Driver</Text>
              <Text style={styles.cardSub}>Earn by driving with us</Text>
            </View>
            <Icon name="chevronRight" size={18} color={colors.textSecondary} />
          </Pressable>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {flex: 1, backgroundColor: colors.background},
  glow: {
    position: 'absolute',
    top: -100,
    left: -50,
    right: -50,
    height: 380,
    backgroundColor: 'rgba(242, 184, 75, 0.06)',
  },
  brand: {alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.lg},
  tagline: {...typography.secondary, color: colors.textMuted},
  hero: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    gap: spacing.sm,
  },
  eyebrow: {
    ...typography.label,
    color: colors.primary,
    letterSpacing: 1.4,
  },
  headline: {...typography.display, color: colors.text, fontSize: 32},
  sub: {...typography.body, color: colors.textSecondary, lineHeight: 24},
  choices: {paddingHorizontal: spacing.lg, gap: spacing.md},
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    backgroundColor: colors.surfaceElevated,
    ...elevation.sm,
  },
  cardPassenger: {borderColor: 'rgba(242, 184, 75, 0.35)'},
  cardDriver: {borderColor: 'rgba(94, 207, 154, 0.28)'},
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: colors.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconDriver: {backgroundColor: colors.successMuted},
  cardCopy: {flex: 1, gap: 4},
  cardTitle: {...typography.section, color: colors.text},
  cardSub: {...typography.caption, color: colors.textMuted, lineHeight: 18},
  pressed: {opacity: 0.94},
});
