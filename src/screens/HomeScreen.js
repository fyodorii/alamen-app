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

// Compact clock that sits in the header row, beside the network's name.
function Clock() {
  const { colors } = useApp();
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 10 * 1000);
    return () => clearInterval(t);
  }, []);

  const h = now.getHours();
  const gregorian = formatDate(now, 'ar-EG-u-nu-latn', { weekday: 'long', day: 'numeric', month: 'long' });
  const hijri = formatDate(now, 'ar-SA-u-nu-latn', { calendar: 'islamic-umalqura', day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <View style={styles.clock}>
      {/* Digits read left to right even inside Arabic text. */}
      <View style={styles.timeRow}>
        <Text style={[font(22, { bold: true }), styles.time]}>{`${pad(h % 12 || 12)}:${pad(now.getMinutes())}`}</Text>
        <Text style={[font(12, { bold: true }), { color: colors.gold }]}>{h < 12 ? 'ص' : 'م'}</Text>
      </View>
      <Text style={[font(11), styles.date]} numberOfLines={1}>{gregorian}</Text>
      {hijri ? <Text style={[font(11), styles.date, { color: colors.gold }]} numberOfLines={1}>{hijri}</Text> : null}
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
      style={[styles.hero, { paddingTop: insets.top + 10 }]}
    >
      <View style={styles.brand}>
        <Image source={require('../../assets/logo-mark.png')} style={styles.logo} />
        <View style={styles.brandText}>
          <Txt size={21} bold color="#fff">شبكة الأمين السلفية</Txt>
          <Txt size={13} color="rgba(255,255,255,0.75)" numberOfLines={1}>منابر علمية · دروس · فتاوى</Txt>
        </View>
        <Clock />
      </View>
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
      renderSectionHeader={({ section }) => <SectionHeader>{section.title}</SectionHeader>}
      renderItem={({ item }) => <ForumCard forum={item} onPress={() => openForum(item)} onSubPress={openForum} />}
    />
  );
}

const styles = StyleSheet.create({
  hero: { paddingHorizontal: 14, paddingBottom: 14, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  brand: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10 },
  brandText: { flex: 1 },
  logo: { width: 54, height: 54 },
  clock: {
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(214,180,92,0.45)',
    backgroundColor: 'rgba(255,255,255,0.07)',
    minWidth: 104,
  },
  timeRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4, direction: 'ltr' },
  time: { color: '#fff', letterSpacing: 0.5 },
  date: { color: 'rgba(255,255,255,0.85)', textAlign: 'center', lineHeight: 17 },
  loading: { marginTop: 40 },
});
