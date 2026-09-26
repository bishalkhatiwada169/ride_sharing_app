import React, {useEffect, useRef} from 'react';
import {Animated, StyleSheet, Text} from 'react-native';
import {colors, spacing, typography} from '../../theme/tokens';

type Props = {
  text: string;
};

/** Soft crossfade when ride status copy changes. */
export function AnimatedStatus({text}: Props) {
  const opacity = useRef(new Animated.Value(1)).current;
  const prev = useRef(text);

  useEffect(() => {
    if (prev.current === text) {
      return;
    }
    prev.current = text;
    opacity.setValue(0);
    Animated.timing(opacity, {
      toValue: 1,
      duration: 220,
      useNativeDriver: true,
    }).start();
  }, [opacity, text]);

  return (
    <Animated.View style={{opacity}}>
      <Text style={styles.text}>{text}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  text: {...typography.section, color: colors.text, marginBottom: spacing.xs},
});
