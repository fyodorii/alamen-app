import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Alert, Linking, Pressable, Share, StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';
import * as WebBrowser from 'expo-web-browser';
import { Ionicons } from '@expo/vector-icons';
import { BASE_URL, getThread, routeForLink, threadUrl } from '../api';
import { CONTACT_EMAIL } from '../config';
import { useApp } from '../store';
import { buildThreadHtml } from '../threadHtml';
import { ErrorView, Loading } from '../ui';

// Offline copies keep at most this many pages so storage stays small.
const MAX_SAVED_PAGES = 10;

export default function ThreadScreen({ navigation, route }) {
  const { id } = route.params;
  const app = useApp();
  const { colors, dark, settings, isSaved, saveThread, removeThread, loadSavedThread } = app;
  const [page, setPage] = useState(1);
  const [thread, setThread] = useState(null);
  const [offline, setOffline] = useState(!!route.params.offline);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const webRef = useRef(null);

  const load = useCallback(async () => {
    setError(null);
    setThread(null);
    if (route.params.offline) {
      const copy = await loadSavedThread(id);
      if (copy) return setThread(copy);
    }
    try {
      setThread(await getThread(id, page));
      setOffline(false);
    } catch (e) {
      // No connection: fall back to the saved copy if there is one.
      const copy = page === 1 ? await loadSavedThread(id) : null;
      if (copy) {
        setThread(copy);
        setOffline(true);
      } else setError(e);
    }
  }, [id, page, route.params.offline, loadSavedThread]);

  useEffect(() => {
    load();
  }, [load]);

  const saved = isSaved(id);

  const toggleSave = useCallback(async () => {
    if (saved) {
      await removeThread(id);
      return;
    }
    setSaving(true);
    try {
      // Save the whole thread (up to MAX_SAVED_PAGES pages) for offline reading.
      const first = page === 1 && thread && !offline ? thread : await getThread(id, 1);
      const posts = [...first.posts];
      const last = Math.min(first.lastPage, MAX_SAVED_PAGES);
      for (let p = 2; p <= last; p++) posts.push(...(await getThread(id, p)).posts);
      await saveThread(id, { title: first.title, posts, lastPage: 1 });
    } catch {
      Alert.alert('تعذّر الحفظ', 'تحقق من اتصالك بالإنترنت ثم أعد المحاولة.');
    }
    setSaving(false);
  }, [saved, id, page, thread, offline, saveThread, removeThread]);

  const share = useCallback(() => {
    const title = thread?.title || route.params.title || '';
    Share.share({ message: `${title}\n${threadUrl(id)}`, url: threadUrl(id) });
  }, [thread, id, route.params.title]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <View style={styles.actions}>
          <Pressable hitSlop={10} onPress={share} accessibilityLabel="مشاركة">
            <Ionicons name="share-outline" size={23} color={colors.headerText} />
          </Pressable>
          <Pressable hitSlop={10} onPress={toggleSave} disabled={saving} accessibilityLabel={saved ? 'إزالة من المحفوظات' : 'حفظ'}>
            <Ionicons name={saving ? 'hourglass-outline' : saved ? 'bookmark' : 'bookmark-outline'} size={23} color={colors.headerText} />
          </Pressable>
          <Pressable hitSlop={10} onPress={() => WebBrowser.openBrowserAsync(threadUrl(id))} accessibilityLabel="فتح في الموقع للرد">
            <Ionicons name="chatbubble-ellipses-outline" size={23} color={colors.headerText} />
          </Pressable>
        </View>
      ),
    });
  }, [navigation, share, toggleSave, saving, saved, colors, id]);

  const html = useMemo(
    () => thread && buildThreadHtml({ thread, page, colors, dark, fontScale: settings.fontScale, offline }),
    [thread, page, colors, dark, settings.fontScale, offline]
  );

  const onMessage = useCallback(
    (e) => {
      const msg = JSON.parse(e.nativeEvent.data);
      if (msg.type === 'page') setPage(msg.page);
      if (msg.type === 'report') {
        const post = thread.posts[msg.index];
        const subject = encodeURIComponent('إبلاغ عن مشاركة في تطبيق شبكة الأمين');
        const body = encodeURIComponent(
          `الموضوع: ${thread.title}\n${threadUrl(id)}\nالصفحة: ${page}\nكاتب المشاركة: ${post.author} (${post.date})\n\nسبب الإبلاغ:\n`
        );
        Linking.openURL(`mailto:${CONTACT_EMAIL}?subject=${subject}&body=${body}`).catch(() =>
          Alert.alert('الإبلاغ', `أرسل بلاغك إلى: ${CONTACT_EMAIL}`)
        );
      }
    },
    [thread, id, page]
  );

  const onNavigate = useCallback(
    (req) => {
      // Let the document itself and embedded players (SoundCloud, YouTube) load.
      if (req.url === BASE_URL || req.url.startsWith('about:') || req.isTopFrame === false) return true;
      const target = routeForLink(req.url);
      if (target) navigation.push(target.screen, target.params);
      else if (/^https?:/i.test(req.url)) WebBrowser.openBrowserAsync(req.url);
      else Linking.openURL(req.url).catch(() => {});
      return false;
    },
    [navigation]
  );

  if (error) return <ErrorView error={error} onRetry={load} />;
  if (!thread) return <Loading />;

  return (
    <WebView
      ref={webRef}
      originWhitelist={['*']}
      source={{ html, baseUrl: BASE_URL }}
      style={{ backgroundColor: colors.bg }}
      onMessage={onMessage}
      onShouldStartLoadWithRequest={onNavigate}
      allowsInlineMediaPlayback
      allowsFullscreenVideo
      mediaPlaybackRequiresUserAction
      decelerationRate="normal"
      startInLoadingState
      renderLoading={() => <Loading />}
    />
  );
}

const styles = StyleSheet.create({
  actions: { flexDirection: 'row', gap: 18, alignItems: 'center' },
});
