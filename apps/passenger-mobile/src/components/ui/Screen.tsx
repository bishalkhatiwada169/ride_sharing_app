import React from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type RefreshControlProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {colors, spacing, typography} from '../../theme/tokens';

type Props = {
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  scroll?: boolean;
  right?: React.ReactNode;
  refreshing?: boolean;
  onRefresh?: () => void;
  /** Edge-to-edge content (e.g. map home). Skips default padding. */
  edgeToEdge?: boolean;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
};

export function Screen({
  title,
  subtitle,
  children,
  scroll,
  right,
  refreshing,
  onRefresh,
  edgeToEdge,
  style,
  contentStyle,
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
      ? {refreshing: !!refreshing, onRefresh, tintColor: colors.primary}
      : undefined;

  return (
    <SafeAreaView
      style={[styles.root, style]}
      edges={edgeToEdge ? ['left', 'right'] : ['top', 'left', 'right']}>
      {scroll ? (
        <ScrollView
          contentContainerStyle={[
            edgeToEdge ? styles.padEdge : styles.pad,
            contentStyle,
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          refreshControl={
            refreshProps ? <RefreshControl {...refreshProps} /> : undefined
          }>
          {body}
        </ScrollView>
      ) : (
        <View
          style={[
            edgeToEdge ? styles.padEdge : styles.pad,
            styles.flex,
            contentStyle,
          ]}>
          {body}
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {flex: 1, backgroundColor: colors.background},
  flex: {flex: 1},
  pad: {padding: spacing.lg, gap: spacing.md, flexGrow: 1},
  padEdge: {flexGrow: 1},
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  headerText: {flex: 1, gap: 4},
  title: {...typography.title, color: colors.text},
  subtitle: {...typography.secondary, color: colors.textMuted},
});
