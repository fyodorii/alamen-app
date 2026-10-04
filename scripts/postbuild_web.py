"""Finishes the web build in dist/ for the forum's Apache server and zips it.

- Writes a gzip copy next to each text file; .htaccess serves it to browsers that
  accept gzip (the server does not compress static files by itself).
- Adds .htaccess with the compression and browser-caching rules.
- Zips dist/ for upload, leaving out push/data/ so the server keeps its
  notification keys and subscriber list.

Usage: npm run build:web   (runs `expo export --platform web` first)
"""
import gzip
import pathlib
import zipfile

ROOT = pathlib.Path(__file__).resolve().parent.parent
DIST = ROOT / 'dist'
ZIP = ROOT / 'alamen-web-app.zip'
COMPRESS = {'.js', '.css', '.json', '.webmanifest', '.svg', '.ttf', '.html'}

HTACCESS = r"""# Faster loading for the Al-Amen app (written by scripts/postbuild_web.py).
# If the app ever shows "500 Internal Server Error", delete this file.

<IfModule mod_mime.c>
  AddType application/javascript .js
  AddType application/manifest+json .webmanifest
  AddType font/woff2 .woff2
  AddType font/ttf .ttf
  RemoveType .gz
  AddEncoding gzip .gz
</IfModule>

# Serve file.js.gz instead of file.js when the browser accepts gzip.
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteCond %{HTTP:Accept-Encoding} gzip
  RewriteCond %{REQUEST_FILENAME}.gz -f
  RewriteRule ^(.+\.(?:js|css|json|webmanifest|svg|ttf))$ $1.gz [L]
</IfModule>

<IfModule mod_headers.c>
  <FilesMatch "\.gz$">
    Header append Vary Accept-Encoding
  </FilesMatch>
  # The app's code has its content hash in the file name, so it never changes.
  <FilesMatch "^index-[0-9a-f]+\.js(\.gz)?$">
    Header set Cache-Control "public, max-age=31536000, immutable"
  </FilesMatch>
  <FilesMatch "\.(woff2|png|ttf|ttf\.gz)$">
    Header set Cache-Control "public, max-age=604800"
  </FilesMatch>
  <FilesMatch "^(index\.html|sw\.js|manifest\.webmanifest(\.gz)?)$">
    Header set Cache-Control "no-cache"
  </FilesMatch>
</IfModule>
"""


def main():
    (DIST / 'metadata.json').unlink(missing_ok=True)

    saved = 0
    for path in DIST.rglob('*'):
        if path.is_file() and path.suffix in COMPRESS and path.stat().st_size > 1024:
            data = path.read_bytes()
            packed = gzip.compress(data, compresslevel=9, mtime=0)
            path.with_name(path.name + '.gz').write_bytes(packed)
            saved += len(data) - len(packed)
    print(f'gzip copies written ({saved // 1024} KB less to download)')

    (DIST / '.htaccess').write_text(HTACCESS, encoding='utf-8', newline='\n')

    ZIP.unlink(missing_ok=True)
    with zipfile.ZipFile(ZIP, 'w', zipfile.ZIP_DEFLATED) as z:
        for path in sorted(DIST.rglob('*')):
            rel = path.relative_to(DIST).as_posix()
            if path.is_file() and not rel.startswith('push/data/'):
                z.write(path, rel)
    print(f'{ZIP.name}: {ZIP.stat().st_size // 1024} KB')


if __name__ == '__main__':
    main()
