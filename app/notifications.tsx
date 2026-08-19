import { useCallback, useEffect, useState } from 'react';
import { Linking, Platform, StyleSheet, Switch, View } from 'react-native';
import { AppHeader } from '@/components/AppHeader';
import { Button } from '@/components/Button';
import { Divider, Loading, Screen } from '@/components/Layout';
import { Text } from '@/components/Text';
import {
  defaultPushPreferences,
  getPermissionStatus,
  getStoredPushToken,
  loadPushPreferences,
  registerForPush,
  savePushPreferences,
  type PushPreferences,
} from '@/notifications/push';
import { colors, layout, radius, spacing } from '@/theme/tokens';

const TOPICS: { key: keyof PushPreferences; label: string; detail: string }[] = [
  { key: 'drops', label: 'New arrivals & restocks', detail: 'When something you follow lands or comes back.' },
  { key: 'priceDrops', label: 'Price drops', detail: 'When a saved product gets cheaper.' },
  { key: 'orders', label: 'Order updates', detail: 'Confirmation, dispatch and delivery.' },
  { key: 'offers', label: 'Offers & sales', detail: 'Occasional members-only promotions.' },
];

export default function NotificationsScreen() {
  const [prefs, setPrefs] = useState<PushPreferences>(defaultPushPreferences);
  const [granted, setGranted] = useState<boolean | null>(null);
  const [hasToken, setHasToken] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      const [status, saved, token] = await Promise.all([
        getPermissionStatus(),
        loadPushPreferences(),
        getStoredPushToken(),
      ]);
      setGranted(status === 'granted');
      setPrefs(saved);
      setHasToken(token != null);
      setLoading(false);
    })();
  }, []);

  const enable = useCallback(async () => {
    setBusy(true);
    try {
      const token = await registerForPush();
      setHasToken(token != null);
      const status = await getPermissionStatus();
      setGranted(status === 'granted');
      if (token) await savePushPreferences(prefs);
    } finally {
      setBusy(false);
    }
  }, [prefs]);

  const toggle = useCallback(
    (key: keyof PushPreferences) => {
      setPrefs((current) => {
        const next = { ...current, [key]: !current[key] };
        void savePushPreferences(next);
        return next;
      });
    },
    [],
  );

  if (loading) {
    return (
      <Screen>
        <AppHeader title="Notifications" showBack />
        <Loading />
      </Screen>
    );
  }

  return (
    <Screen>
      <AppHeader title="Notifications" showBack />
      <View style={styles.body}>
        {granted === false ? (
          <View style={styles.notice}>
            <Text variant="bodyStrong">Notifications are off</Text>
            <Text variant="caption" tone="muted" style={styles.noticeBody}>
              Turn them on to hear about restocks and order updates. You can change this any time.
            </Text>
            <Button label="Turn on notifications" loading={busy} onPress={() => void enable()} />
            <Button
              label="Open system settings"
              variant="ghost"
              size="sm"
              onPress={() => void Linking.openSettings()}
            />
          </View>
        ) : granted && !hasToken ? (
          <View style={styles.notice}>
            <Text variant="caption" tone="muted">
              Push is allowed but this build has no Expo project id, so a push token could not be issued.
              Run <Text variant="caption">eas init</Text> and rebuild to enable remote notifications.
            </Text>
          </View>
        ) : null}

        <Text variant="eyebrow" tone="muted" uppercase style={styles.groupLabel}>
          What to send
        </Text>
        <View style={styles.group}>
          {TOPICS.map((topic, index) => (
            <View key={topic.key}>
              {index > 0 ? <Divider inset={spacing.lg} /> : null}
              <View style={styles.row}>
                <View style={styles.rowText}>
                  <Text variant="body">{topic.label}</Text>
                  <Text variant="micro" tone="muted">
                    {topic.detail}
                  </Text>
                </View>
                <Switch
                  value={prefs[topic.key]}
                  onValueChange={() => toggle(topic.key)}
                  disabled={granted !== true}
                  trackColor={{ true: colors.primary, false: colors.borderStrong }}
                  thumbColor={Platform.OS === 'android' ? colors.surface : undefined}
                  accessibilityLabel={topic.label}
                />
              </View>
            </View>
          ))}
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { padding: layout.screenPadding, gap: spacing.md },
  notice: {
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.backgroundAlt,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  noticeBody: { marginBottom: spacing.sm },
  groupLabel: { marginTop: spacing.lg },
  group: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
  },
  rowText: { flex: 1, gap: 2 },
});
