import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {Env} from '../../config/env';
import {colors, typography} from '../../theme/tokens';

/** Pathao-style wordmark — red brand on light UI. */
export function BrandMark({
  size = 'md',
  light = true,
}: {
  size?: 'sm' | 'md' | 'lg';
  light?: boolean;
}) {
  const fontSize = size === 'lg' ? 26 : size === 'sm' ? 16 : 22;
  return (
    <View style={styles.wrap} accessibilityRole="header">
      <Text
        style={[
          styles.word,
          {fontSize},
          {color: light ? colors.primary : colors.textOnPrimary},
        ]}>
        {Env.brandName}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  word: {
    ...typography.brand,
    color: colors.primary,
  },
});
