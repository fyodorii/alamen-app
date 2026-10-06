import { ActivityIndicator, Alert, Linking, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Ionicons from '@expo/vector-icons/Ionicons';
import { CONTACT_EMAIL } from './config';
import { useApp } from './store';
import { avatarFor, font, rtl } from './theme';

// React Native's Alert does nothing in the web build, so fall back to the browser dialogs.
export function notify(title, message) {
  if (Platform.OS === 'web') window.alert(`${title}\n\n${message}`);
  else Alert.alert(title, message);
}

// Opens a new email to the site administration (reports and messages).
// On the web, opening mailto: in the same page hands it to the mail app; a new
// window would stay blank in the home-screen app.
export function openMail(subject = '', body = '') {
  const url = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  if (Platform.OS === 'web') {
    window.location.href = url;
    return;
  }
  Linking.openURL(url).catch(() => notify('مراسلة الإدارة', `أرسل رسالتك إلى: ${CONTACT_EMAIL}`));
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
        .then((raw) => {
          const cached = raw && JSON.parse(raw);
          // An empty list is never worth showing (left over from a failed read).
          if (cached && !(Array.isArray(cached) && !cached.length)) setData((current) => current ?? cached);
        })
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
        <View style={[styles.stats, styles.footer, { borderTopColor: colors.border }]}>
          <Stat icon="document-text-outline">{`${forum.threads} موضوع`}</Stat>
          <Stat icon="chatbubbles-outline">{`${forum.posts} مشاركة`}</Stat>
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

// A small icon with a number or short text, without a background.
export function Stat({ icon, children, color }) {
  const { colors, settings } = useApp();
  const c = color ?? colors.muted;
  return (
    <View style={styles.stat}>
      <Txt size={14} color={c} style={styles.centerText}>{children}</Txt>
      <Ionicons name={icon} size={14 * settings.fontScale} color={c} />
    </View>
  );
}

// Used for thread lists, the latest feed and saved threads.
export function ThreadCard({ title, preview, author, when, badge, sticky, replies, views, onPress, onLongPress }) {
  const { colors, settings } = useApp();
  return (
    <CardShell onPress={onPress} onLongPress={onLongPress} highlight={sticky}>
      {badge ? (
        <Txt size={13} bold color={colors.accent} numberOfLines={1}>{badge}</Txt>
      ) : null}
      <View style={styles.titleRow}>
        {sticky ? <Ionicons name="pin" size={17 * settings.fontScale} color={colors.gold} style={styles.pin} /> : null}
        <Txt size={19} bold numberOfLines={2} style={styles.flex}>{title}</Txt>
      </View>
      {preview ? (
        <Txt size={15} color={colors.muted} numberOfLines={2}>{preview}</Txt>
      ) : null}
      <View style={[styles.row, styles.meta]}>
        <Avatar name={author} size={26} />
        <View style={styles.flex}>
          <Txt size={14} numberOfLines={1}>
            <Txt size={14} bold color={colors.primary}>{author}</Txt>
            {when ? <Txt size={13} color={colors.muted}>{`  ·  ${when}`}</Txt> : null}
          </Txt>
        </View>
        {replies != null ? <Stat icon="chatbubble-outline">{replies}</Stat> : null}
        {views ? <Stat icon="eye-outline">{views}</Stat> : null}
      </View>
    </CardShell>
  );
}

// Page numbers around the current one: 1 … 4 5 [6] 7 8 … 20
function pageWindow(page, last) {
  const pages = new Set([1, last]);
  for (let p = page - 2; p <= page + 2; p++) if (p > 1 && p < last) pages.add(p);
  const sorted = [...pages].sort((a, b) => a - b);
  const out = [];
  sorted.forEach((p, i) => {
    if (i && p - sorted[i - 1] > 1) out.push(`gap${p}`);
    out.push(p);
  });
  return out;
}

// Previous / page numbers / next, for paged lists.
export function Pager({ page, lastPage, onChange }) {
  const { colors } = useApp();
  if (lastPage <= 1) return null;
  const Arrow = ({ to, icon, label }) => {
    const off = to < 1 || to > lastPage;
    return (
      <Pressable
        disabled={off}
        onPress={() => onChange(to)}
        style={[styles.pageArrow, { backgroundColor: off ? colors.border : colors.primary, opacity: off ? 0.5 : 1 }]}
        accessibilityLabel={label}
      >
        {icon === 'chevron-forward' ? <Ionicons name={icon} size={16} color="#fff" /> : null}
        <Txt size={14} bold color="#fff">{label}</Txt>
        {icon === 'chevron-back' ? <Ionicons name={icon} size={16} color="#fff" /> : null}
      </Pressable>
    );
  };
  return (
    <View style={[styles.pager, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.pagerRow}>
        <Arrow to={page - 1} icon="chevron-forward" label="السابقة" />
        <View style={styles.pageNums}>
          {pageWindow(page, lastPage).map((p) =>
            typeof p === 'string' ? (
              <Txt key={p} size={14} color={colors.muted}>…</Txt>
            ) : (
              <Pressable
                key={p}
                onPress={() => p !== page && onChange(p)}
                style={[styles.pageNum, { backgroundColor: p === page ? colors.gold : colors.primarySoft }]}
              >
                <Txt size={14} bold color={p === page ? '#fff' : colors.primary} style={styles.centerText}>{p}</Txt>
              </Pressable>
            )
          )}
        </View>
        <Arrow to={page + 1} icon="chevron-back" label="التالية" />
      </View>
      <Txt size={13} color={colors.muted} style={styles.centerText}>{`الصفحة ${page} من ${lastPage}`}</Txt>
    </View>
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
  card: { marginHorizontal: 12, marginVertical: 5, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, ...shadow },
  titleRow: { flexDirection: 'row-reverse', alignItems: 'flex-start', gap: 6 },
  pin: { marginTop: 9 },
  meta: { marginTop: 6, gap: 8 },
  stats: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 16 },
  stat: { flexDirection: 'row-reverse', alignItems: 'center', gap: 4 },
  pager: { marginHorizontal: 12, marginVertical: 8, paddingVertical: 8, paddingHorizontal: 10, borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, gap: 2, ...shadow },
  pagerRow: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', gap: 6 },
  pageArrow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 2, paddingHorizontal: 10, borderRadius: 12 },
  pageNums: { flex: 1, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap', gap: 4 },
  pageNum: { minWidth: 30, paddingHorizontal: 6, borderRadius: 10, alignItems: 'center' },
  row: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10 },
  forumIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', alignSelf: 'flex-start', marginTop: 4 },
  chevron: { alignSelf: 'center' },
  footer: { marginTop: 8, paddingTop: 8, borderTopWidth: StyleSheet.hairlineWidth },
  pills: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  pill: { flexDirection: 'row-reverse', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 1, borderRadius: 999 },
  avatar: { alignItems: 'center', justifyContent: 'center' },
  section: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8, marginTop: 20, marginBottom: 4, marginHorizontal: 16 },
  sectionBar: { width: 4, height: 22, borderRadius: 2 },
  empty: { alignItems: 'center', marginTop: 70, paddingHorizontal: 30, gap: 10 },
});
