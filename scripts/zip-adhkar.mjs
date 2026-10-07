// Packs the Adhkar web app (adhkar/) into adhkar-web-app.zip for upload to the site.
// The app needs no build step; the zip holds the folder as it is, minus server data
// (push/data keeps only its .htaccess guard, so keys and subscribers are never overwritten).
//
// Usage: npm run zip:adhkar
import { readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { files, writeZip } from './zip.mjs';

const ROOT = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const APP = join(ROOT, 'adhkar');
const ZIP = join(ROOT, 'adhkar-web-app.zip');

const entries = files(APP)
  .map((file) => ({ file, name: 'adhkar/' + relative(APP, file).split(sep).join('/') }))
  .filter(({ name }) => !/^adhkar\/push\/data\/(?!\.htaccess$|index\.html$)/.test(name))
  .sort((a, b) => a.name.localeCompare(b.name))
  .map(({ file, name }) => ({ name, data: readFileSync(file) }));
writeZip(ZIP, entries);
console.log(`adhkar-web-app.zip: ${Math.round(statSync(ZIP).size / 1024)} KB, ${entries.length} files`);
