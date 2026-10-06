import { useEffect, useRef, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import { formatForumDate, getForum, THREADS_PER_PAGE } from '../api';
import { forumLook } from '../forumStyle';
import { useApp } from '../store';
import { Empty, ErrorView, ForumCard, Loading, Pager, SectionHeader, ThreadCard, Txt, useLoader } from '../ui';

// A forum's threads, THREADS_PER_PAGE to a page, with page buttons above and below.
export default function ForumScreen({ navigation, route }) {
  const { id } = route.params;
  const { colors } = useApp();
  const [page, setPage] = useState(1);
  const list = useRef(null);
  // Only page 1 is kept on the device for an instant first view.
  const { data, error, refreshing, reload, retry } = useLoader(
    () => getForum(id, page),
    [id, page],
    page === 1 ? `forum.${id}` : null
  );

  useEffect(() => {
    if (data?.title && !route.params.title) navigation.setOptions({ title: data.title });
  }, [data?.title]);

  // The list keeps the previous page until the new one arrives; show a spinner meanwhile.
  const current = data && (data.page ?? 1) === page ? data : null;

  if (error && !current) return <ErrorView error={error} onRetry={retry} />;
  if (!current) return <Loading />;

  const goTo = (p) => {
    setPage(p);
    list.current?.scrollToOffset({ offset: 0, animated: false });
  };
  const openForum = (f) => navigation.push('Forum', { id: f.id, title: f.title });
  const pager = <Pager page={page} lastPage={current.lastPage} onChange={goTo} />;
  const firstNumber = (page - 1) * THREADS_PER_PAGE + 1;
  const title = current.title || route.params.title || '';
  const look = forumLook(title, id);
  const shown = current.threads.length
    ? `المواضيع ${firstNumber}–${firstNumber + current.threads.length - 1}` + (current.lastPage > 1 ? ` · الصفحة ${page} من ${current.lastPage}` : '')
    : '';

  const header = (
    <View>
      <LinearGradient colors={[look.base, '#0f2540']} start={{ x: 1, y: 0 }} end={{ x: 0, y: 1 }} style={styles.banner}>
        <View style={styles.bannerIcon}>
          <Ionicons name={look.icon} size={30} color="#fff" />
        </View>
        <View style={styles.flex}>
          <Txt size={22} bold color="#fff" numberOfLines={2}>{title}</Txt>
          {shown ? <Txt size={14} color="rgba(255,255,255,0.85)">{shown}</Txt> : null}
        </View>
      </LinearGradient>
      {current.subforums.length ? (
        <>
          <SectionHeader>الأقسام الفرعية</SectionHeader>
          {current.subforums.map((f) => (
            <ForumCard key={f.id} forum={f} onPress={() => openForum(f)} onSubPress={openForum} />
          ))}
        </>
      ) : null}
      {current.subforums.length && current.threads.length ? <SectionHeader>المواضيع</SectionHeader> : null}
      {pager}
    </View>
  );

  return (
    <FlatList
      ref={list}
      style={{ backgroundColor: colors.bg }}
      contentContainerStyle={{ paddingBottom: 16 }}
      data={current.threads}
      keyExtractor={(t) => t.id}
      ListHeaderComponent={header}
      ListEmptyComponent={<Empty>لا توجد مواضيع في هذا القسم</Empty>}
      ListFooterComponent={pager}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={reload} tintColor={colors.primary} />}
      renderItem={({ item }) => (
        <ThreadCard
          sticky={item.sticky}
          title={item.title}
          preview={item.preview}
          author={item.author}
          when={formatForumDate(item.date)}
          replies={item.replies}
          views={item.views}
          look={look}
          onPress={() => navigation.navigate('Thread', { id: item.id, title: item.title })}
        />
      )}
    />
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  banner: { flexDirection: 'row-reverse', alignItems: 'center', gap: 14, margin: 12, marginBottom: 4, padding: 16, borderRadius: 20 },
  bannerIcon: { width: 56, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.16)' },
});
