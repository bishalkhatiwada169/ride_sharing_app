import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {colors, spacing, typography} from '../../theme/tokens';

type Props = {
  pickupLabel: string;
  destinationLabel: string;
  compact?: boolean;
};

export function LocationRow({
  pickupLabel,
  destinationLabel,
  compact,
}: Props) {
  return (
    <View style={[styles.row, compact && styles.compact]}>
      <View style={styles.rail}>
        <View style={styles.dotPickup} />
        <View style={styles.line} />
        <View style={styles.dotDrop} />
      </View>
      <View style={styles.copy}>
        <Text style={styles.label}>Pickup</Text>
        <Text style={styles.value} numberOfLines={2}>
          {pickupLabel}
        </Text>
        <Text style={[styles.label, styles.destGap]}>Destination</Text>
        <Text style={styles.value} numberOfLines={2}>
          {destinationLabel}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {flexDirection: 'row', gap: spacing.md},
  compact: {gap: spacing.sm},
  rail: {width: 12, alignItems: 'center', paddingTop: 5},
  dotPickup: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  line: {
    width: 1,
    flexGrow: 1,
    minHeight: 20,
    backgroundColor: colors.borderStrong,
    marginVertical: 5,
  },
  dotDrop: {
    width: 8,
    height: 8,
    borderRadius: 2,
    backgroundColor: colors.text,
  },
  copy: {flex: 1},
  label: {...typography.caption, color: colors.textMuted},
  value: {...typography.bodyStrong, color: colors.text},
  destGap: {marginTop: spacing.sm},
});
