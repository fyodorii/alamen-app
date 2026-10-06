import { useEffect, useRef, useState } from 'react';
import { FlatList, RefreshControl, View } from 'react-native';
import { formatForumDate, getForum, THREADS_PER_PAGE } from '../api';
import { useApp } from '../store';
import { Empty, ErrorView, ForumCard, Loading, Pager, SectionHeader, ThreadCard, useLoader } from '../ui';

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

  const header = (
    <View>
      {current.subforums.length ? (
        <>
          <SectionHeader>الأقسام الفرعية</SectionHeader>
          {current.subforums.map((f) => (
            <ForumCard key={f.id} forum={f} onPress={() => openForum(f)} onSubPress={openForum} />
          ))}
        </>
      ) : null}
      {current.threads.length ? (
        <SectionHeader>
          {current.lastPage > 1
            ? `المواضيع ${firstNumber}–${firstNumber + current.threads.length - 1}`
            : 'المواضيع'}
        </SectionHeader>
      ) : null}
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
          onPress={() => navigation.navigate('Thread', { id: item.id, title: item.title })}
        />
      )}
    />
  );
}
