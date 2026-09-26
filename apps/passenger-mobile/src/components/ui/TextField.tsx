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
        placeholderTextColor={colors.textMuted}
        style={[styles.input, error ? styles.inputError : null, style]}
        {...rest}
      />
      {!!error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {gap: spacing.xs},
  label: {...typography.label, color: colors.textMuted, textTransform: 'uppercase'},
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    minHeight: 52,
    ...typography.body,
    color: colors.text,
  },
  inputError: {borderColor: colors.error},
  error: {...typography.caption, color: colors.error},
});
