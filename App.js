import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { AppProvider, useApp } from './src/store';
import { Loading } from './src/ui';
import HomeScreen from './src/screens/HomeScreen';
import LatestScreen from './src/screens/LatestScreen';
import ForumScreen from './src/screens/ForumScreen';
import ThreadScreen from './src/screens/ThreadScreen';
import SavedScreen from './src/screens/SavedScreen';
import SettingsScreen from './src/screens/SettingsScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const TAB_ICONS = {
  Home: 'library',
  Latest: 'time',
  Saved: 'bookmark',
  Settings: 'settings',
};

function Tabs() {
  const { colors } = useApp();
  return (
    // Tabs are declared in reverse so the main tab ("الأقسام") sits on the right for Arabic readers.
    <Tab.Navigator
      initialRouteName="Home"
      screenOptions={({ route }) => ({
        headerStyle: { backgroundColor: colors.header },
        headerTintColor: colors.headerText,
        headerTitleStyle: { fontWeight: '700' },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: { backgroundColor: colors.card, borderTopColor: colors.border },
        tabBarIcon: ({ color, size, focused }) => (
          <Ionicons name={TAB_ICONS[route.name] + (focused ? '' : '-outline')} size={size} color={color} />
        ),
      })}
    >
      <Tab.Screen name="Settings" component={SettingsScreen} options={{ title: 'الإعدادات' }} />
      <Tab.Screen name="Saved" component={SavedScreen} options={{ title: 'المحفوظات' }} />
      <Tab.Screen name="Latest" component={LatestScreen} options={{ title: 'الجديد' }} />
      <Tab.Screen name="Home" component={HomeScreen} options={{ title: 'الأقسام', headerTitle: 'شبكة الأمين السلفية' }} />
    </Tab.Navigator>
  );
}

function Root() {
  const { ready, colors, dark } = useApp();
  if (!ready) return <Loading />;

  const base = dark ? DarkTheme : DefaultTheme;
  const navTheme = {
    ...base,
    colors: { ...base.colors, background: colors.bg, card: colors.header, text: colors.headerText, primary: colors.primary, border: colors.border },
  };

  return (
    <NavigationContainer theme={navTheme}>
      <StatusBar style="light" />
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: colors.header },
          headerTintColor: colors.headerText,
          headerTitleStyle: { fontWeight: '700' },
          headerBackTitle: 'رجوع',
        }}
      >
        <Stack.Screen name="Tabs" component={Tabs} options={{ headerShown: false }} />
        <Stack.Screen name="Forum" component={ForumScreen} options={({ route }) => ({ title: route.params.title ?? '' })} />
        <Stack.Screen name="Thread" component={ThreadScreen} options={{ title: '' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AppProvider>
        <Root />
      </AppProvider>
    </SafeAreaProvider>
  );
}
