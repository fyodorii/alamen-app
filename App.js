import { useEffect } from 'react';
import { NavigationContainer, DefaultTheme, DarkTheme, createNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useFonts, Amiri_400Regular, Amiri_700Bold } from '@expo-google-fonts/amiri';
import { AlertsProvider, useAlerts } from './src/alerts';
import { initialThreadId, onNotificationOpen, registerServiceWorker } from './src/push';
import { AppProvider, useApp } from './src/store';
import { fonts } from './src/theme';
import { Loading } from './src/ui';
import HomeScreen from './src/screens/HomeScreen';
import LatestScreen from './src/screens/LatestScreen';
import ForumScreen from './src/screens/ForumScreen';
import ThreadScreen from './src/screens/ThreadScreen';
import SavedScreen from './src/screens/SavedScreen';
import SettingsScreen from './src/screens/SettingsScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();
const navigationRef = createNavigationContainerRef();

const TAB_ICONS = {
  Home: 'library',
  Latest: 'time',
  Saved: 'bookmark',
  Settings: 'settings',
};

function openThread(id) {
  if (navigationRef.isReady()) navigationRef.navigate('Thread', { id: String(id) });
}

function Tabs() {
  const { colors } = useApp();
  const { newCount } = useAlerts();
  const insets = useSafeAreaInsets();
  return (
    // Tabs are declared in reverse so the main tab ("الأقسام") sits on the right for Arabic readers.
    <Tab.Navigator
      initialRouteName="Home"
      screenOptions={({ route }) => ({
        headerStyle: { backgroundColor: colors.header },
        headerTintColor: colors.headerText,
        headerTitleStyle: { fontFamily: fonts.bold, fontSize: 21 },
        headerTitleAlign: 'center',
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        // Amiri is taller than the system font, so the tab bar needs extra height for its labels.
        tabBarStyle: { backgroundColor: colors.card, borderTopColor: colors.border, height: 62 + insets.bottom, paddingTop: 4 },
        tabBarLabelStyle: { fontFamily: fonts.bold, fontSize: 13, lineHeight: 22 },
        tabBarIcon: ({ color, size, focused }) => (
          <Ionicons name={TAB_ICONS[route.name] + (focused ? '' : '-outline')} size={size} color={color} />
        ),
      })}
    >
      <Tab.Screen name="Settings" component={SettingsScreen} options={{ title: 'الإعدادات' }} />
      <Tab.Screen name="Saved" component={SavedScreen} options={{ title: 'المحفوظات' }} />
      <Tab.Screen
        name="Latest"
        component={LatestScreen}
        options={{ title: 'الجديد', tabBarBadge: newCount > 0 ? newCount : undefined, tabBarBadgeStyle: { backgroundColor: colors.gold } }}
      />
      <Tab.Screen name="Home" component={HomeScreen} options={{ title: 'الأقسام', headerShown: false }} />
    </Tab.Navigator>
  );
}

function Root() {
  const { ready, colors, dark } = useApp();
  const [fontsLoaded, fontError] = useFonts({ Amiri_400Regular, Amiri_700Bold });

  // Web: the service worker shows notifications; tapping one opens its thread.
  useEffect(() => {
    registerServiceWorker();
    return onNotificationOpen((url) => {
      const id = new URL(url).searchParams.get('t');
      if (id) openThread(id);
    });
  }, []);

  // If the font fails to load, carry on with the system font rather than blocking the app.
  if (!ready || (!fontsLoaded && !fontError)) return <Loading />;

  const base = dark ? DarkTheme : DefaultTheme;
  const navTheme = {
    ...base,
    colors: { ...base.colors, background: colors.bg, card: colors.header, text: colors.headerText, primary: colors.primary, border: colors.border },
  };

  return (
    <NavigationContainer
      ref={navigationRef}
      theme={navTheme}
      onReady={() => {
        const id = initialThreadId();
        if (id) openThread(id);
      }}
    >
      <AlertsProvider onOpenThread={openThread}>
        <StatusBar style="light" />
        <Stack.Navigator
          screenOptions={{
            headerStyle: { backgroundColor: colors.header },
            headerTintColor: colors.headerText,
            headerTitleStyle: { fontFamily: fonts.bold, fontSize: 19 },
            headerTitleAlign: 'center',
            headerBackTitle: 'رجوع',
          }}
        >
          <Stack.Screen name="Tabs" component={Tabs} options={{ headerShown: false }} />
          <Stack.Screen name="Forum" component={ForumScreen} options={({ route }) => ({ title: route.params.title ?? '' })} />
          <Stack.Screen name="Thread" component={ThreadScreen} options={{ title: '' }} />
        </Stack.Navigator>
      </AlertsProvider>
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
