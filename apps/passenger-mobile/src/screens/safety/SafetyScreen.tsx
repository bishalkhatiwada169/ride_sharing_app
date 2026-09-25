import React, {useCallback, useEffect, useState} from 'react';
import {Alert, StyleSheet, Text} from 'react-native';
import type {BottomTabScreenProps} from '@react-navigation/bottom-tabs';
import {Screen} from '../../components/ui/Screen';
import {Card} from '../../components/ui/Card';
import {Button} from '../../components/ui/Button';
import {TextField} from '../../components/ui/TextField';
import {EmptyState, ErrorState} from '../../components/ui/EmptyState';
import {useAuth} from '../../state/AuthContext';
import {
  listEmergencyContacts,
  saveEmergencyContacts,
  type EmergencyContact,
} from '../../services/safety-api';
import {isValidE164, parseApiError} from '../../utils/format';
import {colors, spacing, typography} from '../../theme/tokens';
import type {MainTabParamList} from '../../navigation/types';

type Props = BottomTabScreenProps<MainTabParamList, 'Safety'>;

export function SafetyScreen(_props: Props) {
  const {session} = useAuth();
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!session) return;
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
    if (!session) return;
    if (!name.trim() || !isValidE164(phone.trim())) {
      Alert.alert('Invalid contact', 'Name and E.164 phone are required.');
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
      const saved = await saveEmergencyContacts(session.accessToken, next);
      setContacts(saved);
      setName('');
      setPhone('');
    } catch (e) {
      Alert.alert('Save failed', parseApiError(e));
    }
  }

  return (
    <Screen scroll title="Safety" subtitle="Emergency contacts & trip tools">
      <Card>
        <Text style={styles.title}>SOS</Text>
        <Text style={styles.meta}>
          During an active trip, open the trip screen and use SOS after
          confirmation. Accidental SOS is discouraged.
        </Text>
      </Card>

      <Text style={styles.section}>Emergency contacts</Text>
      {error ? (
        <ErrorState message={error} onRetry={load} />
      ) : contacts.length === 0 && !loading ? (
        <EmptyState
          title="No contacts yet"
          message="Add people who should be reachable in an emergency."
        />
      ) : (
        contacts.map(c => (
          <Card key={c.id}>
            <Text style={styles.title}>{c.name}</Text>
            <Text style={styles.meta}>
              {c.phoneE164}
              {c.relationship ? ` · ${c.relationship}` : ''}
            </Text>
          </Card>
        ))
      )}

      <TextField label="Name" value={name} onChangeText={setName} />
      <TextField
        label="Phone E.164"
        value={phone}
        onChangeText={setPhone}
        keyboardType="phone-pad"
        placeholder="+977…"
      />
      <Button label="Save contact" onPress={onAdd} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: {...typography.bodyStrong, color: colors.ink},
  meta: {...typography.caption, color: colors.inkSoft},
  section: {
    ...typography.label,
    color: colors.inkSoft,
    textTransform: 'uppercase',
    marginTop: spacing.sm,
  },
});
