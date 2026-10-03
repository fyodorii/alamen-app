import { FlatList, RefreshControl } from 'react-native';
import { getLatest } from '../api';
import { useApp } from '../store';
import { Card, Empty, ErrorView, Loading, useLoader } from '../ui';

function timeAgo(date) {
  const mins = Math.max(0, Math.round((Date.now() - date.getTime()) / 60000));
  if (mins < 1) return 'الآن';
  if (mins < 60) return `منذ ${mins} دقيقة`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `منذ ${hours} ساعة`;
  const days = Math.round(hours / 24);
  return `منذ ${days} يوم`;
}

export default function LatestScreen({ navigation }) {
  const { colors } = useApp();
  const { data, error, refreshing, reload, retry } = useLoader(getLatest, []);

  if (error && !data) return <ErrorView error={error} onRetry={retry} />;
  if (!data) return <Loading />;

  return (
    <FlatList
      style={{ backgroundColor: colors.bg }}
      contentContainerStyle={{ paddingVertical: 8 }}
      data={data}
      keyExtractor={(t) => t.id}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={reload} tintColor={colors.primary} />}
      ListEmptyComponent={<Empty>لا توجد مشاركات جديدة حالياً</Empty>}
      renderItem={({ item }) => (
        <Card
          badge={item.forum}
          title={item.title}
          subtitle={item.preview}
          meta={`${item.author}  ·  ${timeAgo(item.date)}`}
          onPress={() => navigation.navigate('Thread', { id: item.id, title: item.title })}
        />
      )}
    />
  );
}
