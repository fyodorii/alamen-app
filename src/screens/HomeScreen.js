import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, RefreshControl, SectionList, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { getForumIndex } from '../api';
import { useApp } from '../store';
import { font } from '../theme';
import { ErrorView, ForumCard, SectionHeader, Txt, useLoader } from '../ui';

const pad = (n) => String(n).padStart(2, '0');

function formatDate(date, locale, options) {
  try {
    const f = new Intl.DateTimeFormat(locale, options);
    // Some engines silently fall back to the Gregorian calendar; hide the Hijri line then.
    if (options.calendar === 'islamic-umalqura' && !f.resolvedOptions().calendar?.startsWith('islamic')) return '';
    return f.format(date);
  } catch {
    return '';
  }
}

// The clock and both calendars, in a glass panel under the network's name.
function Clock() {
  const { colors } = useApp();
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 10 * 1000);
    return () => clearInterval(t);
  }, []);

  const h = now.getHours();
  const weekday = formatDate(now, 'ar-EG-u-nu-latn', { weekday: 'long' });
  const gregorian = formatDate(now, 'ar-EG-u-nu-latn', { day: 'numeric', month: 'long', year: 'numeric' });
  const hijri = formatDate(now, 'ar-SA-u-nu-latn', { calendar: 'islamic-umalqura', day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <View style={styles.panel}>
      <View style={styles.dates}>
        <Text style={[font(17, { bold: true }), styles.weekday]} numberOfLines={1}>{weekday}</Text>
        <Text style={[font(13), styles.date]} numberOfLines={1}>{gregorian}</Text>
        {hijri ? <Text style={[font(13, { bold: true }), styles.date, { color: colors.gold }]} numberOfLines={1}>{hijri}</Text> : null}
      </View>
      <View style={[styles.panelRule, { backgroundColor: 'rgba(214,180,92,0.45)' }]} />
      {/* Digits read left to right even inside Arabic text. */}
      <View style={styles.timeRow}>
        <Text style={[font(34, { bold: true }), styles.time]}>{`${pad(h % 12 || 12)}:${pad(now.getMinutes())}`}</Text>
        <Text style={[font(16, { bold: true }), { color: colors.gold }]}>{h < 12 ? 'ص' : 'م'}</Text>
      </View>
    </View>
  );
}

function Hero() {
  const { colors } = useApp();
  // The home tab has no navigation header, so the hero sits under the status bar.
  const insets = useSafeAreaInsets();
  return (
    <LinearGradient
      colors={[colors.heroFrom, colors.heroTo]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.hero, { paddingTop: insets.top + 18 }]}
    >
      {/* A faint large copy of the emblem as a watermark. */}
      <Image source={require('../../assets/logo-mark.png')} style={styles.watermark} />
      <View style={styles.brand}>
        <View style={[styles.logoRing, { borderColor: colors.gold }]}>
          <Image source={require('../../assets/logo-mark.png')} style={styles.logo} />
        </View>
        <View style={styles.brandText}>
          <Txt size={28} bold color="#fff" numberOfLines={1}>شبكة الأمين السلفية</Txt>
          <Txt size={15} color={colors.gold} numberOfLines={1}>منابر علمية · دروس · فتاوى</Txt>
        </View>
      </View>
      <Clock />
    </LinearGradient>
  );
}

export default function HomeScreen({ navigation }) {
  const { colors } = useApp();
  const { data, error, refreshing, reload, retry } = useLoader(getForumIndex, [], 'forums');

  // The header shows at once; only the list below waits for the forum.
  if (error && !data) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <Hero />
        <ErrorView error={error} onRetry={retry} />
      </View>
    );
  }

  const sections = (data ?? []).map((c) => ({ key: c.id, title: c.title, data: c.forums }));
  const openForum = (f) => navigation.navigate('Forum', { id: f.id, title: f.title });

  return (
    <SectionList
      style={{ backgroundColor: colors.bg }}
      contentContainerStyle={{ paddingBottom: 28 }}
      sections={sections}
      keyExtractor={(f) => f.id}
      stickySectionHeadersEnabled={false}
      ListHeaderComponent={Hero}
      ListFooterComponent={data ? null : <ActivityIndicator style={styles.loading} size="large" color={colors.primary} />}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={reload} tintColor={colors.primary} />}
      renderSectionHeader={({ section }) => <SectionHeader large>{section.title}</SectionHeader>}
      renderItem={({ item }) => <ForumCard forum={item} onPress={() => openForum(item)} onSubPress={openForum} />}
    />
  );
}

const styles = StyleSheet.create({
  hero: { paddingHorizontal: 16, paddingBottom: 18, borderBottomLeftRadius: 30, borderBottomRightRadius: 30, overflow: 'hidden' },
  watermark: { position: 'absolute', width: 230, height: 230, left: -60, top: -40, opacity: 0.045 },
  brand: { flexDirection: 'row-reverse', alignItems: 'center', gap: 14 },
  brandText: { flex: 1 },
  logoRing: { width: 84, height: 84, borderRadius: 42, borderWidth: 2, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.08)' },
  logo: { width: 70, height: 70 },
  panel: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(214,180,92,0.35)',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  dates: { flex: 1 },
  weekday: { color: '#fff', textAlign: 'right' },
  date: { color: 'rgba(255,255,255,0.85)', textAlign: 'right', lineHeight: 22 },
  panelRule: { width: 1, alignSelf: 'stretch', marginHorizontal: 14 },
  timeRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6, direction: 'ltr' },
  time: { color: '#fff', letterSpacing: 1 },
  loading: { marginTop: 40 },
});
