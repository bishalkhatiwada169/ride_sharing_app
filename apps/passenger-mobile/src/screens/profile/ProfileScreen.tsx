import React from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {Screen} from '../../components/ui/Screen';
import {Button} from '../../components/ui/Button';
import {BrandMark} from '../../components/ui/BrandMark';
import {Icon} from '../../components/ui/Icon';
import {useAuth} from '../../state/AuthContext';
import {useAppMode} from '../../state/ModeContext';
import {Env} from '../../config/env';
import {colors, radius, spacing, typography} from '../../theme/tokens';

function Row({
  label,
  value,
  onPress,
  last,
}: {
  label: string;
  value?: string;
  onPress?: () => void;
  last?: boolean;
}) {
  const body = (
    <View style={[styles.row, !last && styles.rowBorder]}>
      <View style={styles.rowCopy}>
        <Text style={styles.rowLabel}>{label}</Text>
        {value ? <Text style={styles.rowValue}>{value}</Text> : null}
      </View>
      {onPress ? (
        <Icon name="chevronRight" size={16} color={colors.textMuted} />
      ) : null}
    </View>
  );
  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({pressed}) => pressed && styles.pressed}>
        {body}
      </Pressable>
    );
  }
  return body;
}

export function ProfileScreen() {
  const navigation = useNavigation<any>();
  const {session, signOut} = useAuth();
  const {mode, setMode, clearMode} = useAppMode();
  const user = session?.user;
  const initial = (user?.displayName || user?.phoneE164 || 'P')
    .trim()
    .charAt(0)
    .toUpperCase();

  return (
    <Screen scroll title="Profile">
      <View style={styles.identity}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initial}</Text>
        </View>
        <Text style={styles.name}>{user?.displayName || 'Rider'}</Text>
        <Text style={styles.phone}>{user?.phoneE164 ?? '—'}</Text>
        <Text style={styles.modeBadge}>
          {mode === 'driver' ? 'Driving' : 'Riding'}
        </Text>
      </View>

      <Text style={styles.section}>Mode</Text>
      <View style={styles.group}>
        <Row
          label={
            mode === 'driver' ? 'Switch to Ride mode' : 'Switch to Drive mode'
          }
          value="Same account · one app"
          onPress={() =>
            void setMode(mode === 'driver' ? 'passenger' : 'driver')
          }
          last
        />
      </View>

      <Text style={styles.section}>Account</Text>
      <View style={styles.group}>
        <Row
          label="Personal information"
          value={user?.displayName || 'Rider'}
        />
        <Row label="Phone number" value={user?.phoneE164 ?? '—'} last />
      </View>

      <Text style={styles.section}>Preferences</Text>
      <View style={styles.group}>
        <Row label="Notifications" value="Managed by your device" />
        <Row label="Language" value="English" last />
      </View>

      {mode !== 'driver' ? (
        <>
          <Text style={styles.section}>Safety</Text>
          <View style={styles.group}>
            <Row
              label="Emergency contacts"
              onPress={() => navigation.navigate('Safety')}
              last
            />
          </View>

          <Text style={styles.section}>Support</Text>
          <View style={styles.group}>
            <Row
              label="Help & support"
              onPress={() => navigation.navigate('Support')}
              last
            />
          </View>
        </>
      ) : null}

      <View style={styles.brandFoot}>
        <BrandMark size="sm" />
        <Text style={styles.hint}>{Env.brandName} · Unified app</Text>
      </View>

      <Button
        label="Log out"
        variant="danger"
        onPress={() => {
          void clearMode();
          void signOut();
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  identity: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderStrong,
  },
  avatarText: {...typography.title, color: colors.primary},
  name: {...typography.section, color: colors.text},
  phone: {...typography.secondary, color: colors.textMuted},
  modeBadge: {
    ...typography.label,
    color: colors.primary,
    textTransform: 'uppercase',
    marginTop: 4,
  },
  section: {
    ...typography.label,
    color: colors.textMuted,
    textTransform: 'uppercase',
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  group: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  rowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  rowCopy: {flex: 1, gap: 2},
  rowLabel: {...typography.body, color: colors.text},
  rowValue: {...typography.caption, color: colors.textMuted},
  pressed: {opacity: 0.85},
  brandFoot: {
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  hint: {...typography.caption, color: colors.textMuted},
});
