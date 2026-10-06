import { Children, useState } from 'react';
import { ActivityIndicator, FlatList, Image, Modal, Platform, Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import Constants from 'expo-constants';
import Ionicons from '@expo/vector-icons/Ionicons';
import { BASE_URL, getForumIndex } from '../api';
import { useAlerts } from '../alerts';
import { disablePush, enablePush, isIOS, isStandalone, updatePushTopics } from '../push';
import { useApp } from '../store';
import { SectionHeader, Txt, notify, openMail, useLoader } from '../ui';

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

// The web build ships its own privacy page next to the app.
const PRIVACY_URL =
  Platform.OS === 'web' ? new URL('privacy.html', window.location.href).href : 'https://www.al-amen.com/app/privacy.html';

// A titled card holding rows, with thin lines between them.
function Group({ title, children }) {
  const { colors } = useApp();
  const rows = Children.toArray(children).filter(Boolean);
  return (
    <View>
      {title ? <SectionHeader>{title}</SectionHeader> : null}
      <View style={[styles.group, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {rows.map((row, i) => (
          <View key={i} style={i ? { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border } : null}>
            {row}
          </View>
        ))}
      </View>
    </View>
  );
}

// A small colored square with a white icon, at the start of each row.
function Tile({ icon, color }) {
  return (
    <View style={[styles.tile, { backgroundColor: color }]}>
      <Ionicons name={icon} size={18} color="#fff" />
    </View>
  );
}

function Segmented({ options, value, onChange }) {
  const { colors, dark } = useApp();
  return (
    <View style={[styles.segment, { backgroundColor: colors.bg }]}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Pressable key={o.value} onPress={() => onChange(o.value)} style={[styles.segItem, active && { backgroundColor: colors.primary }]}>
            <Txt size={16} bold={active} color={active ? (dark ? colors.bg : '#fff') : colors.text} style={styles.center}>{o.label}</Txt>
          </Pressable>
        );
      })}
    </View>
  );
}

function ChoiceRow({ icon, color, label, options, value, onChange }) {
  return (
    <View style={styles.item}>
      <View style={styles.itemHead}>
        <Tile icon={icon} color={color} />
        <Txt size={18} style={styles.flex}>{label}</Txt>
      </View>
      <Segmented options={options} value={value} onChange={onChange} />
    </View>
  );
}

function ToggleRow({ icon, color, label, hint, value, onChange }) {
  const { colors } = useApp();
  return (
    <View style={[styles.item, styles.itemRow]}>
      <Tile icon={icon} color={color} />
      <View style={styles.flex}>
        <Txt size={18}>{label}</Txt>
        {hint ? <Txt size={14} color={colors.muted}>{hint}</Txt> : null}
      </View>
      <Switch value={value} onValueChange={onChange} trackColor={{ true: colors.accent, false: colors.border }} thumbColor="#fff" activeThumbColor="#fff" />
    </View>
  );
}

function Row({ icon, color, label, hint, onPress }) {
  const { colors } = useApp();
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.item, styles.itemRow, { opacity: pressed ? 0.6 : 1 }]}>
      <Tile icon={icon} color={color} />
      <View style={styles.flex}>
        <Txt size={18}>{label}</Txt>
        {hint ? <Txt size={14} color={colors.muted}>{hint}</Txt> : null}
      </View>
      <Ionicons name="chevron-back" size={18} color={colors.muted} />
    </Pressable>
  );
}

