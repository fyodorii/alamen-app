import { Alert, FlatList } from 'react-native';
import { useApp } from '../store';
import { Card, Empty } from '../ui';

export default function SavedScreen({ navigation }) {
  const { colors, saved, removeThread } = useApp();

  return (
    <FlatList
      style={{ backgroundColor: colors.bg }}
      contentContainerStyle={{ paddingVertical: 8, flexGrow: 1 }}
      data={saved}
      keyExtractor={(t) => t.id}
      ListEmptyComponent={
        <Empty>
          لا توجد مواضيع محفوظة بعد.{'\n'}اضغط على أيقونة الحفظ أعلى أي موضوع لتقرأه لاحقاً حتى دون اتصال بالإنترنت.
        </Empty>
      }
      renderItem={({ item }) => (
        <Card
          title={item.title}
          meta={`${item.author}  ·  حُفظ ${new Date(item.savedAt).toLocaleDateString('ar')}`}
          onPress={() => navigation.navigate('Thread', { id: item.id, title: item.title, offline: true })}
          onLongPress={() =>
            Alert.alert('حذف من المحفوظات؟', item.title, [
              { text: 'إلغاء', style: 'cancel' },
              { text: 'حذف', style: 'destructive', onPress: () => removeThread(item.id) },
            ])
          }
        />
      )}
    />
  );
}
