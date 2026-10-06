import { register } from 'node:module';
register('./loader.mjs', import.meta.url);
const api = await import(process.env.API || '../../src/api.js');
for (const t of (process.env.THREADS || '22815,21047,23024').split(',')) {
  try {
    const th = await api.getThread(t, 1);
    console.log(`== ${t} "${th.title}" posts=${th.posts.length} lastPage=${th.lastPage}`);
    th.posts.forEach((p, i) => {
      if (p.attachmentCount || p.attachments.length) console.log(`  post ${i}: count=${p.attachmentCount}`, JSON.stringify(p.attachments));
      const imgs = p.html.match(/<img[^>]*>/g);
      if (imgs) console.log(`  post ${i} images:`, imgs.join(' '));
    });
  } catch (e) { console.log(`== ${t} ERROR ${e.message}`); }
}
