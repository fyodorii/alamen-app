import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, View } from 'react-native';
import { formatForumDate, getForum } from '../api';
import { useApp } from '../store';
import { Empty, ErrorView, ForumCard, Loading, SectionHeader, ThreadCard, useLoader } from '../ui';

export default function ForumScreen({ navigation, route }) {
  const { id } = route.params;
  const { colors } = useApp();
  const { data, setData, error, refreshing, reload, retry } = useLoader(() => getForum(id, 1), [id]);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (data?.title && !route.params.title) navigation.setOptions({ title: data.title });
  }, [data?.title]);

  // A refresh reloads page 1 only.
  useEffect(() => {
    if (refreshing) setPage(1);
  }, [refreshing]);

  if (error && !data) return <ErrorView error={error} onRetry={retry} />;
  if (!data) return <Loading />;

  const loadMore = async () => {
    if (loadingMore || page >= data.lastPage) return;
    setLoadingMore(true);
    try {
      const next = await getForum(id, page + 1);
      const seen = new Set(data.threads.map((t) => t.id));
      setData({ ...data, threads: [...data.threads, ...next.threads.filter((t) => !seen.has(t.id))] });
      setPage(page + 1);
    } catch {}
    setLoadingMore(false);
  };

  const openForum = (f) => navigation.push('Forum', { id: f.id, title: f.title });

  const header = data.subforums.length ? (
    <View>
      <SectionHeader>الأقسام الفرعية</SectionHeader>
      {data.subforums.map((f) => (
        <ForumCard key={f.id} forum={f} onPress={() => openForum(f)} onSubPress={openForum} />
      ))}
      <SectionHeader>المواضيع</SectionHeader>
    </View>
  ) : null;

  return (
    <FlatList
      style={{ backgroundColor: colors.bg }}
      contentContainerStyle={{ paddingVertical: 8 }}
      data={data.threads}
      keyExtractor={(t) => t.id}
      ListHeaderComponent={header}
      ListEmptyComponent={<Empty>لا توجد مواضيع في هذا القسم</Empty>}
      ListFooterComponent={loadingMore ? <ActivityIndicator style={{ margin: 20 }} color={colors.primary} /> : null}
      onEndReached={loadMore}
      onEndReachedThreshold={0.5}
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
          onPress={() => navigation.navigate('Thread', { id: item.id, title: item.title })}
        />
      )}
    />
  );
}
