import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import Constants from 'expo-constants';
import { BASE_URL } from '../api';
import { CONTACT_EMAIL } from '../config';
import { useApp } from '../store';
import { rtl } from '../theme';
import { SectionHeader } from '../ui';

const FONT_SIZES = [
  { label: 'صغير', value: 0.9 },
  { label: 'متوسط', value: 1 },
  { label: 'كبير', value: 1.15 },
  { label: 'كبير جداً', value: 1.3 },
];

const THEMES = [
  { label: 'تلقائي', value: 'system' },
  { label: 'فاتح', value: 'light' },
  { label: 'داكن', value: 'dark' },
];

function Segmented({ options, value, onChange }) {
  const { colors } = useApp();
  return (
    <View style={[styles.segment, { borderColor: colors.border, backgroundColor: colors.card }]}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Pressable
            key={o.value}
            onPress={() => onChange(o.value)}
            style={[styles.segItem, active && { backgroundColor: colors.primary }]}
          >
            <Text style={{ color: active ? '#fff' : colors.text, fontWeight: active ? '700' : '400' }}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function Row({ label, onPress }) {
  const { colors } = useApp();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.7 : 1 }]}
    >
      <Text style={[rtl, { color: colors.text, fontSize: 16 }]}>{label}</Text>
    </Pressable>
  );
}

export default function SettingsScreen() {
  const { colors, settings, updateSettings } = useApp();
  return (
    <ScrollView style={{ backgroundColor: colors.bg }} contentContainerStyle={{ paddingBottom: 40 }}>
      <SectionHeader>حجم الخط</SectionHeader>
      <Segmented options={FONT_SIZES} value={settings.fontScale} onChange={(v) => updateSettings({ fontScale: v })} />
      <Text style={[styles.preview, rtl, { color: colors.text, fontSize: 18 * settings.fontScale }]}>
        بسم الله الرحمن الرحيم، الحمد لله رب العالمين.
      </Text>

      <SectionHeader>المظهر</SectionHeader>
      <Segmented options={THEMES} value={settings.theme} onChange={(v) => updateSettings({ theme: v })} />

      <SectionHeader>الموقع</SectionHeader>
      <Row label="فتح الموقع في المتصفح" onPress={() => WebBrowser.openBrowserAsync(BASE_URL)} />
      <Row label="التسجيل أو الدخول للمشاركة" onPress={() => WebBrowser.openBrowserAsync(BASE_URL + 'register.php')} />
      <Row label="مراسلة إدارة الشبكة" onPress={() => Linking.openURL(`mailto:${CONTACT_EMAIL}`)} />

      <Text style={[styles.about, { color: colors.muted }]}>
        شبكة الأمين السلفية{'\n'}الإصدار {Constants.expoConfig?.version ?? ''}
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  segment: { flexDirection: 'row-reverse', marginHorizontal: 12, marginTop: 6, borderRadius: 10, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  segItem: { flex: 1, alignItems: 'center', paddingVertical: 10 },
  preview: { marginHorizontal: 16, marginTop: 12, lineHeight: 32 },
  row: { marginHorizontal: 12, marginVertical: 4, padding: 15, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth },
  about: { textAlign: 'center', marginTop: 30, lineHeight: 22 },
});
