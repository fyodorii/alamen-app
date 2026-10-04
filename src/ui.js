import { ActivityIndicator, Alert, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useApp } from './store';
import { avatarFor, font, rtl } from './theme';

// React Native's Alert does nothing in the web build, so fall back to the browser dialogs.
export function notify(title, message) {
  if (Platform.OS === 'web') window.alert(`${title}\n\n${message}`);
  else Alert.alert(title, message);
}

export function confirmDelete(title, message, onConfirm) {
  if (Platform.OS === 'web') {
    if (window.confirm(`${title}\n\n${message}`)) onConfirm();
    return;
  }
  Alert.alert(title, message, [
    { text: 'إلغاء', style: 'cancel' },
    { text: 'حذف', style: 'destructive', onPress: onConfirm },
  ]);
}

// Runs an async loader and tracks loading / error / refresh state.
// With a cacheKey, the last result is kept on the device and shown at once on the
// next visit while fresh data loads (the forum takes seconds to answer).
export function useLoader(load, deps, cacheKey) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const storageKey = cacheKey ? `cache.${cacheKey}` : null;

  const run = useCallback(async (isRefresh) => {
    if (isRefresh) setRefreshing(true);
    setError(null);
    try {
      const fresh = await load();
      setData(fresh);
      if (storageKey) AsyncStorage.setItem(storageKey, JSON.stringify(fresh)).catch(() => {});
    } catch (e) {
      setError(e);
    } finally {
      setRefreshing(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    if (storageKey) {
      AsyncStorage.getItem(storageKey)
        .then((raw) => raw && setData((current) => current ?? JSON.parse(raw)))
        .catch(() => {});
    }
    run(false);
  }, [run, storageKey]);

  return { data, setData, error, refreshing, reload: () => run(true), retry: () => run(false) };
}

// Text in Amiri, sized by the reader's font setting; "boldText" makes all text bold.
export function Txt({ size = 18, bold, color, style, children, ...rest }) {
  const { colors, settings } = useApp();
  return (
    <Text
      style={[rtl, font(size, { bold: bold || settings.boldText, scale: settings.fontScale }), { color: color ?? colors.text }, style]}
      {...rest}
    >
      {children}
    </Text>
  );
}

export function Loading() {
  const { colors } = useApp();
  return (
    <View style={[styles.center, { backgroundColor: colors.bg }]}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );
}

export function ErrorView({ error, onRetry }) {
  const { colors } = useApp();
  return (
    <View style={[styles.center, { backgroundColor: colors.bg }]}>
      <Ionicons name="cloud-offline-outline" size={48} color={colors.muted} />
      <Txt size={22} bold style={styles.centerText}>تعذّر تحميل المحتوى</Txt>
      <Txt size={17} color={colors.muted} style={[styles.centerText, { marginBottom: 20 }]}>
        {error?.message?.startsWith('HTTP') || /network|fetch/i.test(error?.message ?? '')
          ? 'تحقق من اتصالك بالإنترنت ثم أعد المحاولة.'
          : error?.message}
      </Txt>
      <Pressable onPress={onRetry} style={[styles.btn, { backgroundColor: colors.primary }]}>
        <Txt size={18} bold color="#fff">إعادة المحاولة</Txt>
      </Pressable>
    </View>
  );
}

// A small rounded label with an optional icon, e.g. counts and badges.
export function Pill({ icon, children, color, background }) {
  const { colors, settings } = useApp();
  const c = color ?? colors.primary;
  return (
    <View style={[styles.pill, { backgroundColor: background ?? colors.primarySoft }]}>
      <Txt size={14} color={c} style={styles.centerText}>{children}</Txt>
      {icon ? <Ionicons name={icon} size={13 * settings.fontScale} color={c} /> : null}
    </View>
  );
}

// Circle with the author's initial in a color that is stable per name.
export function Avatar({ name, size = 34 }) {
  const { color, letter } = avatarFor(name);
  return (
    <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2, backgroundColor: color }]}>
      <Text style={[font(size * 0.5, { bold: true }), { color: '#fff', lineHeight: size * 0.95 }]}>{letter}</Text>
    </View>
  );
}

function CardShell({ onPress, onLongPress, highlight, children }) {
  const { colors } = useApp();
  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: highlight ? colors.gold : colors.border,
          borderRightWidth: highlight ? 4 : StyleSheet.hairlineWidth,
          opacity: pressed ? 0.8 : 1,
          transform: [{ scale: pressed ? 0.99 : 1 }],
        },
      ]}
    >
      {children}
    </Pressable>
  );
}

