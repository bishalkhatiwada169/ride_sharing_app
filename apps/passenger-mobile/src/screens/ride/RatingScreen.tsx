import React, {useState} from 'react';
import {Alert, StyleSheet, Text, View} from 'react-native';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {Screen} from '../../components/ui/Screen';
import {Button} from '../../components/ui/Button';
import {TextField} from '../../components/ui/TextField';
import {Card} from '../../components/ui/Card';
import {useAuth} from '../../state/AuthContext';
import {rateRide} from '../../services/ride-api';
import {parseApiError} from '../../utils/format';
import {colors, spacing, typography} from '../../theme/tokens';
import type {RootStackParamList} from '../../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Rating'>;

export function RatingScreen({route, navigation}: Props) {
  const {rideId} = route.params;
  const {session} = useAuth();
  const [score, setScore] = useState(5);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit() {
    if (!session) return;
    setLoading(true);
    setError(null);
    try {
      await rateRide(session.accessToken, rideId, score, comment.trim() || undefined);
      Alert.alert('Thanks', 'Your rating was submitted.', [
        {text: 'Done', onPress: () => navigation.popToTop()},
      ]);
    } catch (e) {
      setError(parseApiError(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen scroll title="Rate your trip" subtitle="How was the ride?">
      <Card>
        <Text style={styles.label}>Score</Text>
        <View style={styles.row}>
          {[1, 2, 3, 4, 5].map(n => (
            <Button
              key={n}
              label={`${n}`}
              variant={score === n ? 'primary' : 'ghost'}
              style={styles.score}
              onPress={() => setScore(n)}
            />
          ))}
        </View>
        <TextField
          label="Comment (optional)"
          value={comment}
          onChangeText={setComment}
          placeholder="Share feedback"
          multiline
        />
        {!!error && <Text style={styles.error}>{error}</Text>}
        <Button label="Submit rating" onPress={onSubmit} loading={loading} />
        <Button
          label="Skip for now"
          variant="ghost"
          onPress={() => navigation.popToTop()}
        />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  label: {...typography.label, color: colors.inkSoft, textTransform: 'uppercase'},
  row: {flexDirection: 'row', gap: spacing.sm},
  score: {flex: 1},
  error: {...typography.caption, color: colors.danger},
});
