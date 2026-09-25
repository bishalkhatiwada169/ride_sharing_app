import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {Button} from './Button';
import {colors, spacing, typography} from '../../theme/tokens';

export function EmptyState({
  title,
  message,
  actionLabel,
  onAction,
}: {
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
      {actionLabel && onAction ? (
        <Button label={actionLabel} onPress={onAction} variant="secondary" />
      ) : null}
    </View>
  );
}

export function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.errorTitle}>Something went wrong</Text>
      <Text style={styles.message}>{message}</Text>
      {onRetry ? <Button label="Try again" onPress={onRetry} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {gap: spacing.md, paddingVertical: spacing.xl},
  title: {...typography.subtitle, color: colors.ink},
  errorTitle: {...typography.subtitle, color: colors.danger},
  message: {...typography.body, color: colors.inkSoft},
});
