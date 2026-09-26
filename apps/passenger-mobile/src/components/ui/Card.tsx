import React from 'react';
import {StyleSheet, View, type ViewProps} from 'react-native';
import {colors, elevation, radius, spacing} from '../../theme/tokens';

type Variant = 'outline' | 'elevated' | 'flat';

type Props = ViewProps & {
  variant?: Variant;
  padded?: boolean;
};

export function Card({
  style,
  children,
  variant = 'outline',
  padded = true,
  ...rest
}: Props) {
  return (
    <View
      style={[
        styles.base,
        padded && styles.padded,
        variant === 'outline' && styles.outline,
        variant === 'elevated' && styles.elevated,
        variant === 'flat' && styles.flat,
        style,
      ]}
      {...rest}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    gap: spacing.sm,
  },
  padded: {padding: spacing.md},
  outline: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  elevated: {
    ...elevation.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  flat: {
    backgroundColor: colors.mist,
    borderWidth: 0,
  },
});
