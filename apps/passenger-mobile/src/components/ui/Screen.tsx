import React from 'react';
import {
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type RefreshControlProps,
} from 'react-native';
import {colors, spacing, typography} from '../../theme/tokens';

type Props = {
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  scroll?: boolean;
  right?: React.ReactNode;
  refreshing?: boolean;
  onRefresh?: () => void;
};

export function Screen({
  title,
  subtitle,
  children,
  scroll,
  right,
  refreshing,
  onRefresh,
}: Props) {
  const body = (
    <>
      {(title || right) && (
        <View style={styles.header}>
          <View style={styles.headerText}>
            {!!title && <Text style={styles.title}>{title}</Text>}
            {!!subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
          </View>
          {right}
        </View>
      )}
      {children}
    </>
  );

  const refreshProps: RefreshControlProps | undefined =
    onRefresh != null
      ? {refreshing: !!refreshing, onRefresh, tintColor: colors.accent}
      : undefined;

  return (
    <SafeAreaView style={styles.root}>
      {scroll ? (
        <ScrollView
          contentContainerStyle={styles.pad}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            refreshProps ? <RefreshControl {...refreshProps} /> : undefined
          }>
          {body}
        </ScrollView>
      ) : (
        <View style={[styles.pad, styles.flex]}>{body}</View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {flex: 1, backgroundColor: colors.fog},
  flex: {flex: 1},
  pad: {padding: spacing.lg, gap: spacing.md, flexGrow: 1},
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  headerText: {flex: 1, gap: 4},
  title: {...typography.title, color: colors.ink},
  subtitle: {...typography.caption, color: colors.inkSoft},
});
