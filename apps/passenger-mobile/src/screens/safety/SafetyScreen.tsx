import React, {useCallback, useEffect, useState} from 'react';
import {Alert, StyleSheet, Text, View} from 'react-native';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {Screen} from '../../components/ui/Screen';
import {Button} from '../../components/ui/Button';
import {TextField} from '../../components/ui/TextField';
import {EmptyState, ErrorState} from '../../components/ui/EmptyState';
import {Icon} from '../../components/ui/Icon';
import {useAuth} from '../../state/AuthContext';
import {
  listEmergencyContacts,
  saveEmergencyContacts,
  type EmergencyContact,
} from '../../services/safety-api';
import {isValidE164, parseApiError} from '../../utils/format';
import {colors, radius, spacing, typography} from '../../theme/tokens';
import type {RootStackParamList} from '../../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Safety'>;

export function SafetyScreen(_props: Props) {
  const {session} = useAuth();
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!session) {
      return;
    }
    setError(null);
    try {
      setContacts(await listEmergencyContacts(session.accessToken));
    } catch (e) {
      setError(parseApiError(e));
    } finally {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => {
    void load();
  }, [load]);

  async function onAdd() {
    if (!session) {
      return;
    }
    if (!name.trim() || !isValidE164(phone.trim())) {
      Alert.alert('Check details', 'Enter a name and phone like +977…');
      return;
    }
    try {
      const next = [
        ...contacts.map(c => ({
          name: c.name,
          phoneE164: c.phoneE164,
          relationship: c.relationship ?? undefined,
        })),
        {name: name.trim(), phoneE164: phone.trim(), relationship: 'Emergency'},
      ];
      setContacts(await saveEmergencyContacts(session.accessToken, next));
      setName('');
      setPhone('');
    } catch (e) {
      Alert.alert('Couldn’t save', parseApiError(e));
    }
  }

  return (
    <Screen scroll title="Safety">
      <View style={styles.sosBlock}>
        <View style={styles.sosIcon}>
          <Icon name="shield" size={22} color={colors.error} />
        </View>
        <Text style={styles.sosTitle}>Emergency SOS</Text>
        <Text style={styles.sosBody}>
          During an active trip, open the trip screen and tap SOS to alert
          safety operations immediately.
        </Text>
      </View>

      <Text style={styles.section}>Trusted contacts</Text>
      <Text style={styles.sectionHint}>
        People we can help you reach if something goes wrong.
      </Text>

      {error ? (
        <ErrorState message={error} onRetry={load} />
      ) : contacts.length === 0 && !loading ? (
        <EmptyState
          title="No contacts yet"
          message="Add people who should know if something goes wrong."
          icon="shield"
        />
      ) : (
        <View style={styles.group}>
          {contacts.map((c, i) => (
            <View
              key={c.id}
              style={[
                styles.contact,
                i < contacts.length - 1 && styles.contactBorder,
              ]}>
              <Text style={styles.contactName}>{c.name}</Text>
              <Text style={styles.contactMeta}>
                {c.phoneE164}
                {c.relationship ? ` · ${c.relationship}` : ''}
              </Text>
            </View>
          ))}
        </View>
      )}

      <Text style={styles.section}>Add contact</Text>
      <View style={styles.form}>
        <TextField label="Name" value={name} onChangeText={setName} />
        <TextField
          label="Phone"
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
          placeholder="+977…"
        />
        <Button label="Save contact" onPress={onAdd} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  sosBlock: {
    backgroundColor: colors.errorMuted,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(232, 106, 92, 0.35)',
    padding: spacing.lg,
    gap: spacing.sm,
  },
  sosIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(232, 106, 92, 0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sosTitle: {...typography.section, color: colors.error},
  sosBody: {
    ...typography.secondary,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  section: {
    ...typography.label,
    color: colors.textMuted,
    textTransform: 'uppercase',
    marginTop: spacing.sm,
  },
  sectionHint: {
    ...typography.caption,
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  group: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  contact: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    gap: 2,
  },
  contactBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  contactName: {...typography.bodyStrong, color: colors.text},
  contactMeta: {...typography.caption, color: colors.textMuted},
  form: {
    gap: spacing.md,
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: spacing.md,
  },
});
