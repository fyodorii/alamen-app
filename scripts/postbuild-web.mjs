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
import { readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { crc32, deflateRawSync, gzipSync } from 'node:zlib';
import { versionAssets } from './version-assets.mjs';

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

function files(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? files(join(dir, e.name)) : [join(dir, e.name)]
  );
}

// Minimal ZIP writer (DEFLATE entries), enough for cPanel's Extract.
function writeZip(target, entries) {
  const now = new Date();
  const dosTime = (now.getHours() << 11) | (now.getMinutes() << 5) | (now.getSeconds() >> 1);
  const dosDate = ((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate();
  const chunks = [];
  const central = [];
  let offset = 0;
  for (const { name, data } of entries) {
    const nameBuf = Buffer.from(name, 'utf8');
    const packed = deflateRawSync(data, { level: 9 });
    const crc = crc32(data);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4); // version needed
    local.writeUInt16LE(0x0800, 6); // UTF-8 names
    local.writeUInt16LE(8, 8); // deflate
    local.writeUInt16LE(dosTime, 10);
    local.writeUInt16LE(dosDate, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(packed.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(nameBuf.length, 26);
    chunks.push(local, nameBuf, packed);

    const dirEntry = Buffer.alloc(46);
    dirEntry.writeUInt32LE(0x02014b50, 0);
    dirEntry.writeUInt16LE(20, 4);
    dirEntry.writeUInt16LE(20, 6);
    dirEntry.writeUInt16LE(0x0800, 8);
    dirEntry.writeUInt16LE(8, 10);
    dirEntry.writeUInt16LE(dosTime, 12);
    dirEntry.writeUInt16LE(dosDate, 14);
    dirEntry.writeUInt32LE(crc, 16);
    dirEntry.writeUInt32LE(packed.length, 20);
    dirEntry.writeUInt32LE(data.length, 24);
    dirEntry.writeUInt16LE(nameBuf.length, 28);
    dirEntry.writeUInt32LE(offset, 42);
    central.push(dirEntry, nameBuf);
    offset += 30 + nameBuf.length + packed.length;
  }
  const centralBuf = Buffer.concat(central);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(centralBuf.length, 12);
  end.writeUInt32LE(offset, 16);
  writeFileSync(target, Buffer.concat([...chunks, centralBuf, end]));
}

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
