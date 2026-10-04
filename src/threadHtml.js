// Builds the HTML document shown in the thread reader (WebView on iOS, iframe on the web).
import { formatForumDate, POSTS_PER_PAGE } from './api';
import { avatarFor } from './theme';

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function buildThreadHtml({ thread, page, colors, dark, fontScale, boldText, offline, baseUrl }) {
  const base = Math.round(21 * fontScale);
  const firstNumber = (page - 1) * POSTS_PER_PAGE + 1;
  const opener = thread.posts[0];

  const postHtml = (p, i) => {
    const av = avatarFor(p.author);
    const n = firstNumber + i;
    return `
      <article class="post${n === 1 ? ' opening' : ''}">
        <header>
          <span class="avatar" style="background:${av.color}">${esc(av.letter)}</span>
          <span class="who">
            <span class="author">${esc(p.author)}</span>
            <span class="date">${esc(formatForumDate(p.date))}</span>
          </span>
          <span class="num">#${n}</span>
        </header>
        <div class="content">${p.html}</div>
        <footer>
          <a href="#" data-share="1" class="action">⤴ مشاركة</a>
          <a href="#" data-report="${i}" class="action muted">⚑ إبلاغ</a>
        </footer>
      </article>`;
  };

  const posts = thread.posts
    .map((p, i) => postHtml(p, i) + (page === 1 && i === 0 && thread.posts.length > 1 ? '<div class="divider"><span>الردود</span></div>' : ''))
    .join('');

  const pager =
    !offline && thread.lastPage > 1
      ? `<nav class="pager">
          ${page < thread.lastPage ? `<a href="#" data-page="${page + 1}">الصفحة التالية ‹</a>` : '<span></span>'}
          <span>صفحة ${page} من ${thread.lastPage}</span>
          ${page > 1 ? `<a href="#" data-page="${page - 1}">› السابقة</a>` : '<span></span>'}
        </nav>`
      : '';

  const titleBlock =
    page === 1
      ? `<section class="title">
          <div class="ornament">۞</div>
          <h1>${esc(thread.title)}</h1>
          ${opener ? `<div class="meta">${esc(opener.author)} · ${esc(formatForumDate(opener.date))}</div>` : ''}
        </section>`
      : '';

  return `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
<meta charset="utf-8">
<base href="${baseUrl}">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=4">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Amiri:ital,wght@0,400;0,700;1,400&display=swap" rel="stylesheet">
<style>
  :root { color-scheme: ${dark ? 'dark' : 'light'}; }
  html, body { margin: 0; padding: 0; background: ${colors.bg}; color: ${colors.text}; }
  body { font-family: "Amiri", "Geeza Pro", serif; font-size: ${base}px; line-height: 2.05; font-weight: ${boldText ? 700 : 400};
         padding: 12px 12px 48px; -webkit-text-size-adjust: none; word-wrap: break-word; }
  a { -webkit-tap-highlight-color: transparent; }

  .title { background: linear-gradient(135deg, ${colors.heroFrom}, ${colors.heroTo}); color: #fff; border-radius: 18px;
           padding: 14px 18px 16px; margin-bottom: 14px; text-align: center; box-shadow: 0 6px 18px rgba(15,37,64,0.18); }
  .title .ornament { color: ${colors.gold}; font-size: 1.1em; line-height: 1.2; }
  .title h1 { font-size: 1.35em; line-height: 1.75; margin: 4px 0 6px; font-weight: 700; }
  .title .meta { font-size: 0.72em; opacity: 0.85; line-height: 1.6; }

  .post { background: ${colors.card}; border: 1px solid ${colors.border}; border-radius: 18px; padding: 12px 16px 8px;
          margin-bottom: 14px; box-shadow: 0 3px 10px rgba(15,37,64,${dark ? '0.3' : '0.06'}); }
  .post.opening { border-top: 4px solid ${colors.gold}; }
  .post header { display: flex; align-items: center; gap: 10px; border-bottom: 1px solid ${colors.border}; padding-bottom: 10px; margin-bottom: 8px; }
  .avatar { flex: none; width: 40px; height: 40px; border-radius: 50%; color: #fff; display: flex; align-items: center;
            justify-content: center; font-weight: 700; font-size: 20px; line-height: 1; }
  .who { flex: 1; display: flex; flex-direction: column; min-width: 0; line-height: 1.5; }
  .author { font-weight: 700; color: ${colors.primary}; font-size: 0.82em; }
  .date { color: ${colors.muted}; font-size: 0.62em; }
  .num { flex: none; color: ${colors.primary}; background: ${colors.primarySoft}; border-radius: 999px; padding: 0 10px;
         font-size: 0.62em; font-weight: 700; direction: ltr; }
  .post footer { display: flex; gap: 18px; justify-content: flex-start; border-top: 1px dashed ${colors.border}; margin-top: 10px; padding-top: 4px; }
  .action { color: ${colors.accent} !important; font-size: 0.68em; text-decoration: none; font-weight: 700; }
  .action.muted { color: ${colors.muted} !important; font-weight: 400; }

  /* Old forum markup sets fixed fonts and sizes; let the reader's settings win. */
  .content * { font-family: inherit !important; font-size: inherit !important; line-height: inherit !important; }
  .content b, .content strong { font-weight: 700; }
  ${boldText ? '.content * { font-weight: 700 !important; }' : ''}
  ${dark ? '.content * { color: inherit !important; background-color: transparent !important; }' : ''}
  .content img { max-width: 100%; height: auto; border-radius: 8px; }
  .content iframe, .content video { width: 100% !important; max-width: 100%; border: 0; border-radius: 12px; }
  .content audio { width: 100%; }
  .content blockquote { margin: 0; }
  .content .bbcode_container { margin: 10px 0; }
  .content .bbcode_quote { background: ${colors.accentSoft}; border-right: 4px solid ${colors.accent}; border-radius: 12px; padding: 8px 14px; }
  .content a { color: ${colors.accent}; }

  .divider { display: flex; align-items: center; gap: 12px; color: ${colors.primary}; font-weight: 700; font-size: 0.85em; margin: 6px 4px 14px; }
  .divider::before, .divider::after { content: ""; flex: 1; height: 1px; background: ${colors.border}; }

  .pager { display: flex; justify-content: space-between; align-items: center; margin: 16px 0; font-size: 0.75em; color: ${colors.muted}; }
  .pager a { background: ${colors.primary}; color: #fff; text-decoration: none; padding: 4px 16px; border-radius: 12px; }
  .share-all { display: block; text-align: center; background: linear-gradient(135deg, ${colors.heroFrom}, ${colors.heroTo});
               color: #fff !important; text-decoration: none; border-radius: 16px; padding: 8px; font-weight: 700; margin-top: 6px; }
  .offline { text-align: center; color: ${colors.muted}; font-size: 0.7em; margin-bottom: 10px; }
</style>
</head>
<body>
  ${offline ? '<div class="offline">نسخة محفوظة للقراءة دون اتصال</div>' : ''}
  ${titleBlock}
  ${pager}
  ${posts}
  ${pager}
  <a href="#" data-share="1" class="share-all">شارك هذا الموضوع ⤴</a>
<script>
  // In the web build the page lives in an iframe instead of a native WebView.
  function send(msg) {
    var data = JSON.stringify(msg);
    if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(data);
    else window.parent.postMessage({ alamen: data }, '*');
  }
  document.addEventListener('click', function (e) {
    var a = e.target.closest('a');
    if (!a) return;
    if (a.dataset.page) send({ type: 'page', page: +a.dataset.page });
    else if (a.dataset.report) send({ type: 'report', index: +a.dataset.report });
    else if (a.dataset.share) send({ type: 'share' });
    else if (a.href && a.getAttribute('href').charAt(0) !== '#') send({ type: 'link', url: a.href });
    else return;
    e.preventDefault();
  });
</script>
</body>
</html>`;
}
