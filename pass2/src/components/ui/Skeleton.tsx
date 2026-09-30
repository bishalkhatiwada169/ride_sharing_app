import React from 'react';
import {StyleSheet, View, type ViewStyle} from 'react-native';
import {colors, radius} from '../../theme/tokens';

export function Skeleton({
  height = 16,
  width = '100%',
  style,
}: {
  height?: number;
  width?: number | `${number}%`;
  style?: ViewStyle;
}) {
  return <View style={[styles.bone, {height, width}, style]} />;
}

export function SkeletonCard() {
  return (
    <View style={styles.card}>
      <Skeleton height={14} width="40%" />
      <Skeleton height={18} width="85%" />
      <Skeleton height={14} width="60%" />
    </View>
  );
}

const styles = StyleSheet.create({
  bone: {
    backgroundColor: colors.mist,
    borderRadius: radius.sm,
    overflow: 'hidden',
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    gap: 10,
  },
});
