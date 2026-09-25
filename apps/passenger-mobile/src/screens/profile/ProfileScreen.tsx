import React from 'react';
import {StyleSheet, Text} from 'react-native';
import type {CompositeScreenProps} from '@react-navigation/native';
import type {BottomTabScreenProps} from '@react-navigation/bottom-tabs';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {Screen} from '../../components/ui/Screen';
import {Card} from '../../components/ui/Card';
import {Button} from '../../components/ui/Button';
import {useAuth} from '../../state/AuthContext';
import {Env} from '../../config/env';
import {colors, typography} from '../../theme/tokens';
import type {MainTabParamList, RootStackParamList} from '../../navigation/types';

type Props = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, 'Profile'>,
  NativeStackScreenProps<RootStackParamList>
>;

export function ProfileScreen({navigation}: Props) {
  const {session, signOut} = useAuth();
  const user = session?.user;

  return (
    <Screen scroll title="Profile" subtitle="Account & settings">
      <Card>
        <Text style={styles.label}>Phone</Text>
        <Text style={styles.value}>{user?.phoneE164 ?? '—'}</Text>
        <Text style={styles.label}>Name</Text>
        <Text style={styles.value}>
          {user?.displayName ?? 'Not set on server'}
        </Text>
        <Text style={styles.hint}>
          Profile editing API is not available yet — display only.
        </Text>
      </Card>

      <Card>
        <Text style={styles.label}>App</Text>
        <Text style={styles.value}>{Env.brandName} Passenger</Text>
        <Text style={styles.hint}>Environment: {Env.environment}</Text>
        <Text style={styles.hint}>API: {Env.apiBaseUrl}</Text>
      </Card>

      <Button
        label="Support"
        variant="secondary"
        onPress={() => navigation.navigate('Support')}
      />
      <Button
        label="Safety"
        variant="ghost"
        onPress={() => navigation.navigate('Safety')}
      />
      <Button label="Sign out" variant="danger" onPress={() => void signOut()} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  label: {...typography.label, color: colors.inkSoft, textTransform: 'uppercase'},
  value: {...typography.bodyStrong, color: colors.ink},
  hint: {...typography.caption, color: colors.inkSoft},
});
