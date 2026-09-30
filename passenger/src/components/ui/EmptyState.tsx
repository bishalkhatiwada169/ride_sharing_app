import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {Button} from './Button';
import {Icon, type IconName} from './Icon';
import {colors, radius, spacing, typography} from '../../theme/tokens';

export function EmptyState({
  title,
  message,
  actionLabel,
  onAction,
  icon = 'search',
}: {
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: IconName;
}) {
  return (
    <View style={styles.wrap}>
      <View style={styles.iconWrap}>
        <Icon name={icon} size={28} color={colors.primary} />
      </View>
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
  title = 'Something went wrong',
}: {
  message: string;
  onRetry?: () => void;
  title?: string;
}) {
  return (
    <View style={styles.wrap}>
      <View style={[styles.iconWrap, styles.iconError]}>
        <Icon name="close" size={22} color={colors.error} />
      </View>
      <Text style={styles.errorTitle}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
      {onRetry ? <Button label="Try again" onPress={onRetry} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.md,
    paddingVertical: spacing.xl,
    alignItems: 'stretch',
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: radius.lg,
    backgroundColor: colors.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  iconError: {backgroundColor: colors.errorMuted},
  title: {...typography.section, color: colors.text},
  errorTitle: {...typography.section, color: colors.error},
  message: {...typography.body, color: colors.textSecondary, lineHeight: 22},
});
