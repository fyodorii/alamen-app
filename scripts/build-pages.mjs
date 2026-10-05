// Builds the web app for the GitHub Pages preview into dist-pages/.
//
// The regular web build lives at /app/ on al-amen.com; GitHub Pages serves it at
// /<repo>/. This swaps the /app/ paths for the Pages base path, exports, and puts
// the original files back. Used by .github/workflows/pages-preview.yml.
//
// Usage: node scripts/build-pages.mjs   (base path from PAGES_BASE, default /alamen-app)
import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const BASE = (process.env.PAGES_BASE || '/alamen-app').replace(/\/$/, '');
const OUT = join(ROOT, 'dist-pages');

const edits = {
  'app.json': (s) => s.replace('"baseUrl": "/app"', `"baseUrl": "${BASE}"`),
  'public/index.html': (s) => s.replaceAll('/app/', `${BASE}/`),
  'public/sw.js': (s) => s.replaceAll('\\/app\\/', `${BASE.replaceAll('/', '\\/')}\\/`),
};

const originals = {};
try {
  for (const [file, edit] of Object.entries(edits)) {
    const path = join(ROOT, file);
    originals[path] = readFileSync(path, 'utf8');
    const changed = edit(originals[path]);
    if (changed === originals[path]) throw new Error(`${file}: no /app/ path to replace`);
    writeFileSync(path, changed);
  }
  execSync(`npx expo export --platform web --output-dir "${OUT}"`, { cwd: ROOT, stdio: 'inherit' });
} finally {
  for (const [path, text] of Object.entries(originals)) writeFileSync(path, text);
}

// GitHub Pages runs Jekyll by default, which drops folders starting with "_" (_expo).
writeFileSync(join(OUT, '.nojekyll'), '');
console.log(`GitHub Pages build: dist-pages/ (base ${BASE}/)`);
