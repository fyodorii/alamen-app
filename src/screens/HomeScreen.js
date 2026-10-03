import { RefreshControl, SectionList } from 'react-native';
import { getForumIndex } from '../api';
import { useApp } from '../store';
import { Card, ErrorView, Loading, SectionHeader, useLoader } from '../ui';

export default function HomeScreen({ navigation }) {
  const { colors } = useApp();
  const { data, error, refreshing, reload, retry } = useLoader(getForumIndex, []);

  if (error && !data) return <ErrorView error={error} onRetry={retry} />;
  if (!data) return <Loading />;

  const sections = data.map((c) => ({ key: c.id, title: c.title, data: c.forums }));

  return (
    <SectionList
      style={{ backgroundColor: colors.bg }}
      contentContainerStyle={{ paddingBottom: 24 }}
      sections={sections}
      keyExtractor={(f) => f.id}
      stickySectionHeadersEnabled={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={reload} tintColor={colors.primary} />}
      renderSectionHeader={({ section }) => <SectionHeader>{section.title}</SectionHeader>}
      renderItem={({ item }) => (
        <Card
          title={item.title}
          subtitle={item.description}
          meta={item.threads ? `المواضيع: ${item.threads}  ·  المشاركات: ${item.posts}` : null}
          onPress={() => navigation.navigate('Forum', { id: item.id, title: item.title })}
        />
      )}
    />
  );
}
