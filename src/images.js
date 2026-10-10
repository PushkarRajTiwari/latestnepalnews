// Preview images for stories whose feed carries none. Several outlets
// (Setopati, Lokaantar, Baahrakhari, The Kathmandu Post, ...) put no image
// in their RSS, but every article page names one in og:image for social
// previews. Each article page is read once: the result is remembered on the
// story (image, or noImage when the page has none) and carried forward
// through data/news.json and data/archive.json, so later builds skip it.

import { mapLimit, safeUrl } from './util.js';

const USER_AGENT = 'Mozilla/5.0 (compatible; LatestNepalNewsBot/1.0; +https://latestnepalnews.com/about/)';
const TIMEOUT_MS = 15_000;
const MAX_BYTES = 300_000; // og:image sits in <head>; no need for the whole page
export const MAX_PER_BUILD = 150;

// og:image, twitter:image or <link rel="image_src"> from an HTML page.
export function pageImage(html, pageUrl) {
  const tags = html.match(/<(meta|link)\b[^>]*>/gi) || [];
  const attr = (tag, name) => {
    const match = new RegExp(`\\b${name}\\s*=\\s*("([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i').exec(tag);
    return match ? (match[2] ?? match[3] ?? match[4]).trim() : null;
  };
  const wanted = ['og:image:secure_url', 'og:image', 'og:image:url', 'twitter:image', 'twitter:image:src'];
  const found = new Map();
  for (const tag of tags) {
    if (/^<link/i.test(tag)) {
      if ((attr(tag, 'rel') || '').toLowerCase() === 'image_src' && !found.has('image_src')) found.set('image_src', attr(tag, 'href'));
      continue;
    }
    const key = (attr(tag, 'property') || attr(tag, 'name') || '').toLowerCase();
    if (wanted.includes(key) && !found.has(key)) found.set(key, attr(tag, 'content'));
  }
  for (const key of [...wanted, 'image_src']) {
    const url = safeUrl(decodeEntities(found.get(key)), pageUrl);
    if (url) return url;
  }
  return null;
}

function decodeEntities(value) {
  return value && value.replace(/&amp;/g, '&').replace(/&#0*38;/g, '&').replace(/&quot;/g, '"');
}

function hostOf(link) {
  try {
    return new URL(link).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

async function readHead(url) {
  const response = await fetch(url, {
    headers: { 'user-agent': USER_AGENT, accept: 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.1' },
    redirect: 'follow',
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let html = '';
  while (html.length < MAX_BYTES) {
    const { done, value } = await reader.read();
    if (done) break;
    html += decoder.decode(value, { stream: true });
    if (/<\/head>/i.test(html)) break;
  }
  reader.cancel().catch(() => {});
  return { html, url: response.url || url };
}

// Give imageless items an image: first from what earlier builds learned
// (`known`: stories from the previous build and the archive), then by reading
// og:image from the article page. Returns counts for the build log.
export async function fillImages(items, known, { fetchPage = readHead, max = MAX_PER_BUILD } = {}) {
  const memory = new Map();
  for (const story of known) {
    if (story.image) memory.set(story.id, { image: story.image });
    else if (story.noImage) memory.set(story.id, { noImage: true });
  }
  const todo = [];
  let reused = 0;
  for (const item of items) {
    if (item.image || item.noImage) continue;
    const seen = memory.get(item.id);
    if (seen) {
      Object.assign(item, seen);
      reused++;
    } else {
      todo.push(item);
    }
  }
  const batch = todo.slice(0, max);
  let found = 0;
  let failed = 0;
  // One page at a time per outlet, several outlets at once: fast, and no
  // burst of requests to a single site.
  const byHost = new Map();
  for (const item of batch) {
    const host = hostOf(item.link);
    if (!byHost.has(host)) byHost.set(host, []);
    byHost.get(host).push(item);
  }
  await mapLimit([...byHost.values()], 6, (list) => mapLimit(list, 1, read));
  async function read(item) {
    try {
      const page = await fetchPage(item.link);
      const image = pageImage(page.html, page.url);
      if (image) {
        item.image = image;
        found++;
      } else {
        item.noImage = true;
      }
    } catch {
      // Network trouble: leave it unmarked so the next build tries again.
      failed++;
    }
  }
  return { reused, checked: batch.length, found, failed, left: todo.length - batch.length };
}
