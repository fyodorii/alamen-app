// Report emails to the site administration, for a whole topic or one post.
// Apple requires apps that show user-written content to offer a way to report it.
import { CONTACT_EMAIL } from './config';

export const mailtoUrl = (subject = '', body = '') =>
  `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

// post: {author, date} for one post, or nothing for the whole topic.
export function reportMailto({ title, url, page, post }) {
  return mailtoUrl(
    post ? 'إبلاغ عن مشاركة في تطبيق شبكة الأمين' : 'إبلاغ عن موضوع في تطبيق شبكة الأمين',
    `الموضوع: ${title}\n${url}\n` +
      (post ? `الصفحة: ${page}\nكاتب المشاركة: ${post.author} (${post.date})\n` : '') +
      '\nسبب الإبلاغ:\n'
  );
}
