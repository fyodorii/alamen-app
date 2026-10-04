// Reads the vBulletin 4 forum at al-amen.com and turns its pages into plain data.
import { Platform } from 'react-native';
import { decodeCp1256 } from './cp1256';

// The web build is hosted on the forum's own domain, so it reads the forum from
// the same origin (browsers would block cross-site reads).
export const BASE_URL =
  Platform.OS === 'web' ? `${window.location.origin}/vb/` : 'https://www.al-amen.com/vb/';
export const POSTS_PER_PAGE = 40;

async function fetchText(path) {
  const res = await fetch(BASE_URL + path, {
    headers: Platform.OS === 'web' ? {} : { 'User-Agent': 'AlAmenApp/1.0 (iOS)' },
    // No forum cookies in or out: the app reads as a guest, and the style choice
    // below must not stick to the visitor's normal browsing of the forum.
    credentials: Platform.OS === 'web' ? 'omit' : undefined,
  });
  if (!res.ok) throw new Error('HTTP ' + res.status);
  return decodeCp1256(await res.arrayBuffer());
}

// vBulletin gives phones its "mobile style", whose pages the app cannot read, so ask
// for the full site's style. 108 is the id behind the forum's own "كامل الموقع" link;
// if it ever changes, that link in the mobile page gives the new one.
let fullSiteStyle = 108;
const isMobileStyle = (html) => html.includes('jquery.mobile');

async function fetchPage(path) {
  const withStyle = () => `${path}${path.includes('?') ? '&' : '?'}styleid=${fullSiteStyle}`;
  let html = await fetchText(withStyle());
  if (isMobileStyle(html)) {
    const link = html.match(/href="[^"]*[?&]styleid=(\d+)[^"]*"[^>]*class="fullsitelink"/);
    if (link && +link[1] !== fullSiteStyle) {
      fullSiteStyle = +link[1];
      html = await fetchText(withStyle());
    }
    if (isMobileStyle(html)) throw new Error('تعذّرت قراءة صفحة المنتدى. حاول لاحقاً.');
  }
  return html;
}

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };

export function decodeEntities(s) {
  return s.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (m, e) => {
    if (e[0] === '#') {
      const n = e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return isNaN(n) ? m : String.fromCodePoint(n);
    }
    return ENTITIES[e.toLowerCase()] ?? m;
  });
}

export function stripTags(s) {
  return decodeEntities(s.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, ''))
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n+/g, '\n')
    .trim();
}

// vBulletin appends a session id (&s=...) to links for guests; drop it.
function cleanHref(href) {
  return decodeEntities(href).replace(/[?&]s=[0-9a-f]{32}/, '');
}

function parseForumRows(html) {
  const forums = [];
  const parts = html.split(/<li id="forum(?=\d+")/).slice(1);
  for (const part of parts) {
    const id = part.match(/^(\d+)/)[1];
    const title = part.match(/class="forumtitle"><a [^>]*>([\s\S]*?)<\/a>/);
    if (!title) continue;
    const desc = part.match(/<p class="forumdescription">([\s\S]*?)<\/p>/);
    const threads = part.match(/المواضيع:\s*([\d,]+)/);
    const posts = part.match(/المشاركات:\s*([\d,]+)/);
    const subforums = [];
    const subRe = /<li class="subforum">[\s\S]*?forumdisplay\.php\?f=(\d+)[^>]*>([\s\S]*?)<\/a>/g;
    let m;
    while ((m = subRe.exec(part))) subforums.push({ id: m[1], title: stripTags(m[2]) });
    forums.push({
      id,
      title: stripTags(title[1]),
      description: desc ? stripTags(desc[1]) : '',
      threads: threads ? threads[1] : null,
      posts: posts ? posts[1] : null,
      subforums,
    });
  }
  return forums;
}

// Home page: categories, each with its forums.
export async function getForumIndex() {
  const html = await fetchPage('index.php');
  const sections = [];
  const cats = html.split(/<li class="forumbit_nopost[^"]*" id="cat/).slice(1);
  for (const cat of cats) {
    const id = cat.match(/^(\d+)/)[1];
    const title = cat.match(/class="forumtitle"><a [^>]*>([\s\S]*?)<\/a>/);
    sections.push({ id, title: title ? stripTags(title[1]) : '', forums: parseForumRows(cat) });
  }
  // An empty list means the page was not the one expected; say so instead of showing nothing.
  if (!sections.length) throw new Error('تعذّرت قراءة أقسام المنتدى. حاول لاحقاً.');
  return sections;
}

function lastPage(html, pattern) {
  let max = 1;
  const re = new RegExp(pattern + '(\\d+)', 'g');
  let m;
  while ((m = re.exec(html))) max = Math.max(max, parseInt(m[1], 10));
  return max;
}

