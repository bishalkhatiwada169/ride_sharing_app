import React from 'react';
import {StyleSheet, Text, TextInput, View, type TextInputProps} from 'react-native';
import {colors, radius, spacing, typography} from '../../theme/tokens';

type Props = TextInputProps & {
  label: string;
  error?: string | null;
};

export function TextField({label, error, style, ...rest}: Props) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        placeholderTextColor={colors.mapPlaceholderInk}
        style={[styles.input, error ? styles.inputError : null, style]}
        {...rest}
      />
      {!!error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {gap: spacing.xs},
  label: {...typography.label, color: colors.inkSoft, textTransform: 'uppercase'},
  input: {
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    ...typography.body,
    color: colors.ink,
  },
  inputError: {borderColor: colors.danger},
  error: {...typography.caption, color: colors.danger},
});
