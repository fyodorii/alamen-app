import { useFonts, Amiri_400Regular, Amiri_700Bold } from '@expo-google-fonts/amiri';

// Returns [loaded, error] like expo-font's useFonts.
export function useAppFonts() {
  return useFonts({ Amiri_400Regular, Amiri_700Bold });
}
