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
      accessibilityState={{disabled: isDisabled, busy: !!loading}}
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
            variant === 'primary' ? colors.textOnPrimary : colors.primary
          }
        />
      ) : (
        <Text
          style={[
            styles.label,
            variant === 'primary' && styles.labelOnPrimary,
            (variant === 'secondary' || variant === 'ghost') && styles.labelLight,
            variant === 'danger' && styles.labelOnPrimary,
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
  primary: {backgroundColor: colors.primary},
  secondary: {
    backgroundColor: colors.glass,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderStrong,
  },
  danger: {backgroundColor: colors.error},
  ghost: {
    backgroundColor: 'transparent',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderStrong,
  },
  pressed: {opacity: 0.9, transform: [{scale: 0.98}]},
  disabled: {opacity: 0.45},
  label: {...typography.button, color: colors.text},
  labelOnPrimary: {color: colors.textOnPrimary},
  labelLight: {color: colors.text},
});
