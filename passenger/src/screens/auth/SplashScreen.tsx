import React from 'react';
import {ActivityIndicator, StyleSheet, Text, View} from 'react-native';
import {BrandMark} from '../../components/ui/BrandMark';
import {colors, spacing, typography} from '../../theme/tokens';

export function SplashScreen() {
  return (
    <View style={styles.splash}>
      <BrandMark size="lg" />
      <Text style={styles.splashSub}>Move through the valley</Text>
      <ActivityIndicator color={colors.primary} style={{marginTop: spacing.lg}} />
    </View>
  );
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  splashSub: {...typography.secondary, color: colors.textMuted},
});
