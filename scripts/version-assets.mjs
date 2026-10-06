// Adds ?v=<content hash> to the font, icon and manifest links in the built app.
// These files keep fixed names, and the service worker, the browser and iOS (for
// home-screen icons) keep them for a long time, so a changed file needs a new address.
import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const hash = (file) => createHash('sha1').update(readFileSync(file)).digest('hex').slice(0, 8);

export function versionAssets(dist) {
  // Icons named in the manifest first, then the manifest itself (its hash covers them).
  const manifestFile = join(dist, 'manifest.webmanifest');
  if (existsSync(manifestFile)) {
    const manifest = JSON.parse(readFileSync(manifestFile, 'utf8'));
    for (const icon of manifest.icons ?? []) {
      const file = join(dist, icon.src.split('?')[0]);
      if (existsSync(file)) icon.src = `${icon.src.split('?')[0]}?v=${hash(file)}`;
    }
    writeFileSync(manifestFile, JSON.stringify(manifest, null, 2));
  }

  const indexFile = join(dist, 'index.html');
  let html = readFileSync(indexFile, 'utf8');
  const files = [
    ...readdirSync(join(dist, 'fonts')).filter((n) => n.endsWith('.woff2')).map((n) => `fonts/${n}`),
    ...readdirSync(dist).filter((n) => /\.(png|ico|webmanifest)$/.test(n)),
  ];
  for (const name of files) {
    const v = hash(join(dist, name));
    // Only links that start at the app folder ("/app/name"), never a longer name.
    html = html.replace(new RegExp(`(/${name.replace(/[.]/g, '\\.')})(?=["')])`, 'g'), `$1?v=${v}`);
  }
  writeFileSync(indexFile, html);
}
