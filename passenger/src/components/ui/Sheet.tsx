import React, {useEffect, useRef} from 'react';
import {
  Animated,
  LayoutAnimation,
  Platform,
  Pressable,
  StyleSheet,
  UIManager,
  View,
  type ViewProps,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {colors, elevation, radius, spacing} from '../../theme/tokens';

if (
  Platform.OS === 'android' &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type RideSheetProps = ViewProps & {
  expanded?: boolean;
  onToggle?: () => void;
  collapsedChildren: React.ReactNode;
  expandedChildren?: React.ReactNode;
  floating?: boolean;
};

export function RideSheet({
  expanded = false,
  onToggle,
  collapsedChildren,
  expandedChildren,
  floating = false,
  style,
  ...rest
}: RideSheetProps) {
  const insets = useSafeAreaInsets();
  const handleOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    LayoutAnimation.configureNext({
      duration: 260,
      update: {
        type: LayoutAnimation.Types.spring,
        springDamping: 0.85,
      },
      create: {
        type: LayoutAnimation.Types.easeInEaseOut,
        property: LayoutAnimation.Properties.opacity,
      },
      delete: {
        type: LayoutAnimation.Types.easeInEaseOut,
        property: LayoutAnimation.Properties.opacity,
      },
    });
  }, [expanded]);

  return (
    <View
      style={[
        styles.sheet,
        floating && styles.floating,
        {paddingBottom: Math.max(insets.bottom, spacing.md)},
        style,
      ]}
      {...rest}>
      {onToggle ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={expanded ? 'Collapse' : 'Expand'}
          onPress={() => {
            Animated.sequence([
              Animated.timing(handleOpacity, {
                toValue: 0.4,
                duration: 60,
                useNativeDriver: true,
              }),
              Animated.timing(handleOpacity, {
                toValue: 1,
                duration: 80,
                useNativeDriver: true,
              }),
            ]).start();
            onToggle();
          }}
          hitSlop={16}
          style={styles.handleHit}>
          <Animated.View style={[styles.handle, {opacity: handleOpacity}]} />
        </Pressable>
      ) : (
        <View style={styles.handleHit}>
          <View style={styles.handle} />
        </View>
      )}
      {collapsedChildren}
      {expanded ? expandedChildren : null}
    </View>
  );
}

export function BottomSheet({
  children,
  style,
  handle = true,
  floating = false,
  ...rest
}: ViewProps & {handle?: boolean; floating?: boolean}) {
  const insets = useSafeAreaInsets();
  return (
    <View
      style={[
        styles.sheet,
        floating && styles.floating,
        {paddingBottom: Math.max(insets.bottom, spacing.md)},
        style,
      ]}
      {...rest}>
      {handle ? (
        <View style={styles.handleHit}>
          <View style={styles.handle} />
        </View>
      ) : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: {
    backgroundColor: colors.glass,
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    paddingHorizontal: spacing.lg,
    paddingTop: 0,
    gap: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    ...elevation.md,
  },
  floating: {
    marginHorizontal: spacing.md,
    borderRadius: radius.sheet,
    marginBottom: spacing.sm,
  },
  handleHit: {
    alignItems: 'center',
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  handle: {
    width: 36,
    height: 3,
    borderRadius: radius.pill,
    backgroundColor: colors.borderStrong,
  },
});
