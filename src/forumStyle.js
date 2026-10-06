// An icon and a color for each forum, chosen from words in its title so a new
// forum gets a fitting look without changing the app. Forums that match no rule
// get a color from the palette by their id, so neighbours still differ.

// base: icon tile and accents in light mode; light: text on dark backgrounds.
const COLORS = {
  teal: { base: '#0f766e', light: '#5eead4' },
  indigo: { base: '#4338ca', light: '#a5b4fc' },
  emerald: { base: '#047857', light: '#6ee7b7' },
  amber: { base: '#b45309', light: '#fcd34d' },
  rose: { base: '#be123c', light: '#fda4af' },
  sky: { base: '#0369a1', light: '#7dd3fc' },
  violet: { base: '#6d28d9', light: '#c4b5fd' },
  navy: { base: '#1e40af', light: '#93c5fd' },
  olive: { base: '#4d7c0f', light: '#bef264' },
  brown: { base: '#92400e', light: '#fdba74' },
};

const RULES = [
  [/عقيد|توحيد|إيمان|ايمان/, 'shield-checkmark', 'teal'],
  [/منهج|سلف|سنة والجماعة/, 'compass', 'navy'],
  [/بدع|ردود|رد على|الفرق|تحذير/, 'shield-half', 'rose'],
  [/قرآن|قران|تفسير|تجويد|القراءات/, 'reader', 'emerald'],
  [/حديث|سنة|السنن|الصحيح/, 'book', 'indigo'],
  [/فقه|أحكام|احكام|فتاو|فتوى|أصول/, 'school', 'sky'],
  [/صوت|صوتي|محاضر|خطب|خطبة|دروس|درس/, 'headset', 'violet'],
  [/مرئي|فيديو|مقاطع/, 'videocam', 'violet'],
  [/لغة|عربي|نحو|صرف|بلاغ/, 'language', 'olive'],
  [/سيرة|تاريخ|تراجم|ترجمة|أعلام|علماء/, 'hourglass', 'brown'],
  [/كتب|كتاب|مكتبة|مؤلفات|رسائل|بحوث|مقالات/, 'library', 'amber'],
  [/أسرة|اسرة|مرأة|المرأة|نساء|الأخوات|الاخوات|بيت/, 'home', 'rose'],
  [/رقائق|زهد|آداب|اداب|أخلاق|اخلاق|تزكية|مواعظ/, 'leaf', 'emerald'],
  [/رمضان|صيام|حج|عمرة|أذكار|اذكار|دعاء/, 'moon', 'teal'],
  [/أخبار|اخبار|إعلان|اعلان|تنبيه|مستجدات/, 'megaphone', 'amber'],
  [/إدار|ادار|اقتراح|شكاو|ملاحظات|الدعم|التواصل/, 'chatbox-ellipses', 'navy'],
  [/عام|منوع|متنوع|حوار/, 'chatbubbles', 'sky'],
];

const FALLBACK_ICONS = ['bookmarks', 'journal', 'layers', 'ribbon', 'star', 'bulb'];
const PALETTE = Object.keys(COLORS);

const hash = (s) => [...String(s)].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);

export function forumLook(title = '', id = '') {
  for (const [re, icon, color] of RULES) {
    if (re.test(title)) return { icon, ...COLORS[color] };
  }
  const h = hash(id || title);
  return { icon: FALLBACK_ICONS[h % FALLBACK_ICONS.length], ...COLORS[PALETTE[h % PALETTE.length]] };
}
