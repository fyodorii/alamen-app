// Calm, deep-blue palette with a restrained gold for ornaments.
export const palettes = {
  light: {
    bg: '#eef2f7',
    card: '#ffffff',
    text: '#152238',
    muted: '#64748b',
    primary: '#1f4e79',
    primarySoft: '#e4edf7',
    accent: '#2f6fae',
    accentSoft: '#e1ecf8',
    gold: '#b8963e',
    danger: '#b4443c',
    dangerSoft: '#f8e7e5',
    goldSoft: '#f6efdc',
    border: '#dde4ee',
    header: '#14304f',
    headerText: '#ffffff',
    heroFrom: '#0f2540',
    heroTo: '#1f4e79',
  },
  dark: {
    bg: '#0a1220',
    card: '#111d30',
    text: '#e6edf6',
    muted: '#8fa1b8',
    primary: '#79acdf',
    primarySoft: '#16283f',
    accent: '#86b6e6',
    accentSoft: '#18304a',
    gold: '#d6b45c',
    danger: '#e8867d',
    dangerSoft: '#3a1f1f',
    goldSoft: '#2b2617',
    border: '#1e2e45',
    header: '#0c1a2e',
    headerText: '#f1f5fb',
    heroFrom: '#081426',
    heroTo: '#16365a',
  },
};

// Amiri (Naskh) for all text. Custom fonts pick weight by family, not fontWeight.
export const fonts = { regular: 'Amiri_400Regular', bold: 'Amiri_700Bold' };

// Amiri has tall ascenders and descenders, so give every line generous height.
export function font(size, { bold = false, scale = 1 } = {}) {
  const fontSize = Math.round(size * scale);
  return { fontFamily: bold ? fonts.bold : fonts.regular, fontSize, lineHeight: Math.round(fontSize * 1.75) };
}

const AVATAR_COLORS = ['#1f4e79', '#2f6fae', '#3d5a80', '#5b6c8f', '#1d6a72', '#4a5d7e', '#7a6332'];

// Author avatars: a stable color per name, and the first letter after a kunya ("أبو ...").
export function avatarFor(name) {
  let hash = 0;
  for (const ch of name || '') hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  const letter = (name || '؟').replace(/^(أبو|أبي|أبا|ابو)\s+/, '').trim().charAt(0) || '؟';
  return { color: AVATAR_COLORS[hash % AVATAR_COLORS.length], letter };
}

// Every text in the app is Arabic, so lay it out right-to-left explicitly
// rather than depending on the device language.
export const rtl = { writingDirection: 'rtl', textAlign: 'right' };