// Choosing the forum whose new replies raise an alert (sub-forums included).
function ForumPicker({ visible, current, onPick, onClose }) {
  const { colors } = useApp();
  const { data } = useLoader(getForumIndex, [], 'forums');
  const items = [];
  for (const cat of data ?? []) {
    items.push({ key: `cat${cat.id}`, header: cat.title });
    for (const f of cat.forums) {
      items.push({ key: f.id, id: f.id, title: f.title });
      for (const sub of f.subforums) items.push({ key: sub.id, id: sub.id, title: sub.title, sub: true });
    }
  }
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={[styles.sheet, { backgroundColor: colors.bg }]}>
        <Txt size={20} bold style={styles.center}>اختر القسم</Txt>
        <Txt size={14} color={colors.muted} style={styles.center}>يصلك تنبيه عند كل رد جديد في مواضيعه</Txt>
        {data ? (
          <FlatList
            data={items}
            keyExtractor={(i) => i.key}
            renderItem={({ item }) =>
              item.header ? (
                <Txt size={15} bold color={colors.gold} style={styles.pickHeader}>{item.header}</Txt>
              ) : (
                <Pressable
                  onPress={() => onPick({ id: item.id, title: item.title })}
                  style={[styles.pickRow, { borderColor: colors.border, backgroundColor: current?.id === item.id ? colors.primarySoft : colors.card }, item.sub && styles.pickSub]}
                >
                  <Ionicons name={current?.id === item.id ? 'checkmark-circle' : item.sub ? 'folder-open-outline' : 'library-outline'} size={20} color={colors.primary} />
                  <Txt size={17} style={styles.flex}>{item.title}</Txt>
                </Pressable>
              )
            }
          />
        ) : (
          <ActivityIndicator style={{ margin: 30 }} color={colors.primary} />
        )}
        <Pressable onPress={onClose} style={[styles.deviceBtn, { backgroundColor: colors.primary, marginTop: 8 }]}>
          <Txt size={17} bold color="#fff" style={styles.center}>إغلاق</Txt>
        </Pressable>
      </View>
    </Modal>
  );
}

