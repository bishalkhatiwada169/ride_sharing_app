import React from 'react';
import {
  Pressable,
  StyleSheet,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import {Icon, type IconName} from './Icon';
import {colors, elevation} from '../../theme/tokens';

const SIZE = 44;

type Props = {
  icon: IconName;
  onPress: () => void;
  accessibilityLabel: string;
  active?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function FloatingMapButton({
  icon,
  onPress,
  accessibilityLabel,
  active,
  style,
}: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      hitSlop={6}
      onPress={onPress}
      style={({pressed}) => [
        styles.btn,
        active && styles.active,
        pressed && styles.pressed,
        style,
      ]}>
      <Icon
        name={icon}
        size={18}
        color={active ? colors.primary : colors.text}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    backgroundColor: colors.glass,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    ...elevation.sm,
  },
  active: {borderColor: colors.primary},
  pressed: {opacity: 0.88, transform: [{scale: 0.96}]},
});
