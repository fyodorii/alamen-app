// App settings and saved (offline) threads, persisted with AsyncStorage.
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { palettes } from './theme';

const SETTINGS_KEY = 'settings.v1';
const SAVED_INDEX_KEY = 'saved.index.v1';
const savedKey = (id) => `saved.thread.${id}`;

const DEFAULT_SETTINGS = {
  fontScale: 1,
  theme: 'system',
  boldText: false, // show all reading text in Amiri Bold
  notifyNew: true, // alert when new topics are posted
  salawat: true, // remind to send blessings on the Prophet ﷺ every 15 minutes
};

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const system = useColorScheme();
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  // Lightweight list of saved threads; full content lives under its own key.
  const [saved, setSaved] = useState([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [s, idx] = await AsyncStorage.multiGet([SETTINGS_KEY, SAVED_INDEX_KEY]);
        if (s[1]) setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(s[1]) });
        if (idx[1]) setSaved(JSON.parse(idx[1]));
      } catch {}
      setReady(true);
    })();
  }, []);

  const updateSettings = useCallback((patch) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  const writeIndex = (list) => AsyncStorage.setItem(SAVED_INDEX_KEY, JSON.stringify(list)).catch(() => {});

  const saveThread = useCallback(async (id, thread) => {
    await AsyncStorage.setItem(savedKey(id), JSON.stringify(thread));
    setSaved((prev) => {
      const next = [
        { id, title: thread.title, author: thread.posts[0]?.author ?? '', savedAt: Date.now() },
        ...prev.filter((t) => t.id !== id),
      ];
      writeIndex(next);
      return next;
    });
  }, []);

  const removeThread = useCallback(async (id) => {
    await AsyncStorage.removeItem(savedKey(id));
    setSaved((prev) => {
      const next = prev.filter((t) => t.id !== id);
      writeIndex(next);
      return next;
    });
  }, []);

  const loadSavedThread = useCallback(async (id) => {
    const raw = await AsyncStorage.getItem(savedKey(id));
    return raw ? JSON.parse(raw) : null;
  }, []);

  const dark = settings.theme === 'dark' || (settings.theme === 'system' && system === 'dark');

  const value = useMemo(
    () => ({
      ready,
      settings,
      updateSettings,
      colors: dark ? palettes.dark : palettes.light,
      dark,
      saved,
      isSaved: (id) => saved.some((t) => t.id === id),
      saveThread,
      removeThread,
      loadSavedThread,
    }),
    [ready, settings, updateSettings, dark, saved, saveThread, removeThread, loadSavedThread]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export const useApp = () => useContext(AppContext);
