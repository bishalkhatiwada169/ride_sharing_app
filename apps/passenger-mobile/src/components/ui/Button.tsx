import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  type StyleProp,
  type ViewStyle,
  type PressableProps,
} from 'react-native';
import {colors, radius, spacing, typography} from '../../theme/tokens';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';

type Props = Omit<PressableProps, 'style'> & {
  label: string;
  loading?: boolean;
  variant?: Variant;
  style?: StyleProp<ViewStyle>;
};

export function Button({
  label,
  loading,
  variant = 'primary',
  disabled,
  style,
  ...rest
}: Props) {
  const isDisabled = !!(disabled || loading);
  return (
    <Pressable
      accessibilityRole="button"
      disabled={isDisabled}
      style={({pressed}) => [
        styles.base,
        styles[variant],
        pressed && !isDisabled ? styles.pressed : null,
        isDisabled ? styles.disabled : null,
        style,
      ]}
      {...rest}>
      {loading ? (
        <ActivityIndicator
          color={
            variant === 'secondary' || variant === 'ghost'
              ? colors.accent
              : colors.fog
          }
        />
      ) : (
        <Text
          style={[
            styles.label,
            (variant === 'secondary' || variant === 'ghost') && styles.labelDark,
            variant === 'danger' && styles.labelLight,
          ]}>
          {label}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 52,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  primary: {backgroundColor: colors.accent},
  secondary: {backgroundColor: colors.accentMuted},
  danger: {backgroundColor: colors.danger},
  ghost: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.line,
  },
  pressed: {opacity: 0.88},
  disabled: {opacity: 0.5},
  label: {...typography.bodyStrong, color: colors.fog},
  labelDark: {color: colors.ink},
  labelLight: {color: colors.fog},
});
