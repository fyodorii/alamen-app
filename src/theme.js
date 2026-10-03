export const palettes = {
  light: {
    bg: '#f4f1ea',
    card: '#ffffff',
    text: '#1d2a30',
    muted: '#6b7a80',
    primary: '#0f5f6e',
    accent: '#b8913a',
    border: '#e3ddd0',
    header: '#0f5f6e',
    headerText: '#ffffff',
  },
  dark: {
    bg: '#0e1517',
    card: '#172226',
    text: '#e7ecec',
    muted: '#93a3a8',
    primary: '#4fb3c2',
    accent: '#d9b45a',
    border: '#24343a',
    header: '#11262c',
    headerText: '#f1f5f5',
  },
};

// Every text in the app is Arabic, so lay it out right-to-left explicitly
// rather than depending on the device language.
export const rtl = { writingDirection: 'rtl', textAlign: 'right' };
