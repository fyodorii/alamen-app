// Finishes the web build in dist/ for the forum's Apache server and zips it.
//
// - Gzips the app's code and points index.html at the .gz file; .htaccess marks it
//   as gzip-encoded JavaScript (the server does not compress files by itself).
//   No mod_rewrite here: turning it on in app/ pulled in the forum's root rules,
//   which sent /app/ to /vb/.
// - Adds .htaccess with the encoding and browser-caching rules.
// - Zips dist/ for upload. dist/push/data/ holds only its .htaccess guard; the
//   keys and subscriber list are created on the server and never overwritten.
//
// Usage: npm run build:web   (runs `expo export --platform web` first)
import { readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { gzipSync } from 'node:zlib';
import { versionAssets } from './version-assets.mjs';
import { files, writeZip } from './zip.mjs';

const ROOT = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const DIST = join(ROOT, 'dist');
const ZIP = join(ROOT, 'alamen-web-app.zip');

const HTACCESS = `# Faster loading for the Al-Amen app (written by scripts/postbuild-web.mjs).
# If the app ever shows "500 Internal Server Error", delete this file.
# Do not add RewriteEngine here: it makes the forum's own rules send /app/ to /vb/.

# index.html loads the app's code as index-<hash>.js.gz: sent as gzip-encoded
# JavaScript, which every browser unpacks by itself.
<IfModule mod_mime.c>
  AddType application/javascript .js
  AddType application/manifest+json .webmanifest
  AddType font/woff2 .woff2
  AddType font/ttf .ttf
  RemoveType .gz
  AddEncoding gzip .gz
</IfModule>

<IfModule mod_headers.c>
  # The app's code has its content hash in the file name, so it never changes.
  <FilesMatch "^index-[0-9a-f]+\\.js(\\.gz)?$">
    Header set Cache-Control "public, max-age=31536000, immutable"
  </FilesMatch>
  <FilesMatch "\\.(woff2|png|ttf)$">
    Header set Cache-Control "public, max-age=604800"
  </FilesMatch>
  <FilesMatch "^(index\\.html|sw\\.js|manifest\\.webmanifest)$">
    Header set Cache-Control "no-cache"
  </FilesMatch>
</IfModule>
`;

rmSync(join(DIST, 'metadata.json'), { force: true });

// Gzip the app's code and load the .gz file from index.html.
const indexFile = join(DIST, 'index.html');
let html = readFileSync(indexFile, 'utf8');
for (const file of files(join(DIST, '_expo'))) {
  if (!file.endsWith('.js')) continue;
  const data = readFileSync(file);
  const packed = gzipSync(data, { level: 9 });
  writeFileSync(file + '.gz', packed);
  const url = '/app/' + relative(DIST, file).split(sep).join('/');
  if (!html.includes(`src="${url}"`)) throw new Error(`index.html does not load ${url}`);
  html = html.replace(`src="${url}"`, `src="${url}.gz"`);
  console.log(`${url}: ${Math.round(data.length / 1024)} KB -> ${Math.round(packed.length / 1024)} KB gzip`);
}
writeFileSync(indexFile, html);
versionAssets(DIST);

writeFileSync(join(DIST, '.htaccess'), HTACCESS);

const entries = files(DIST)
  .sort()
  .map((file) => ({ name: relative(DIST, file).split(sep).join('/'), data: readFileSync(file) }));
writeZip(ZIP, entries);
console.log(`alamen-web-app.zip: ${Math.round(statSync(ZIP).size / 1024)} KB, ${entries.length} files`);
