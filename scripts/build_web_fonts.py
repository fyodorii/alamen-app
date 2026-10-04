"""Makes the small WOFF2 fonts the web build loads (public/fonts/).

- Amiri, limited to Arabic and basic Latin, keeping all its OpenType features.
- The icon fonts, limited to the icons the app's source actually names.

Run after changing which icons the app uses:
    python scripts/build_web_fonts.py
Needs: pip install fonttools brotli
"""
import json
import pathlib
import re

from fontTools import subset
from fontTools.ttLib import TTFont

ROOT = pathlib.Path(__file__).resolve().parent.parent
NODE = ROOT / 'node_modules'
ICONS = NODE / '@expo/vector-icons/build/vendor/react-native-vector-icons'
OUT = ROOT / 'public' / 'fonts'

ARABIC_AND_LATIN = [
    *range(0x0020, 0x0100),  # Basic Latin + Latin-1 (digits, punctuation, « »)
    *range(0x0600, 0x0700),  # Arabic
    *range(0x0750, 0x0780),  # Arabic Supplement
    *range(0x08A0, 0x0900),  # Arabic Extended-A
    *range(0x2000, 0x2070),  # General Punctuation (ZWJ, ZWNJ, dashes, …)
    0x25CC,                  # dotted circle, used to show lone diacritics
    *range(0xFB50, 0xFE00),  # Arabic Presentation Forms-A (ﷺ, ﴿ ﴾)
    *range(0xFE70, 0xFF00),  # Arabic Presentation Forms-B
]


def write_subset(src, name, unicodes):
    options = subset.Options()
    options.flavor = 'woff2'
    options.layout_features = ['*']  # Amiri's shaping (joins, marks, ligatures) needs every feature
    options.hinting = False
    options.desubroutinize = True
    font = TTFont(src)
    subsetter = subset.Subsetter(options)
    subsetter.populate(unicodes=unicodes)
    subsetter.subset(font)
    font.flavor = 'woff2'
    dst = OUT / name
    font.save(dst)
    print(f'{name}: {src.stat().st_size // 1024} KB -> {dst.stat().st_size // 1024} KB')


def names_in_source():
    """Every quoted word in the app's code; icon names are picked out of these."""
    words = set()
    for path in [ROOT / 'App.js', *(ROOT / 'src').rglob('*.js')]:
        words.update(re.findall(r"['\"]([a-z0-9-]+)['\"]", path.read_text(encoding='utf-8')))
    # Tab icons are written as "name" + "-outline" when not focused.
    return words | {w + '-outline' for w in words}


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    amiri = NODE / '@expo-google-fonts/amiri'
    write_subset(amiri / '400Regular/Amiri_400Regular.ttf', 'amiri-regular.woff2', ARABIC_AND_LATIN)
    write_subset(amiri / '700Bold/Amiri_700Bold.ttf', 'amiri-bold.woff2', ARABIC_AND_LATIN)

    used = names_in_source()

    ionicons = json.loads((ICONS / 'glyphmaps/Ionicons.json').read_text())
    picked = sorted(n for n in used if n in ionicons)
    print('ionicons:', ', '.join(picked))
    write_subset(ICONS / 'Fonts/Ionicons.ttf', 'ionicons.woff2', [ionicons[n] for n in picked])

    fa6 = json.loads((ICONS / 'glyphmaps/FontAwesome6Free.json').read_text())
    meta = json.loads((ICONS / 'glyphmaps/FontAwesome6Free_meta.json').read_text())
    for style, file, out in [('brands', 'FontAwesome6_Brands.ttf', 'fa6-brands.woff2'),
                             ('solid', 'FontAwesome6_Solid.ttf', 'fa6-solid.woff2')]:
        picked = sorted(n for n in used if n in meta[style])
        print(f'fa6 {style}:', ', '.join(picked))
        write_subset(ICONS / 'Fonts' / file, out, [fa6[n] for n in picked])


if __name__ == '__main__':
    main()