export function ForumCard({ forum, onPress, onSubPress }) {
  const { colors } = useApp();
  return (
    <CardShell onPress={onPress}>
      <View style={styles.row}>
        <View style={[styles.forumIcon, { backgroundColor: colors.primarySoft }]}>
          <Ionicons name="library" size={22} color={colors.primary} />
        </View>
        <View style={styles.flex}>
          <Txt size={21} bold>{forum.title}</Txt>
          {forum.description ? (
            <Txt size={16} color={colors.muted} numberOfLines={2}>{forum.description}</Txt>
          ) : null}
        </View>
        <Ionicons name="chevron-back" size={20} color={colors.muted} style={styles.chevron} />
      </View>
      {forum.threads ? (
        <View style={[styles.pills, styles.footer, { borderTopColor: colors.border }]}>
          <Pill icon="document-text-outline">{`${forum.threads} موضوع`}</Pill>
          <Pill icon="chatbubbles-outline">{`${forum.posts} مشاركة`}</Pill>
        </View>
      ) : null}
      {forum.subforums?.length ? (
        <View style={styles.pills}>
          {forum.subforums.map((s) => (
            <Pressable key={s.id} onPress={() => onSubPress?.(s)}>
              <Pill icon="folder-open-outline" color={colors.accent} background={colors.accentSoft}>{s.title}</Pill>
            </Pressable>
          ))}
        </View>
      ) : null}
    </CardShell>
  );
}

// Used for thread lists, the latest feed and saved threads.
export function ThreadCard({ title, preview, author, when, badge, sticky, replies, views, onPress, onLongPress }) {
  const { colors } = useApp();
  return (
    <CardShell onPress={onPress} onLongPress={onLongPress} highlight={sticky}>
      {badge || sticky ? (
        <View style={[styles.pills, { marginTop: 0, marginBottom: 6 }]}>
          {sticky ? <Pill icon="pin" color={colors.gold} background={colors.goldSoft}>موضوع مثبت</Pill> : null}
          {badge ? <Pill icon="albums-outline">{badge}</Pill> : null}
        </View>
      ) : null}
      <Txt size={21} bold>{title}</Txt>
      {preview ? (
        <Txt size={16} color={colors.muted} numberOfLines={3} style={{ marginTop: 2 }}>{preview}</Txt>
      ) : null}
      <View style={[styles.row, styles.footer, { borderTopColor: colors.border }]}>
        <Avatar name={author} size={30} />
        <View style={styles.flex}>
          <Txt size={15} bold color={colors.primary} numberOfLines={1}>{author}</Txt>
          {when ? <Txt size={13} color={colors.muted}>{when}</Txt> : null}
        </View>
        {replies != null ? <Pill icon="chatbubble-outline">{replies}</Pill> : null}
        {views ? <Pill icon="eye-outline" color={colors.muted} background={colors.bg}>{views}</Pill> : null}
      </View>
    </CardShell>
  );
}

export function SectionHeader({ children }) {
  const { colors } = useApp();
  return (
    <View style={styles.section}>
      <View style={[styles.sectionBar, { backgroundColor: colors.gold }]} />
      <Txt size={19} bold color={colors.primary} style={styles.flex}>{children}</Txt>
    </View>
  );
}

export function Empty({ icon = 'leaf-outline', children }) {
  const { colors } = useApp();
  return (
    <View style={styles.empty}>
      <Ionicons name={icon} size={44} color={colors.muted} />
      <Txt size={18} color={colors.muted} style={styles.centerText}>{children}</Txt>
    </View>
  );
}

const shadow = Platform.select({
  ios: { shadowColor: '#0f2540', shadowOpacity: 0.07, shadowRadius: 8, shadowOffset: { width: 0, height: 3 } },
  android: { elevation: 1 },
  default: { boxShadow: '0 3px 10px rgba(15,37,64,0.07)' },
});

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 6 },
  centerText: { textAlign: 'center' },
  btn: { paddingHorizontal: 26, paddingVertical: 6, borderRadius: 12 },
  card: { marginHorizontal: 12, marginVertical: 6, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, ...shadow },
  row: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10 },
  forumIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', alignSelf: 'flex-start', marginTop: 4 },
  chevron: { alignSelf: 'center' },
  footer: { marginTop: 10, paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth },
  pills: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  pill: { flexDirection: 'row-reverse', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 1, borderRadius: 999 },
  avatar: { alignItems: 'center', justifyContent: 'center' },
  section: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8, marginTop: 20, marginBottom: 4, marginHorizontal: 16 },
  sectionBar: { width: 4, height: 22, borderRadius: 2 },
  empty: { alignItems: 'center', marginTop: 70, paddingHorizontal: 30, gap: 10 },
});
