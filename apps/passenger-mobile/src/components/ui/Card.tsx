import React from 'react';
import {StyleSheet, View, type ViewProps} from 'react-native';
import {colors, radius, spacing} from '../../theme/tokens';

export function Card({style, children, ...rest}: ViewProps) {
  return (
    <View style={[styles.card, style]} {...rest}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing.md,
    gap: spacing.sm,
  },
});
