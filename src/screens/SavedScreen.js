import { FlatList } from 'react-native';
import { useApp } from '../store';
import { Empty, ThreadCard, confirmDelete } from '../ui';

export default function SavedScreen({ navigation }) {
  const { colors, saved, removeThread } = useApp();

  return (
    <FlatList
      style={{ backgroundColor: colors.bg }}
      contentContainerStyle={{ paddingVertical: 8, flexGrow: 1 }}
      data={saved}
      keyExtractor={(t) => t.id}
      ListEmptyComponent={
        <Empty icon="bookmark-outline">
          لا توجد مواضيع محفوظة بعد.{'\n'}اضغط على أيقونة الحفظ أعلى أي موضوع لتقرأه لاحقاً حتى دون اتصال بالإنترنت.
        </Empty>
      }
      renderItem={({ item }) => (
        <ThreadCard
          title={item.title}
          author={item.author}
          when={`حُفظ ${new Date(item.savedAt).toLocaleDateString('ar-EG-u-nu-latn')} · اضغط مطولاً للحذف`}
          onPress={() => navigation.navigate('Thread', { id: item.id, title: item.title, offline: true })}
          onLongPress={() => confirmDelete('حذف من المحفوظات؟', item.title, () => removeThread(item.id))}
        />
      )}
    />
  );
}
