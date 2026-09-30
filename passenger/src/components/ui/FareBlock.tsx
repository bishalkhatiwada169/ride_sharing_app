import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {colors, spacing, typography} from '../../theme/tokens';

type Props = {
  rideLabel: string;
  fare: string;
  meta?: string;
};

export function FareBlock({rideLabel, fare, meta}: Props) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.ride}>{rideLabel}</Text>
      <Text style={styles.fare}>{fare}</Text>
      {meta ? <Text style={styles.meta}>{meta}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {gap: 4, paddingVertical: spacing.xs},
  ride: {...typography.secondary, color: colors.textSecondary},
  fare: {...typography.price, color: colors.text},
  meta: {...typography.caption, color: colors.textMuted},
});
