// Builds the HTML document shown in the thread reader (WebView on iOS, iframe on the web).
import { Platform } from 'react-native';
import { formatForumDate, POSTS_PER_PAGE } from './api';
import { reportMailto } from './report';
import { avatarFor } from './theme';

// The web build serves its own small Amiri files (already cached by the app);
// the iOS app's WebView loads Amiri from Google Fonts.
function fontHead() {
  if (Platform.OS === 'web') {
    const url = (file) => new URL(`fonts/${file}`, window.location.href).href;
    return `<style>
  @font-face { font-family: "Amiri"; src: url(${url('amiri-regular.woff2')}) format("woff2"); font-weight: 400; font-display: swap; }
  @font-face { font-family: "Amiri"; src: url(${url('amiri-bold.woff2')}) format("woff2"); font-weight: 700; font-display: swap; }
</style>`;
  }
  return `<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Amiri:ital,wght@0,400;0,700;1,400&display=swap" rel="stylesheet">`;
}

const svg = (path) =>
  `<svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${path}</svg>`;
const ICON_SHARE = svg('<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4"/>');
const ICON_FLAG = svg('<path d="M4 22V4M4 4h13l-2 4 2 4H4"/>');

const ICON_CLIP = svg('<path d="M21 11l-8.5 8.5a5 5 0 0 1-7-7L14 4a3.5 3.5 0 0 1 5 5l-8.5 8.5a2 2 0 0 1-3-3L15 7"/>');
const ICON_FILE = svg('<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/>');
const ICON_AUDIO = svg('<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>');
const ICON_OPEN = svg('<path d="M12 3v12M7 10l5 5 5-5M5 21h14"/>');

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// A post's attachments: images as pictures, audio with a player, other files as cards.
function attachmentsHtml(list) {
  if (!list?.length) return '';
  const items = list
    .map((a) => {
      const url = esc(a.url);
      const meta = a.size ? `<span class="att-size">${esc(a.size)}</span>` : '';
      if (a.kind === 'image') return `<a href="${url}" class="att-img"><img src="${url}" loading="lazy" alt="${esc(a.name)}"></a>`;
      if (a.kind === 'audio')
        return `<div class="att-file">${ICON_AUDIO}<span class="att-name">${esc(a.name)}${meta}</span><a href="${url}" class="att-open">${ICON_OPEN}</a></div>
          <audio controls preload="none" src="${url}"></audio>`;
      return `<a href="${url}" class="att-file">${ICON_FILE}<span class="att-name">${esc(a.name)}${meta}</span><span class="att-open">${ICON_OPEN}</span></a>`;
    })
    .join('');
  return `<section class="atts"><div class="atts-title">${ICON_CLIP}<span>المرفقات (${list.length})</span></div>${items}</section>`;
}

