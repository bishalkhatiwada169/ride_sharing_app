import React from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {Icon} from './Icon';
import {colors, elevation, radius, spacing, typography} from '../../theme/tokens';

type Props = {
  onPress: () => void;
  subtitle?: string;
};

/** Signature destination control — search-like, not a form field. */
export function WhereToControl({onPress, subtitle}: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Where to?"
      onPress={onPress}
      style={({pressed}) => [styles.row, pressed && styles.pressed]}>
      <View style={styles.iconWrap}>
        <Icon name="search" size={18} color={colors.primary} />
      </View>
      <View style={styles.copy}>
        <Text style={styles.title}>Where are you going?</Text>
        {subtitle ? <Text style={styles.sub}>{subtitle}</Text> : null}
      </View>
      <View style={styles.go}>
        <Text style={styles.goText}>Go</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 56,
    gap: spacing.md,
    paddingVertical: 2,
  },
  pressed: {opacity: 0.92, transform: [{scale: 0.99}]},
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: {flex: 1, gap: 2},
  title: {...typography.bodyStrong, color: colors.text},
  sub: {...typography.caption, color: colors.textMuted},
  go: {
    backgroundColor: colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.pill,
    ...elevation.sm,
  },
  goText: {
    ...typography.label,
    color: colors.textOnPrimary,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
});