function RepliesRow({ forum, onChange }) {
  const { colors } = useApp();
  const [picking, setPicking] = useState(false);
  return (
    <View style={[styles.item, styles.itemRow]}>
      <Tile icon="chatbubbles" color="#0f766e" />
      <Pressable style={styles.flex} onPress={() => setPicking(true)}>
        <Txt size={18}>تنبيه بالردود في قسم</Txt>
        <Txt size={14} color={forum ? colors.accent : colors.muted}>{forum ? forum.title : 'اضغط لاختيار القسم'}</Txt>
      </Pressable>
      <Switch
        value={!!forum}
        onValueChange={(on) => (on ? setPicking(true) : onChange(null))}
        trackColor={{ true: colors.accent, false: colors.border }}
        thumbColor="#fff"
        activeThumbColor="#fff"
      />
      <ForumPicker
        visible={picking}
        current={forum}
        onClose={() => setPicking(false)}
        onPick={(f) => {
          onChange(f);
          setPicking(false);
        }}
      />
    </View>
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
      else await enablePush({ news: settings.notifyNew, salawat: settings.salawat, sound: settings.sound });
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
  const { pushActive, testAlerts } = useAlerts();

  // Keep the server (or the phone's schedule) in step with the alert switches.
  const setAlert = (patch) => {
    updateSettings(patch);
    if (pushActive) {
      const next = { ...settings, ...patch };
      updatePushTopics({ news: next.notifyNew, salawat: next.salawat, sound: next.sound }).catch(() => {});
    }
  };

  return (
    <ScrollView style={{ backgroundColor: colors.bg }} contentContainerStyle={{ paddingBottom: 40 }}>
      <Group title="القراءة والمظهر">
        <ChoiceRow
          icon="text"
          color="#1f4e79"
          label="حجم الخط"
          options={FONT_SIZES}
          value={settings.fontScale}
          onChange={(v) => updateSettings({ fontScale: v })}
        />
        <ToggleRow
          icon="text"
          color="#b8963e"
          label="خط عريض"
          hint="عرض كل النصوص بخط أميري العريض"
          value={settings.boldText}
          onChange={(v) => updateSettings({ boldText: v })}
        />
        <ChoiceRow
          icon="contrast"
          color="#4338ca"
          label="المظهر"
          options={THEMES}
          value={settings.theme}
          onChange={(v) => updateSettings({ theme: v })}
        />
        <View style={styles.item}>
          <Txt size={13} color={colors.muted}>معاينة الخط</Txt>
          <Txt size={21}>بسم الله الرحمن الرحيم، الحمد لله رب العالمين، والصلاة والسلام على نبينا محمد وعلى آله وصحبه أجمعين.</Txt>
        </View>
      </Group>

      <Group title="التنبيهات">
        <ToggleRow
          icon="newspaper"
          color="#0369a1"
          label="المواضيع الجديدة"
          hint="عند نشر موضوع جديد في الشبكة"
          value={settings.notifyNew}
          onChange={(v) => setAlert({ notifyNew: v })}
        />
        <RepliesRow forum={settings.repliesForum} onChange={(f) => updateSettings({ repliesForum: f })} />
        <ToggleRow
          icon="sparkles"
          color="#b8963e"
          label="الصلاة على النبي ﷺ"
          hint="تذكير كل 10 دقائق"
          value={settings.salawat}
          onChange={(v) => setAlert({ salawat: v })}
        />
        <ToggleRow
          icon="musical-notes"
          color="#6d28d9"
          label="صوت التنبيهات"
          hint="نغمة خفيفة مع كل تنبيه"
          value={settings.sound}
          onChange={(v) => setAlert({ sound: v })}
        />
        <Row icon="notifications" color="#be123c" label="تجربة التنبيهات" hint="اعرض تنبيهاً تجريبياً الآن" onPress={testAlerts} />
      </Group>
      <DeviceNotifications />

      <Group title="الشبكة">
        <Row icon="globe" color="#1f4e79" label="فتح الموقع في المتصفح" onPress={() => WebBrowser.openBrowserAsync(BASE_URL)} />
        <Row icon="person-add" color="#047857" label="التسجيل أو الدخول للمشاركة" onPress={() => WebBrowser.openBrowserAsync(BASE_URL + 'register.php')} />
        <Row icon="mail" color="#b45309" label="مراسلة إدارة الشبكة" hint="للاقتراحات والبلاغات" onPress={() => openMail()} />
        <Row icon="shield-checkmark" color="#475569" label="سياسة الخصوصية" onPress={() => WebBrowser.openBrowserAsync(PRIVACY_URL)} />
      </Group>

      <View style={styles.about}>
        <Image source={require('../../assets/logo-mark.png')} style={styles.aboutLogo} />
        <Txt size={18} bold color={colors.primary} style={styles.center}>شبكة الأمين السلفية</Txt>
        <Txt size={14} color={colors.muted} style={styles.center}>الإصدار {Constants.expoConfig?.version ?? ''}</Txt>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { textAlign: 'center' },
  group: { marginHorizontal: 12, marginTop: 6, borderRadius: 18, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  item: { paddingHorizontal: 14, paddingVertical: 10, gap: 8 },
  itemRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 12 },
  itemHead: { flexDirection: 'row-reverse', alignItems: 'center', gap: 12 },
  tile: { width: 32, height: 32, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  segment: { flexDirection: 'row-reverse', borderRadius: 12, padding: 3, gap: 3 },
  segItem: { flex: 1, alignItems: 'center', paddingVertical: 2, borderRadius: 10 },
  rowInner: { flexDirection: 'row-reverse', alignItems: 'center', gap: 12 },
  about: { alignItems: 'center', marginTop: 28, gap: 2 },
  aboutLogo: { width: 64, height: 64, marginBottom: 6 },
  deviceBox: { marginHorizontal: 12, marginTop: 10, padding: 14, borderRadius: 18, borderWidth: 1, gap: 10 },
  deviceBtn: { borderRadius: 12, paddingVertical: 6, alignItems: 'center' },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)' },
  sheet: { maxHeight: '75%', paddingTop: 14, paddingHorizontal: 12, paddingBottom: 24, borderTopLeftRadius: 22, borderTopRightRadius: 22 },
  pickHeader: { marginTop: 12, marginBottom: 2, marginHorizontal: 6 },
  pickRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10, marginVertical: 3, paddingHorizontal: 14, paddingVertical: 4, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth },
  pickSub: { marginRight: 22 },
});
