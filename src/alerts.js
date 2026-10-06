// In-app alerts: a banner for newly posted topics and for new replies in the forum
// the reader chose (checked every few minutes while the app is open), a badge on the
// "الجديد" tab, and the 10-minute salawat reminder, each with a soft chime.
// When device notifications are on, the reminder comes from them instead.
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, AppState, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Ionicons from '@expo/vector-icons/Ionicons';
import { getForum, getLatest } from './api';
import { getPushState } from './push';
import { SALAWAT, SALAWAT_EVERY_MINUTES, SALAWAT_TITLE } from './salawat';
import { playChime } from './sound';
import { useApp } from './store';
import { Txt } from './ui';

const NEWS_POLL_MS = 3 * 60 * 1000;
const SALAWAT_EVERY_MS = SALAWAT_EVERY_MINUTES * 60 * 1000;
const FIRST_SALAWAT_MS = 60 * 1000;
const LAST_NOTIFIED_KEY = 'news.lastNotifiedId';
const LAST_SEEN_KEY = 'news.lastSeenId';
const repliesKey = (forumId) => `replies.${forumId}`; // {threadId: reply count}

const AlertsContext = createContext(null);
export const useAlerts = () => useContext(AlertsContext);

const maxId = (items) => Math.max(0, ...items.map((i) => +i.id));
const count = (s) => parseInt(String(s).replace(/,/g, ''), 10) || 0;

export function AlertsProvider({ onOpenThread, children }) {
  const { ready, settings } = useApp();
  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  const [banner, setBannerState] = useState(null);
  // Every alert banner rings the chime, unless the reader turned sounds off.
  const setBanner = useCallback((b) => {
    if (b && settingsRef.current.sound) playChime();
    setBannerState(b);
  }, []);
  const [newCount, setNewCount] = useState(0);
  const [pushActive, setPushActive] = useState(false);

  const refreshPush = useCallback(async () => {
    setPushActive(await getPushState().catch(() => false));
  }, []);

  const checkNews = useCallback(async () => {
    let items;
    try {
      items = await getLatest();
    } catch {
      return;
    }
    if (!items.length) return;
    const newest = maxId(items);
    const stored = await AsyncStorage.multiGet([LAST_NOTIFIED_KEY, LAST_SEEN_KEY]);
    const lastNotified = +stored[0][1] || 0;
    const lastSeen = +stored[1][1] || 0;
    if (!lastNotified) {
      // First run: everything already on the forum counts as seen.
      await AsyncStorage.multiSet([[LAST_NOTIFIED_KEY, String(newest)], [LAST_SEEN_KEY, String(newest)]]);
      return;
    }
    setNewCount(items.filter((i) => +i.id > lastSeen).length);
    const fresh = items.filter((i) => +i.id > lastNotified);
    if (!fresh.length) return;
    await AsyncStorage.setItem(LAST_NOTIFIED_KEY, String(newest));
    if (settingsRef.current.notifyNew) {
      setBanner({
        kind: 'news',
        title: fresh.length > 1 ? `${fresh.length} مواضيع جديدة` : `موضوع جديد · ${fresh[0].forum}`,
        body: fresh[0].title,
        threadId: fresh[0].id,
      });
    }
  }, [setBanner]);

  // New replies in the chosen forum: compare each thread's reply count on its
  // first page (newest activity first) with the counts seen last time.
  const checkReplies = useCallback(async () => {
    const forum = settingsRef.current.repliesForum;
    if (!forum) return;
    let page;
    try {
      page = await getForum(forum.id, 1);
    } catch {
      return;
    }
    const key = repliesKey(forum.id);
    const before = JSON.parse((await AsyncStorage.getItem(key)) || 'null');
    const now = {};
    for (const t of page.threads) now[t.id] = count(t.replies);
    await AsyncStorage.setItem(key, JSON.stringify(now));
    if (!before) return; // first look at this forum: nothing to compare yet
    const replied = page.threads.filter((t) => before[t.id] != null && now[t.id] > before[t.id]);
    if (!replied.length) return;
    const added = replied.reduce((n, t) => n + now[t.id] - before[t.id], 0);
    setBanner({
      kind: 'replies',
      title: added > 1 ? `${added} ردود جديدة · ${forum.title}` : `رد جديد · ${forum.title}`,
      body: replied[0].title,
      threadId: replied[0].id,
    });
  }, [setBanner]);

  // Sample banners so the reader can see and hear what alerts look like.
  const testAlerts = useCallback(() => {
    setBanner({ kind: 'news', title: 'موضوع جديد · تجربة التنبيه', body: 'هكذا يظهر تنبيه الموضوع الجديد عند نشره في الشبكة' });
    setTimeout(() => setBanner({ kind: 'salawat', title: SALAWAT_TITLE, body: SALAWAT[0] }), 5000);
  }, [setBanner]);

  const markLatestSeen = useCallback((items) => {
    const newest = String(maxId(items));
    AsyncStorage.multiSet([[LAST_SEEN_KEY, newest], [LAST_NOTIFIED_KEY, newest]]).catch(() => {});
    setNewCount(0);
  }, []);

  // New topics: check now, every few minutes, and whenever the app comes back to the foreground.
  useEffect(() => {
    if (!ready) return;
    const check = () => checkNews().then(checkReplies);
    refreshPush();
    check();
    const timer = setInterval(check, NEWS_POLL_MS);
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') {
        check();
        refreshPush();
      }
    });
    return () => {
      clearInterval(timer);
      sub.remove();
    };
  }, [ready, checkNews, checkReplies, refreshPush]);

  // A newly chosen forum starts from its current counts at once.
  useEffect(() => {
    if (ready && settings.repliesForum) checkReplies();
  }, [ready, settings.repliesForum?.id, checkReplies]);

  // Salawat reminder while the app is open (device notifications cover it otherwise).
  useEffect(() => {
    if (!ready || !settings.salawat || pushActive) return;
    let i = 0;
    const show = () => {
      setBanner({ kind: 'salawat', title: SALAWAT_TITLE, body: SALAWAT[i++ % SALAWAT.length] });
    };
    const first = setTimeout(show, FIRST_SALAWAT_MS);
    const every = setInterval(show, SALAWAT_EVERY_MS);
    return () => {
      clearTimeout(first);
      clearInterval(every);
    };
  }, [ready, settings.salawat, pushActive, setBanner]);

  const value = useMemo(
    () => ({ newCount, markLatestSeen, pushActive, refreshPush, showBanner: setBanner, testAlerts }),
    [newCount, markLatestSeen, pushActive, refreshPush, setBanner, testAlerts]
  );

  return (
    <AlertsContext.Provider value={value}>
      {children}
      <Banner
        banner={banner}
        onClose={() => setBannerState(null)}
        onPress={() => {
          if (banner?.threadId) onOpenThread(banner.threadId);
          setBannerState(null);
        }}
      />
    </AlertsContext.Provider>
  );
}

