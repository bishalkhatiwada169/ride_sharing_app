import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {colors, radius, spacing, typography} from '../../theme/tokens';
import {formatStatusLabel, type RideStatus} from '../../types/ride';

export function StatusChip({status}: {status: RideStatus}) {
  const tone = toneFor(status);
  return (
    <View style={[styles.chip, {backgroundColor: tone.bg}]}>
      <Text style={[styles.text, {color: tone.fg}]}>{formatStatusLabel(status)}</Text>
    </View>
  );
}

function toneFor(status: RideStatus): {bg: string; fg: string} {
  switch (status) {
    case 'RIDE_COMPLETED':
      return {bg: colors.successMuted, fg: colors.success};
    case 'RIDE_STARTED':
    case 'DRIVER_ARRIVING':
    case 'DRIVER_ARRIVED':
    case 'DRIVER_ACCEPTED':
      return {bg: colors.primaryMuted, fg: colors.primary};
    case 'SEARCHING_DRIVER':
    case 'REQUESTED':
      return {bg: colors.warningMuted, fg: colors.warning};
    case 'CANCELLED_BY_PASSENGER':
    case 'CANCELLED_BY_DRIVER':
    case 'NO_DRIVER_FOUND':
    case 'EXPIRED':
    case 'PAYMENT_FAILED':
      return {bg: colors.errorMuted, fg: colors.error};
    default:
      return {bg: colors.mist, fg: colors.textMuted};
  }
}

const styles = StyleSheet.create({
  chip: {
    alignSelf: 'flex-start',
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm + 4,
    paddingVertical: spacing.xs + 2,
  },
  text: {...typography.caption, fontWeight: '700'},
});
