// Bottom sheet for sharing a thread to social apps, by email or as a copied link.
import { useState } from 'react';
import { Linking, Modal, Platform, Pressable, Share, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useApp } from './store';
import { Txt } from './ui';

const enc = encodeURIComponent;

const TARGETS = [
  { key: 'whatsapp', label: 'واتساب', icon: 'whatsapp', brand: true, color: '#25D366',
    url: (t, u) => `https://wa.me/?text=${enc(`${t}\n${u}`)}` },
  { key: 'telegram', label: 'تيليجرام', icon: 'telegram', brand: true, color: '#229ED9',
    url: (t, u) => `https://t.me/share/url?url=${enc(u)}&text=${enc(t)}` },
  { key: 'x', label: 'إكس', icon: 'x-twitter', brand: true, color: '#000000',
    url: (t, u) => `https://x.com/intent/tweet?text=${enc(t)}&url=${enc(u)}` },
  { key: 'facebook', label: 'فيسبوك', icon: 'facebook-f', brand: true, color: '#1877F2',
    url: (t, u) => `https://www.facebook.com/sharer/sharer.php?u=${enc(u)}` },
  { key: 'linkedin', label: 'لينكدإن', icon: 'linkedin-in', brand: true, color: '#0A66C2',
    url: (t, u) => `https://www.linkedin.com/sharing/share-offsite/?url=${enc(u)}` },
  { key: 'email', label: 'البريد', icon: 'envelope', solid: true, color: '#5b6c8f',
    url: (t, u) => `mailto:?subject=${enc(t)}&body=${enc(`${t}\n\n${u}`)}` },
  { key: 'sms', label: 'رسالة نصية', icon: 'comment-sms', solid: true, color: '#1d6a72',
    url: (t, u) => `sms:${Platform.OS === 'ios' ? '&' : '?'}body=${enc(`${t}\n${u}`)}` },
];

function open(url) {
  // On the web, open share pages in a new tab; on the phone, let iOS hand them to the installed app.
  if (Platform.OS === 'web' && /^https:/.test(url)) window.open(url, '_blank', 'noopener');
  else Linking.openURL(url).catch(() => {});
}

function Button({ label, color, onPress, children }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.item, { opacity: pressed ? 0.6 : 1 }]}>
      <View style={[styles.circle, { backgroundColor: color }]}>{children}</View>
      <Txt size={14} style={styles.center} numberOfLines={1}>{label}</Txt>
    </Pressable>
  );
}

export default function ShareSheet({ visible, title, url, onClose }) {
  const { colors } = useApp();
  const insets = useSafeAreaInsets();
  const [copied, setCopied] = useState(false);

  const pick = (target) => {
    onClose();
    open(target.url(title, url));
  };

  const copy = async () => {
    await Clipboard.setStringAsync(url);
    setCopied(true);
    setTimeout(() => {
      setCopied(false);
      onClose();
    }, 900);
  };

  const more = () => {
    onClose();
    Share.share({ message: `${title}\n${url}`, url }).catch(() => {});
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={[styles.sheet, { backgroundColor: colors.card, paddingBottom: 16 + insets.bottom }]}>
        <View style={[styles.handle, { backgroundColor: colors.border }]} />
        <Txt size={20} bold style={styles.center}>مشاركة الموضوع</Txt>
        <Txt size={15} color={colors.muted} numberOfLines={2} style={[styles.center, { marginBottom: 8 }]}>{title}</Txt>
        <View style={styles.grid}>
          {TARGETS.map((t) => (
            <Button key={t.key} label={t.label} color={t.color} onPress={() => pick(t)}>
              <FontAwesome6 name={t.icon} brand={t.brand} solid={t.solid} size={24} color="#fff" />
            </Button>
          ))}
          <Button label={copied ? 'تم النسخ ✓' : 'نسخ الرابط'} color={colors.primary} onPress={copy}>
            <Ionicons name={copied ? 'checkmark' : 'link'} size={26} color="#fff" />
          </Button>
          <Button label="المزيد" color={colors.muted} onPress={more}>
            <Ionicons name="ellipsis-horizontal" size={26} color="#fff" />
          </Button>
        </View>
        <Pressable onPress={onClose} style={[styles.cancel, { backgroundColor: colors.bg }]}>
          <Txt size={18} bold color={colors.primary} style={styles.center}>إلغاء</Txt>
        </Pressable>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(5,15,30,0.4)' },
  sheet: { borderTopLeftRadius: 22, borderTopRightRadius: 22, paddingHorizontal: 16, paddingTop: 8 },
  handle: { alignSelf: 'center', width: 44, height: 5, borderRadius: 3, marginBottom: 8 },
  center: { textAlign: 'center' },
  grid: { flexDirection: 'row-reverse', flexWrap: 'wrap', justifyContent: 'center', rowGap: 14, marginVertical: 8 },
  item: { width: '25%', alignItems: 'center', gap: 4 },
  circle: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  cancel: { marginTop: 10, borderRadius: 14, paddingVertical: 6 },
});
