import { useState } from 'react';
import { ActivityIndicator, Linking, Platform, Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import Constants from 'expo-constants';
import Ionicons from '@expo/vector-icons/Ionicons';
import { BASE_URL } from '../api';
import { useAlerts } from '../alerts';
import { CONTACT_EMAIL } from '../config';
import { disablePush, enablePush, isIOS, isStandalone, updatePushTopics } from '../push';
import { useApp } from '../store';
import { SectionHeader, Txt, notify } from '../ui';

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

const PUSH_ERRORS = {
  DENIED: 'لم يُسمح بالإشعارات. فعّلها من إعدادات الآيفون ← الإشعارات ← الأمين.',
  ADD_TO_HOME: 'على الآيفون تعمل الإشعارات بعد إضافة التطبيق إلى الشاشة الرئيسية: من Safari اضغط زر المشاركة ← إضافة إلى الشاشة الرئيسية، ثم افتحه من الأيقونة.',
  UNSUPPORTED: 'هذا المتصفح لا يدعم الإشعارات. استخدم Safari على الآيفون (iOS 16.4 أو أحدث).',
};

function Segmented({ options, value, onChange }) {
  const { colors } = useApp();
  return (
    <View style={[styles.segment, { borderColor: colors.border, backgroundColor: colors.card }]}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Pressable key={o.value} onPress={() => onChange(o.value)} style={[styles.segItem, active && { backgroundColor: colors.primary }]}>
            <Txt size={16} bold={active} color={active ? '#fff' : colors.text} style={styles.center}>{o.label}</Txt>
          </Pressable>
        );
      })}
    </View>
  );
}

function ToggleRow({ icon, label, hint, value, onChange }) {
  const { colors } = useApp();
  return (
    <View style={[styles.row, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Ionicons name={icon} size={22} color={colors.primary} />
      <View style={styles.flex}>
        <Txt size={18}>{label}</Txt>
        {hint ? <Txt size={14} color={colors.muted}>{hint}</Txt> : null}
      </View>
      <Switch value={value} onValueChange={onChange} trackColor={{ true: colors.accent, false: colors.border }} thumbColor="#fff" activeThumbColor="#fff" />
    </View>
  );
}

function Row({ icon, label, onPress }) {
  const { colors } = useApp();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.7 : 1 }]}
    >
      <Ionicons name={icon} size={22} color={colors.primary} />
      <Txt size={18} style={styles.flex}>{label}</Txt>
      <Ionicons name="chevron-back" size={18} color={colors.muted} />
    </Pressable>
  );
}

function DeviceNotifications() {
  const { colors, settings } = useApp();
  const { pushActive, refreshPush } = useAlerts();
  const [busy, setBusy] = useState(false);
  const needsHomeScreen = Platform.OS === 'web' && isIOS() && !isStandalone();

  const toggle = async () => {
    setBusy(true);
    try {
      if (pushActive) await disablePush();
      else await enablePush({ news: settings.notifyNew, salawat: settings.salawat });
    } catch (e) {
      notify('الإشعارات', PUSH_ERRORS[e.message] ?? 'تعذّر الاتصال بخادم الإشعارات. حاول لاحقاً.');
    }
    await refreshPush();
    setBusy(false);
  };

  return (
    <View style={[styles.deviceBox, { backgroundColor: colors.card, borderColor: pushActive ? colors.accent : colors.border }]}>
      <View style={styles.rowInner}>
        <Ionicons name={pushActive ? 'notifications' : 'notifications-off-outline'} size={26} color={pushActive ? colors.accent : colors.muted} />
        <View style={styles.flex}>
          <Txt size={18} bold>{pushActive ? 'إشعارات الجهاز مفعّلة' : 'إشعارات الجهاز'}</Txt>
          <Txt size={14} color={colors.muted}>
            {needsHomeScreen
              ? 'أضف التطبيق إلى الشاشة الرئيسية أولاً لتصلك الإشعارات والتطبيق مغلق.'
              : 'تصلك التنبيهات على الآيفون حتى والتطبيق مغلق.'}
          </Txt>
        </View>
      </View>
      <Pressable
        onPress={toggle}
        disabled={busy}
        style={[styles.deviceBtn, { backgroundColor: pushActive ? colors.bg : colors.primary }]}
      >
        {busy ? (
          <ActivityIndicator color={pushActive ? colors.primary : '#fff'} />
        ) : (
          <Txt size={17} bold color={pushActive ? colors.primary : '#fff'} style={styles.center}>
            {pushActive ? 'إيقاف إشعارات الجهاز' : 'تفعيل إشعارات الجهاز'}
          </Txt>
        )}
      </Pressable>
    </View>
  );
}