// One page of a forum: its sub-forums (page 1 only) and its threads.
export async function getForum(forumId, page = 1) {
  // vBulletin redirects "&page=1" to the bare URL, so only send it for later pages.
  const html = await fetchPage(`forumdisplay.php?f=${forumId}${page > 1 ? `&page=${page}` : ''}`);
  const title = html.match(/<title>([\s\S]*?)<\/title>/);
  const threads = [];
  const parts = html.split(/<li class="threadbit/).slice(1);
  for (const part of parts) {
    const t = part.match(/id="thread_title_(\d+)"[^>]*>([\s\S]*?)<\/a>/);
    if (!t) continue;
    const author = part.match(/class="username understate" title="[^"]*? on ([^"]+)">([\s\S]*?)<\/a>/);
    const replies = part.match(/مشاركات:\s*([\d,]+)/);
    const views = part.match(/المشاهدات:\s*([\d,]+)/);
    const preview = part.match(/<div class="threadinfo" title="([^"]*)"/);
    threads.push({
      id: t[1],
      title: stripTags(t[2]),
      sticky: /class="rating\d+ sticky"/.test(part),
      author: author ? stripTags(author[2]) : '',
      date: author ? author[1] : '',
      replies: replies ? replies[1] : '0',
      views: views ? views[1] : '',
      preview: preview ? stripTags(preview[1]) : '',
    });
  }
  // Only sub-forums of this forum appear as forum rows on its page.
  const subforums = page === 1 ? parseForumRows(html) : [];
  return {
    title: title ? stripTags(title[1]).replace(/\s*-\s*شبكة الأمين السلفية\s*$/, '') : '',
    subforums,
    threads,
    lastPage: lastPage(html, `forumdisplay\\.php\\?f=${forumId}[^"]*?&amp;page=`),
  };
}

// One page of a thread, using vBulletin's lightweight print view.
export async function getThread(threadId, page = 1) {
  const html = await fetchPage(`printthread.php?t=${threadId}&pp=${POSTS_PER_PAGE}&page=${page}`);
  const title = html.match(/<div id="pagetitle">\s*<h1>(?:<a [^>]*>)?([\s\S]*?)<\/(?:a|h1)>/);
  const posts = [];
  const parts = html.split(/<li class="postbit blockbody" id="post_/).slice(1);
  for (const part of parts) {
    const date = part.match(/<div class="datetime">([\s\S]*?)<\/div>/);
    const user = part.match(/<span class="username">([\s\S]*?)<\/span>/);
    const start = part.indexOf('<div class="content">');
    let content = '';
    if (start >= 0) {
      // A post ends at its own "</div></li>"; the last post is followed by the
      // forum footer (clock and copyright), which must not leak into it.
      const body = part.slice(start + '<div class="content">'.length);
      let end = -1;
      for (const m of body.matchAll(/<\/div>\s*<\/li>/g)) end = m.index;
      content = (end >= 0 ? body.slice(0, end) : body).trim();
    }
    posts.push({
      author: user ? stripTags(user[1]) : '',
      date: date ? stripTags(date[1]) : '',
      html: content,
    });
  }
  if (!posts.length) throw new Error('لم يتم العثور على الموضوع أو أنه يحتاج إلى تسجيل الدخول');
  return {
    title: title ? stripTags(title[1]) : '',
    posts,
    lastPage: lastPage(html, `printthread\\.php\\?t=${threadId}[^"]*?&amp;page=`),
  };
}

// Newest activity across the whole forum (vBulletin RSS 2 feed).
export async function getLatest() {
  const xml = await fetchText('external.php?type=RSS2');
  const items = [];
  const re = /<item>([\s\S]*?)<\/item>/g;
  let m;
  const field = (s, tag) => {
    const f = s.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`));
    if (!f) return '';
    return f[1].replace(/^<!\[CDATA\[|\]\]>$/g, '');
  };
  while ((m = re.exec(xml))) {
    const s = m[1];
    const guid = field(s, 'guid');
    const id = (guid.match(/t=(\d+)/) || [])[1];
    if (!id) continue;
    items.push({
      id,
      title: stripTags(field(s, 'title')),
      author: stripTags(field(s, 'dc:creator')),
      forum: stripTags(field(s, 'category')),
      date: Date.parse(field(s, 'pubDate')), // timestamp, so it survives the JSON cache
      preview: stripTags(field(s, 'description')),
    });
  }
  return items;
}

const MONTHS = { Jan: 'يناير', Feb: 'فبراير', Mar: 'مارس', Apr: 'أبريل', May: 'مايو', Jun: 'يونيو',
  Jul: 'يوليو', Aug: 'أغسطس', Sep: 'سبتمبر', Oct: 'أكتوبر', Nov: 'نوفمبر', Dec: 'ديسمبر' };

// "19-Jun-2011, 05:00 PM" -> "19 يونيو 2011 - 05:00 م"; anything else is returned as-is.
export function formatForumDate(s) {
  if (!s) return '';
  const m = s.match(/(\d{1,2})-([A-Z][a-z]{2})-(\d{4}),?\s*(\d{1,2}:\d{2})\s*(AM|PM)?/);
  if (m && MONTHS[m[2]]) return `${+m[1]} ${MONTHS[m[2]]} ${m[3]} - ${m[4]}${m[5] ? (m[5] === 'AM' ? ' ص' : ' م') : ''}`;
  return s.replace(/Today/, 'اليوم').replace(/Yesterday/, 'أمس').replace(/AM/, 'ص').replace(/PM/, 'م');
}

export function threadUrl(threadId) {
  return `${BASE_URL}showthread.php?t=${threadId}`;
}

// Map a link inside a post to an in-app destination, if it points at this forum.
export function routeForLink(url) {
  if (!/^https?:\/\/(www\.)?al-amen\.com\/vb\//i.test(url) && !url.startsWith(BASE_URL)) return null;
  const clean = cleanHref(url);
  const t = clean.match(/showthread\.php\?(?:[^#]*&)?t=(\d+)/) || clean.match(/showthread\.php\/(\d+)/);
  if (t) return { screen: 'Thread', params: { id: t[1] } };
  const f = clean.match(/forumdisplay\.php\?(?:[^#]*&)?f=(\d+)/) || clean.match(/forumdisplay\.php\/(\d+)/);
  if (f) return { screen: 'Forum', params: { id: f[1] } };
  return null;
}
