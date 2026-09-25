import React, {useCallback, useEffect, useState} from 'react';
import {Alert, StyleSheet, Text} from 'react-native';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {Screen} from '../../components/ui/Screen';
import {Card} from '../../components/ui/Card';
import {Button} from '../../components/ui/Button';
import {TextField} from '../../components/ui/TextField';
import {EmptyState, ErrorState} from '../../components/ui/EmptyState';
import {useAuth} from '../../state/AuthContext';
import {
  createTicket,
  listMyTickets,
  type SupportTicket,
} from '../../services/support-api';
import {parseApiError} from '../../utils/format';
import {colors, typography} from '../../theme/tokens';
import type {RootStackParamList} from '../../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Support'>;

export function SupportScreen(_props: Props) {
  const {session} = useAuth();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!session) return;
    try {
      setTickets(await listMyTickets(session.accessToken));
      setError(null);
    } catch (e) {
      setError(parseApiError(e));
    } finally {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => {
    void load();
  }, [load]);

  async function onCreate() {
    if (!session) return;
    if (!subject.trim()) {
      Alert.alert('Subject required');
      return;
    }
    try {
      await createTicket(session.accessToken, {
        category: 'GENERAL',
        subject: subject.trim(),
        description: description.trim() || undefined,
        priority: 'NORMAL',
      });
      setSubject('');
      setDescription('');
      await load();
      Alert.alert('Ticket submitted');
    } catch (e) {
      Alert.alert('Failed', parseApiError(e));
    }
  }

  return (
    <Screen scroll title="Support" subtitle="Help with your trips">
      <Card>
        <TextField
          label="Subject"
          value={subject}
          onChangeText={setSubject}
          placeholder="Brief summary"
        />
        <TextField
          label="Details"
          value={description}
          onChangeText={setDescription}
          placeholder="What happened?"
          multiline
        />
        <Button label="Submit ticket" onPress={onCreate} />
      </Card>

      <Text style={styles.section}>Your tickets</Text>
      {error ? (
        <ErrorState message={error} onRetry={load} />
      ) : tickets.length === 0 && !loading ? (
        <EmptyState title="No tickets" message="Support requests will appear here." />
      ) : (
        tickets.map(t => (
          <Card key={t.id}>
            <Text style={styles.title}>{t.subject}</Text>
            <Text style={styles.meta}>
              {t.status} · {t.category} ·{' '}
              {new Date(t.createdAt).toLocaleString()}
            </Text>
          </Card>
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: {...typography.label, color: colors.inkSoft, textTransform: 'uppercase'},
  title: {...typography.bodyStrong, color: colors.ink},
  meta: {...typography.caption, color: colors.inkSoft},
});