export default function SettingsScreen() {
  const { colors, settings, updateSettings } = useApp();
  const { pushActive } = useAlerts();

  // Keep the server (or the phone's schedule) in step with the alert switches.
  const setAlert = (patch) => {
    updateSettings(patch);
    if (pushActive) {
      const next = { ...settings, ...patch };
      updatePushTopics({ news: next.notifyNew, salawat: next.salawat }).catch(() => {});
    }
  };

  return (
    <ScrollView style={{ backgroundColor: colors.bg }} contentContainerStyle={{ paddingBottom: 40 }}>
      <SectionHeader>الخط</SectionHeader>
      <Segmented options={FONT_SIZES} value={settings.fontScale} onChange={(v) => updateSettings({ fontScale: v })} />
      <ToggleRow
        icon="text"
        label="خط عريض (Bold)"
        hint="عرض كل النصوص بخط أميري العريض"
        value={settings.boldText}
        onChange={(v) => updateSettings({ boldText: v })}
      />
      <View style={[styles.preview, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Txt size={21}>بسم الله الرحمن الرحيم، الحمد لله رب العالمين، والصلاة والسلام على نبينا محمد وعلى آله وصحبه أجمعين.</Txt>
      </View>

      <SectionHeader>التنبيهات</SectionHeader>
      <ToggleRow
        icon="newspaper-outline"
        label="تنبيه بالمواضيع الجديدة"
        hint="عند نشر موضوع جديد في الشبكة"
        value={settings.notifyNew}
        onChange={(v) => setAlert({ notifyNew: v })}
      />
      <ToggleRow
        icon="sparkles-outline"
        label="تذكير بالصلاة على النبي ﷺ"
        hint="كل 15 دقيقة"
        value={settings.salawat}
        onChange={(v) => setAlert({ salawat: v })}
      />
      <DeviceNotifications />

      <SectionHeader>المظهر</SectionHeader>
      <Segmented options={THEMES} value={settings.theme} onChange={(v) => updateSettings({ theme: v })} />

      <SectionHeader>الموقع</SectionHeader>
      <Row icon="globe-outline" label="فتح الموقع في المتصفح" onPress={() => WebBrowser.openBrowserAsync(BASE_URL)} />
      <Row icon="person-add-outline" label="التسجيل أو الدخول للمشاركة" onPress={() => WebBrowser.openBrowserAsync(BASE_URL + 'register.php')} />
      <Row icon="mail-outline" label="مراسلة إدارة الشبكة" onPress={() => Linking.openURL(`mailto:${CONTACT_EMAIL}`)} />

      <Txt size={15} color={colors.muted} style={[styles.center, { marginTop: 30 }]}>
        شبكة الأمين السلفية{'\n'}الإصدار {Constants.expoConfig?.version ?? ''}
      </Txt>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { textAlign: 'center' },
  segment: { flexDirection: 'row-reverse', marginHorizontal: 12, marginTop: 6, marginBottom: 4, borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  segItem: { flex: 1, alignItems: 'center', paddingVertical: 4 },
  preview: { marginHorizontal: 12, marginTop: 6, padding: 14, borderRadius: 14, borderWidth: StyleSheet.hairlineWidth },
  row: { flexDirection: 'row-reverse', alignItems: 'center', gap: 12, marginHorizontal: 12, marginVertical: 4, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 14, borderWidth: StyleSheet.hairlineWidth },
  rowInner: { flexDirection: 'row-reverse', alignItems: 'center', gap: 12 },
  deviceBox: { marginHorizontal: 12, marginVertical: 6, padding: 14, borderRadius: 16, borderWidth: 1, gap: 10 },
  deviceBtn: { borderRadius: 12, paddingVertical: 6, alignItems: 'center' },
});