function Banner({ banner, onClose, onPress }) {
  const { colors } = useApp();
  const insets = useSafeAreaInsets();
  const slide = useRef(new Animated.Value(0)).current;
  const [shown, setShown] = useState(null);

  useEffect(() => {
    if (!banner) {
      // Only clear once the slide-out really finishes; a new banner interrupts it
      // (finished === false) and must stay on screen.
      Animated.timing(slide, { toValue: 0, duration: 250, useNativeDriver: true }).start(({ finished }) => {
        if (finished) setShown(null);
      });
      return;
    }
    setShown(banner);
    Animated.spring(slide, { toValue: 1, useNativeDriver: true, friction: 8 }).start();
    const hide = setTimeout(onClose, banner.kind === 'salawat' ? 9000 : 12000);
    return () => clearTimeout(hide);
  }, [banner]);

  if (!shown) return null;
  const salawat = shown.kind === 'salawat';
  return (
    <Animated.View
      pointerEvents="box-none"
      style={[
        styles.wrap,
        { top: insets.top + 8, opacity: slide, transform: [{ translateY: slide.interpolate({ inputRange: [0, 1], outputRange: [-40, 0] }) }] },
      ]}
    >
      <Pressable
        onPress={onPress}
        style={[styles.card, { backgroundColor: colors.header, borderColor: salawat ? colors.gold : colors.accent }]}
      >
        <View style={[styles.icon, { backgroundColor: salawat ? colors.gold : colors.accent }]}>
          <Ionicons name={salawat ? 'sparkles' : shown.kind === 'replies' ? 'chatbubbles' : 'notifications'} size={20} color="#fff" />
        </View>
        <View style={styles.flex}>
          <Txt size={14} bold color={salawat ? colors.gold : '#bcd6f2'}>{shown.title}</Txt>
          <Txt size={salawat ? 18 : 17} bold color="#fff" numberOfLines={3}>{shown.body}</Txt>
        </View>
        <Pressable hitSlop={12} onPress={onClose} accessibilityLabel="إغلاق">
          <Ionicons name="close" size={20} color="rgba(255,255,255,0.7)" />
        </Pressable>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  wrap: { position: 'absolute', left: 10, right: 10, zIndex: 1000 },
  card: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  icon: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
});
