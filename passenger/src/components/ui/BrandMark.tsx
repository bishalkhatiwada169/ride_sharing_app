import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {Env} from '../../config/env';
import {colors, typography} from '../../theme/tokens';

/** Shared brand wordmark — restrained, cinematic. */
export function BrandMark({
  size = 'md',
  light = true,
}: {
  size?: 'sm' | 'md' | 'lg';
  light?: boolean;
}) {
  const fontSize = size === 'lg' ? 22 : size === 'sm' ? 13 : 15;
  return (
    <View style={styles.wrap} accessibilityRole="header">
      <View style={styles.mark} />
      <Text
        style={[
          styles.word,
          {fontSize, letterSpacing: size === 'lg' ? 4 : 3.2},
          {color: light ? colors.text : colors.textOnPrimary},
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
    gap: 8,
  },
  mark: {
    width: 7,
    height: 7,
    borderRadius: 2,
    backgroundColor: colors.primary,
    transform: [{rotate: '45deg'}],
  },
  word: {
    ...typography.brand,
    textShadowColor: 'rgba(0,0,0,0.55)',
    textShadowOffset: {width: 0, height: 1},
    textShadowRadius: 8,
  },
});
