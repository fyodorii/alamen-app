// Adds ?v=<content hash> to the font links in the built index.html.
// The font files keep fixed names, and the service worker and browser keep them
// for a long time, so a changed font (e.g. new icons) needs a new address.
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

export function versionFonts(dist) {
  const indexFile = join(dist, 'index.html');
  let html = readFileSync(indexFile, 'utf8');
  for (const name of readdirSync(join(dist, 'fonts'))) {
    if (!name.endsWith('.woff2')) continue;
    const v = createHash('sha1').update(readFileSync(join(dist, 'fonts', name))).digest('hex').slice(0, 8);
    html = html.replaceAll(`fonts/${name}`, `fonts/${name}?v=${v}`);
  }
  writeFileSync(indexFile, html);
}
