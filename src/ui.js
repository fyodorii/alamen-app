import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useCallback, useEffect, useState } from 'react';
import { useApp } from './store';
import { rtl } from './theme';

// Runs an async loader and tracks loading / error / refresh state.
export function useLoader(load, deps) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const run = useCallback(async (isRefresh) => {
    if (isRefresh) setRefreshing(true);
    setError(null);
    try {
      setData(await load());
    } catch (e) {
      setError(e);
    } finally {
      setRefreshing(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    run(false);
  }, [run]);

  return { data, setData, error, refreshing, reload: () => run(true), retry: () => run(false) };
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
      <Text style={[styles.errTitle, { color: colors.text }]}>تعذّر تحميل المحتوى</Text>
      <Text style={[styles.errBody, { color: colors.muted }]}>
        {error?.message?.startsWith('HTTP') || error?.message === 'Network request failed'
          ? 'تحقق من اتصالك بالإنترنت ثم أعد المحاولة.'
          : error?.message}
      </Text>
      <Pressable onPress={onRetry} style={[styles.btn, { backgroundColor: colors.primary }]}>
        <Text style={styles.btnText}>إعادة المحاولة</Text>
      </Pressable>
    </View>
  );
}

export function Card({ title, subtitle, meta, badge, onPress, onLongPress }) {
  const { colors, settings } = useApp();
  const s = settings.fontScale;
  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.7 : 1 },
      ]}
    >
      {badge ? (
        <Text style={[styles.badge, { color: colors.accent, fontSize: 12 * s }]}>{badge}</Text>
      ) : null}
      <Text style={[styles.title, rtl, { color: colors.text, fontSize: 17 * s, lineHeight: 27 * s }]}>{title}</Text>
      {subtitle ? (
        <Text numberOfLines={3} style={[styles.subtitle, rtl, { color: colors.muted, fontSize: 14 * s, lineHeight: 22 * s }]}>
          {subtitle}
        </Text>
      ) : null}
      {meta ? <Text style={[styles.meta, rtl, { color: colors.primary, fontSize: 12 * s }]}>{meta}</Text> : null}
    </Pressable>
  );
}

export function SectionHeader({ children }) {
  const { colors, settings } = useApp();
  return (
    <Text style={[styles.section, rtl, { color: colors.accent, fontSize: 15 * settings.fontScale }]}>{children}</Text>
  );
}

export function Empty({ children }) {
  const { colors } = useApp();
  return <Text style={[styles.empty, { color: colors.muted }]}>{children}</Text>;
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  errTitle: { fontSize: 18, fontWeight: '700', marginBottom: 8 },
  errBody: { fontSize: 14, textAlign: 'center', marginBottom: 20 },
  btn: { paddingHorizontal: 22, paddingVertical: 11, borderRadius: 10 },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  card: { marginHorizontal: 12, marginVertical: 5, padding: 14, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth },
  badge: { fontWeight: '700', marginBottom: 4, textAlign: 'right' },
  title: { fontWeight: '700' },
  subtitle: { marginTop: 6 },
  meta: { marginTop: 8 },
  section: { fontWeight: '800', marginTop: 18, marginBottom: 4, marginHorizontal: 16 },
  empty: { textAlign: 'center', marginTop: 60, fontSize: 15, paddingHorizontal: 24, lineHeight: 24 },
});
