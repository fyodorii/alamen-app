import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Linking, Platform, Pressable, StyleSheet, View } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import Ionicons from '@expo/vector-icons/Ionicons';
import { BASE_URL, getThread, getThreadAttachments, routeForLink, threadUrl } from '../api';
import { useApp } from '../store';
import { reportMailto } from '../report';
import { attachmentsHtml, buildThreadHtml } from '../threadHtml';
import HtmlView from '../HtmlView';
import ShareSheet from '../ShareSheet';
import { ErrorView, Loading, notify, openMail } from '../ui';

// Offline copies keep at most this many pages so storage stays small.
const MAX_SAVED_PAGES = 10;

export default function ThreadScreen({ navigation, route }) {
  const { id } = route.params;
  const { colors, dark, settings, isSaved, saveThread, removeThread, loadSavedThread } = useApp();
  const [page, setPage] = useState(1);
  const [thread, setThread] = useState(null);
  const [offline, setOffline] = useState(!!route.params.offline);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [sharing, setSharing] = useState(false);
  // Attachments by post index; they load after the posts are shown.
  const [atts, setAtts] = useState({});
  const attsRef = useRef({});
  const loadId = useRef(0);

  const load = useCallback(async () => {
    setError(null);
    setThread(null);
    if (route.params.offline) {
      const copy = await loadSavedThread(id);
      if (copy) return setThread(copy);
    }
    const run = ++loadId.current;
    attsRef.current = {};
    setAtts({});
    try {
      const fresh = await getThread(id, page);
      setThread(fresh);
      setOffline(false);
      getThreadAttachments(id, page, fresh.posts)
        .then((found) => {
          if (run !== loadId.current) return; // another page was opened meanwhile
          attsRef.current = found;
          setAtts(found);
        })
        .catch(() => {});
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

  // Reports go to the site administration by email: one post, or the whole topic.
  const report = useCallback(
    (index) => {
      const post = index != null ? thread?.posts[index] : null;
      openMail(reportMailto({ title: thread?.title || route.params.title || '', url: threadUrl(id), page, post }));
    },
    [thread, id, page, route.params.title]
  );

  const toggleSave = useCallback(async () => {
    if (saved) {
      await removeThread(id);
      return;
    }
    setSaving(true);
    try {
      // Save the whole thread (up to MAX_SAVED_PAGES pages) for offline reading.
      const first = page === 1 && thread && !offline ? thread : await getThread(id, 1);
      const posts = first === thread ? first.posts.map((p, i) => ({ ...p, attachments: attsRef.current[i] ?? p.attachments ?? [] })) : [...first.posts];
      const last = Math.min(first.lastPage, MAX_SAVED_PAGES);
      for (let p = 2; p <= last; p++) posts.push(...(await getThread(id, p)).posts);
      await saveThread(id, { title: first.title, posts, lastPage: 1 });
    } catch {
      notify('تعذّر الحفظ', 'تحقق من اتصالك بالإنترنت ثم أعد المحاولة.');
    }
    setSaving(false);
  }, [saved, id, page, thread, offline, saveThread, removeThread]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <View style={styles.actions}>
          <Pressable hitSlop={10} onPress={() => setSharing(true)} accessibilityLabel="مشاركة">
            <Ionicons name="share-social-outline" size={23} color={colors.headerText} />
          </Pressable>
          <Pressable hitSlop={10} onPress={toggleSave} disabled={saving} accessibilityLabel={saved ? 'إزالة من المحفوظات' : 'حفظ'}>
            <Ionicons name={saving ? 'hourglass-outline' : saved ? 'bookmark' : 'bookmark-outline'} size={23} color={colors.headerText} />
          </Pressable>
          <Pressable hitSlop={10} onPress={() => report()} accessibilityLabel="إبلاغ عن الموضوع">
            <Ionicons name="flag-outline" size={22} color={colors.headerText} />
          </Pressable>
          <Pressable hitSlop={10} onPress={() => WebBrowser.openBrowserAsync(threadUrl(id))} accessibilityLabel="فتح في الموقع للرد">
            <Ionicons name="chatbubble-ellipses-outline" size={23} color={colors.headerText} />
          </Pressable>
        </View>
      ),
    });
  }, [navigation, toggleSave, saving, saved, colors, id, report]);

  const html = useMemo(
    () =>
      thread &&
      buildThreadHtml({
        // Attachments already loaded stay when the page is rebuilt (e.g. a font change).
        thread: { ...thread, posts: thread.posts.map((p, i) => ({ ...p, attachments: attsRef.current[i] ?? p.attachments ?? [] })) },
        page,
        colors,
        dark,
        fontScale: settings.fontScale,
        boldText: settings.boldText,
        offline,
        baseUrl: BASE_URL,
        url: threadUrl(id),
      }),
    [thread, page, colors, dark, settings.fontScale, settings.boldText, offline, id]
  );

  const injectHtml = useMemo(
    () => Object.fromEntries(Object.entries(atts).map(([i, list]) => [i, attachmentsHtml(list)])),
    [atts]
  );

  const onMessage = useCallback(
    (msg) => {
      if (msg.type === 'page') setPage(msg.page);
      if (msg.type === 'share') setSharing(true);
      if (msg.type === 'link') {
        const target = routeForLink(msg.url);
        if (target) navigation.push(target.screen, target.params);
        else if (/^https?:/i.test(msg.url)) WebBrowser.openBrowserAsync(msg.url);
        else Linking.openURL(msg.url).catch(() => {});
      }
      if (msg.type === 'report') report(msg.index);
    },
    [thread, id, page, navigation, report]
  );

  if (error) return <ErrorView error={error} onRetry={load} />;
  if (!thread) return <Loading />;

  return (
    <View style={styles.flex}>
      <HtmlView html={html} background={colors.bg} onMessage={onMessage} inject={injectHtml} />
      <ShareSheet
        visible={sharing}
        title={thread.title || route.params.title || ''}
        url={threadUrl(id)}
        onClose={() => setSharing(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  // The web header gives headerRight no edge padding of its own.
  actions: { flexDirection: 'row', gap: 16, alignItems: 'center', paddingEnd: Platform.OS === 'web' ? 16 : 0 },
});
