// The web build declares its fonts in public/index.html (small WOFF2 files with
// font-display: swap), so nothing needs to load before the app can render.
export function useAppFonts() {
  return [true, null];
}
