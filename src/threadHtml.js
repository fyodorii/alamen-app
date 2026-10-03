// Builds the HTML document shown in the thread reader's WebView.

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function buildThreadHtml({ thread, page, colors, dark, fontScale, offline }) {
  const base = Math.round(18 * fontScale);
  const posts = thread.posts
    .map(
      (p, i) => `
      <article class="post${i === 0 && page === 1 ? ' first' : ''}">
        <header>
          <span class="author">${esc(p.author)}</span>
          <span class="date">${esc(p.date)}</span>
        </header>
        <div class="content">${p.html}</div>
        <footer><a href="#" data-report="${i}" class="report">إبلاغ عن هذه المشاركة</a></footer>
      </article>`
    )
    .join('');

  const pager =
    !offline && thread.lastPage > 1
      ? `<nav class="pager">
          ${page < thread.lastPage ? `<a href="#" data-page="${page + 1}">الصفحة التالية ›</a>` : '<span></span>'}
          <span>صفحة ${page} من ${thread.lastPage}</span>
          ${page > 1 ? `<a href="#" data-page="${page - 1}">‹ السابقة</a>` : '<span></span>'}
        </nav>`
      : '';

  return `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=4">
<style>
  :root { color-scheme: ${dark ? 'dark' : 'light'}; }
  html, body { margin: 0; padding: 0; background: ${colors.bg}; color: ${colors.text}; }
  body { font-family: -apple-system, "SF Arabic", "Geeza Pro", sans-serif; font-size: ${base}px; line-height: 1.9;
         padding: 12px 12px 40px; -webkit-text-size-adjust: none; word-wrap: break-word; }
  h1 { font-size: 1.25em; line-height: 1.6; margin: 6px 4px 14px; color: ${colors.primary}; }
  .post { background: ${colors.card}; border: 1px solid ${colors.border}; border-radius: 14px; padding: 14px; margin-bottom: 12px; }
  .post.first { border-color: ${colors.accent}; }
  .post header { display: flex; justify-content: space-between; align-items: baseline; gap: 8px;
                 border-bottom: 1px solid ${colors.border}; padding-bottom: 8px; margin-bottom: 10px; }
  .author { font-weight: 700; color: ${colors.primary}; font-size: 0.85em; }
  .date { color: ${colors.muted}; font-size: 0.7em; white-space: nowrap; direction: ltr; unicode-bidi: isolate; }
  .post footer { margin-top: 10px; text-align: left; }
  .report { color: ${colors.muted} !important; font-size: 0.65em; text-decoration: none; }
  /* Old forum markup sets fixed fonts and sizes; let the reader's settings win. */
  .content * { font-family: inherit !important; font-size: inherit !important; line-height: inherit !important; }
  .content font[size="6"], .content font[size="7"] { font-weight: 700; }
  ${dark ? '.content * { color: inherit !important; background-color: transparent !important; }' : ''}
  .content img { max-width: 100%; height: auto; }
  .content iframe, .content video { width: 100% !important; max-width: 100%; border: 0; border-radius: 10px; }
  .content audio { width: 100%; }
  .content blockquote { margin: 0; }
  .content .bbcode_container { margin: 10px 0; }
  .content .bbcode_quote { background: ${dark ? '#0f1b1e' : '#f6f2e8'}; border-right: 3px solid ${colors.accent};
                           border-radius: 8px; padding: 8px 12px; font-size: 0.92em; }
  .content a { color: ${colors.primary}; }
  .pager { display: flex; justify-content: space-between; align-items: center; margin: 16px 0; font-size: 0.8em; color: ${colors.muted}; }
  .pager a { background: ${colors.primary}; color: #fff; text-decoration: none; padding: 8px 14px; border-radius: 10px; }
  .offline { text-align: center; color: ${colors.muted}; font-size: 0.7em; margin-bottom: 10px; }
</style>
</head>
<body>
  ${offline ? '<div class="offline">نسخة محفوظة للقراءة دون اتصال</div>' : ''}
  ${page === 1 ? `<h1>${esc(thread.title)}</h1>` : ''}
  ${pager}
  ${posts}
  ${pager}
<script>
  document.addEventListener('click', function (e) {
    var a = e.target.closest('a[data-page], a[data-report]');
    if (!a) return;
    e.preventDefault();
    var msg = a.dataset.page ? { type: 'page', page: +a.dataset.page } : { type: 'report', index: +a.dataset.report };
    window.ReactNativeWebView.postMessage(JSON.stringify(msg));
  });
</script>
</body>
</html>`;
}
