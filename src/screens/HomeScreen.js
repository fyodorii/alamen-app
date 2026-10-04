import { useEffect, useState } from 'react';
import { Image, RefreshControl, SectionList, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { getForumIndex } from '../api';
import { useApp } from '../store';
import { font } from '../theme';
import { ErrorView, ForumCard, Loading, SectionHeader, Txt, useLoader } from '../ui';

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

function Clock() {
  const { colors, settings } = useApp();
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const h = now.getHours();
  const gregorian = formatDate(now, 'ar-EG-u-nu-latn', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const hijri = formatDate(now, 'ar-SA-u-nu-latn', { calendar: 'islamic-umalqura', day: 'numeric', month: 'long', year: 'numeric' });
  const bold = { bold: true };

  return (
    <View style={[styles.clock, { borderColor: 'rgba(214,180,92,0.45)' }]}>
      {/* Digits read left to right even inside Arabic text. */}
      <View style={styles.timeRow}>
        <Text style={[font(15, bold), styles.period, { color: colors.gold }]}>{h < 12 ? 'صباحاً' : 'مساءً'}</Text>
        <Text style={[font(54, bold), styles.time]}>{`${pad(h % 12 || 12)}:${pad(now.getMinutes())}`}</Text>
        <Text style={[font(22, bold), styles.seconds, { color: colors.gold }]}>{pad(now.getSeconds())}</Text>
      </View>
      <Text style={[font(16, { bold: settings.boldText }), styles.date]}>{gregorian}</Text>
      {hijri ? <Text style={[font(16, { bold: settings.boldText }), styles.date, { color: colors.gold }]}>{hijri}</Text> : null}
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
      style={[styles.hero, { paddingTop: insets.top + 12 }]}
    >
      <View style={styles.brand}>
        <Image source={require('../../assets/logo-mark.png')} style={styles.logo} />
        <View style={styles.brandText}>
          <Txt size={27} bold color="#fff">شبكة الأمين السلفية</Txt>
          <Txt size={15} color="rgba(255,255,255,0.75)">منابر علمية · دروس ومحاضرات · فتاوى</Txt>
        </View>
      </View>
      <Clock />
    </LinearGradient>
  );
}

export default function HomeScreen({ navigation }) {
  const { colors } = useApp();
  const { data, error, refreshing, reload, retry } = useLoader(getForumIndex, []);

  if (error && !data) return <ErrorView error={error} onRetry={retry} />;
  if (!data) return <Loading />;

  const sections = data.map((c) => ({ key: c.id, title: c.title, data: c.forums }));
  const openForum = (f) => navigation.navigate('Forum', { id: f.id, title: f.title });

  return (
    <SectionList
      style={{ backgroundColor: colors.bg }}
      contentContainerStyle={{ paddingBottom: 28 }}
      sections={sections}
      keyExtractor={(f) => f.id}
      stickySectionHeadersEnabled={false}
      ListHeaderComponent={Hero}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={reload} tintColor={colors.primary} />}
      renderSectionHeader={({ section }) => <SectionHeader>{section.title}</SectionHeader>}
      renderItem={({ item }) => <ForumCard forum={item} onPress={() => openForum(item)} onSubPress={openForum} />}
    />
  );
}

const styles = StyleSheet.create({
  hero: { paddingHorizontal: 16, paddingBottom: 18, borderBottomLeftRadius: 28, borderBottomRightRadius: 28 },
  brand: { flexDirection: 'row-reverse', alignItems: 'center', gap: 12 },
  brandText: { flex: 1 },
  logo: { width: 76, height: 76 },
  clock: {
    marginTop: 14,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 22,
    borderWidth: 1,
    backgroundColor: 'rgba(255,255,255,0.07)',
    alignItems: 'center',
  },
  timeRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8, direction: 'ltr' },
  time: { color: '#fff', letterSpacing: 1 },
  seconds: { minWidth: 28 },
  period: {},
  date: { color: 'rgba(255,255,255,0.85)', textAlign: 'center' },
});