export function buildThreadHtml({ thread, page, colors, dark, fontScale, boldText, offline, baseUrl, url }) {
  // Report buttons are real mailto: links, so the tap itself opens the mail app
  // (Safari ignores mailto: opened later from a message the page sends).
  const reportHref = (post) => esc(reportMailto({ title: thread.title, url, page, post }));
  const base = Math.round(21 * fontScale);
  const firstNumber = (page - 1) * POSTS_PER_PAGE + 1;
  const opener = thread.posts[0];

  const postHtml = (p, i) => {
    const av = avatarFor(p.author);
    const n = firstNumber + i;
    const byOpener = opener && page === 1 && p.author === opener.author;
    return `
      <article class="post${n === 1 ? ' opening' : ''}">
        <header>
          <span class="avatar" style="background:${av.color}">${esc(av.letter)}</span>
          <span class="who">
            <span class="author">${esc(p.author)}${byOpener ? '<span class="badge">كاتب الموضوع</span>' : ''}</span>
            <span class="date">${esc(formatForumDate(p.date))}</span>
          </span>
          <span class="num">#${n}</span>
        </header>
        <div class="content">${p.html}</div>
        ${attachmentsHtml(p.attachments)}
        <footer>
          <a href="#" data-share="1" class="btn">${ICON_SHARE}<span>مشاركة</span></a>
          <a href="${reportHref(p)}" target="_top" data-report="${i}" class="btn report">${ICON_FLAG}<span>إبلاغ</span></a>
        </footer>
      </article>`;
  };

  const posts = thread.posts
    .map((p, i) => postHtml(p, i) + (page === 1 && i === 0 && thread.posts.length > 1 ? '<div class="divider"><span>الردود</span></div>' : ''))
    .join('');

  const pager =
    !offline && thread.lastPage > 1
      ? `<nav class="pager">
          ${page > 1 ? `<a href="#" data-page="${page - 1}">› السابقة</a>` : '<span class="off">› السابقة</span>'}
          <span class="where">صفحة ${page} من ${thread.lastPage}</span>
          ${page < thread.lastPage ? `<a href="#" data-page="${page + 1}">التالية ‹</a>` : '<span class="off">التالية ‹</span>'}
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
<meta http-equiv="Content-Security-Policy" content="upgrade-insecure-requests">
<base href="${baseUrl}">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=4">
${fontHead()}
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

  .post { background: ${colors.card}; border: 1px solid ${colors.border}; border-radius: 18px; padding: 12px 16px 10px;
          margin-bottom: 12px; box-shadow: 0 3px 10px rgba(15,37,64,${dark ? '0.3' : '0.06'}); }
  .post.opening { border-top: 4px solid ${colors.gold}; }
  .post header { display: flex; align-items: center; gap: 10px; border-bottom: 1px solid ${colors.border}; padding-bottom: 8px; margin-bottom: 6px; }
  .avatar { flex: none; width: 40px; height: 40px; border-radius: 50%; color: #fff; display: flex; align-items: center;
            justify-content: center; font-weight: 700; font-size: 20px; line-height: 1; }
  .who { flex: 1; display: flex; flex-direction: column; min-width: 0; line-height: 1.5; }
  .author { font-weight: 700; color: ${colors.primary}; font-size: 0.82em; }
  .badge { display: inline-block; margin-inline-start: 6px; padding: 0 8px; border-radius: 999px; font-size: 0.72em;
           background: ${colors.goldSoft}; color: ${colors.gold}; vertical-align: middle; line-height: 1.7; }
  .date { color: ${colors.muted}; font-size: 0.62em; }
  .num { flex: none; color: ${colors.primary}; background: ${colors.primarySoft}; border-radius: 999px; padding: 0 10px;
         font-size: 0.62em; font-weight: 700; direction: ltr; }
  .post footer { display: flex; gap: 8px; justify-content: flex-end; border-top: 1px solid ${colors.border}; margin-top: 10px; padding-top: 8px; }
  .btn { display: inline-flex; align-items: center; gap: 6px; padding: 0 14px; border-radius: 999px; text-decoration: none;
         font-size: 0.66em; font-weight: 700; line-height: 2.2; color: ${colors.accent} !important; background: ${colors.accentSoft}; }
  .btn svg { font-size: 1.05em; }
  .btn.report { color: ${colors.danger} !important; background: ${colors.dangerSoft}; }

  /* Old forum markup sets fixed fonts and sizes; let the reader's settings win. */
  .content * { font-family: inherit !important; font-size: inherit !important; line-height: inherit !important; }
  .content b, .content strong { font-weight: 700; }
  ${boldText ? '.content * { font-weight: 700 !important; }' : ''}
  ${dark ? '.content * { color: inherit !important; background-color: transparent !important; }' : ''}
  .content img { max-width: 100%; height: auto; border-radius: 8px; vertical-align: middle; }
  .content .imglink { display: inline-block; }

  .atts { margin-top: 10px; padding: 8px 10px; border-radius: 14px; background: ${colors.bg}; border: 1px solid ${colors.border}; }
  .atts-title { display: flex; align-items: center; gap: 6px; color: ${colors.primary}; font-weight: 700; font-size: 0.7em; margin-bottom: 4px; }
  .att-img { display: block; margin: 6px 0; }
  .att-img img { display: block; max-width: 100%; height: auto; border-radius: 10px; border: 1px solid ${colors.border}; }
  .att-file { display: flex; align-items: center; gap: 10px; margin: 6px 0; padding: 4px 12px; border-radius: 12px; text-decoration: none;
              background: ${colors.card}; border: 1px solid ${colors.border}; color: ${colors.text} !important; font-size: 0.72em; line-height: 1.7; }
  .att-file > svg { flex: none; font-size: 1.4em; color: ${colors.accent}; }
  .att-name { flex: 1; min-width: 0; overflow-wrap: anywhere; }
  .att-size { display: block; color: ${colors.muted}; font-size: 0.85em; }
  .att-open { flex: none; color: ${colors.accent} !important; font-size: 1.3em; display: flex; }
  .atts audio { display: block; width: 100%; height: 40px; margin: 2px 0 6px; }
  .content iframe, .content video { width: 100% !important; max-width: 100%; border: 0; border-radius: 12px; }
  .content audio { width: 100%; }
  .content blockquote { margin: 0; }
  .content .bbcode_container { margin: 10px 0; }
  .content .bbcode_quote { background: ${colors.accentSoft}; border-right: 4px solid ${colors.accent}; border-radius: 12px; padding: 8px 14px; }
  .content a { color: ${colors.accent}; }

  .divider { display: flex; align-items: center; gap: 12px; color: ${colors.primary}; font-weight: 700; font-size: 0.85em; margin: 6px 4px 14px; }
  .divider::before, .divider::after { content: ""; flex: 1; height: 1px; background: ${colors.border}; }

  .pager { display: flex; justify-content: space-between; align-items: center; gap: 8px; margin: 4px 0 14px; font-size: 0.72em;
           background: ${colors.card}; border: 1px solid ${colors.border}; border-radius: 16px; padding: 6px; }
  .pager a, .pager .off { background: ${colors.primary}; color: #fff; text-decoration: none; padding: 2px 14px; border-radius: 12px; font-weight: 700; }
  .pager .off { background: ${colors.border}; color: ${colors.muted}; }
  .pager .where { color: ${colors.muted}; }
  .end { display: flex; gap: 10px; margin-top: 6px; }
  .end a { flex: 1; display: flex; align-items: center; justify-content: center; gap: 8px; text-decoration: none; border-radius: 16px;
           padding: 6px; font-weight: 700; font-size: 0.85em; }
  .share-all { background: linear-gradient(135deg, ${colors.heroFrom}, ${colors.heroTo}); color: #fff !important; }
  .report-all { background: ${colors.dangerSoft}; color: ${colors.danger} !important; flex: 0 0 auto !important; padding: 6px 18px !important; }
  .offline { text-align: center; color: ${colors.muted}; font-size: 0.7em; margin-bottom: 10px; }
</style>
</head>
<body>
  ${offline ? '<div class="offline">نسخة محفوظة للقراءة دون اتصال</div>' : ''}
  ${titleBlock}
  ${pager}
  ${posts}
  ${pager}
  <div class="end">
    <a href="#" data-share="1" class="share-all">${ICON_SHARE}<span>شارك هذا الموضوع</span></a>
    <a href="${reportHref(null)}" target="_top" data-report="topic" class="report-all">${ICON_FLAG}<span>إبلاغ</span></a>
  </div>
<script>
  // In the web build the page lives in an iframe instead of a native WebView.
  function send(msg) {
    var data = JSON.stringify(msg);
    if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(data);
    else window.parent.postMessage({ alamen: data }, '*');
  }
  // A posted image that does not load (gone, or not a picture) shows as its link again.
  document.addEventListener('error', function (e) {
    var img = e.target;
    if (img.tagName !== 'IMG' || !img.parentNode.classList.contains('imglink')) return;
    img.parentNode.textContent = img.getAttribute('data-text') || img.src;
  }, true);
  document.addEventListener('click', function (e) {
    var a = e.target.closest('a');
    if (!a) return;
    if (a.dataset.page) send({ type: 'page', page: +a.dataset.page });
    else if (a.dataset.report) {
      // In the browser the mailto: link opens the mail app by itself.
      if (!window.ReactNativeWebView) return;
      send({ type: 'report', index: a.dataset.report === 'topic' ? null : +a.dataset.report });
    }
    else if (a.dataset.share) send({ type: 'share' });
    else if (a.href && a.getAttribute('href').charAt(0) !== '#') send({ type: 'link', url: a.href });
    else return;
    e.preventDefault();
  });
</script>
</body>
</html>`;
}
