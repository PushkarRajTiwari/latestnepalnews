import { categorize } from './categorize.js';
import { normalizeUrl, shortHash, toPlainText, truncate, words } from './util.js';

export const KEEP_HOURS = 72;
export const MAX_ITEMS = 2000;
export const MAX_PER_FEED = 40;
const EXCERPT_CHARS = 220;

// Turn raw parsed items from one feed into stored items.
export function normalizeItems(rawItems, feed, now = new Date()) {
  const nowIso = now.toISOString();
  const out = [];
  for (const raw of rawItems.slice(0, MAX_PER_FEED)) {
    const link = normalizeUrl(raw.link);
    if (!link || !raw.title) continue;
    let published = raw.published;
    // Feeds sometimes carry missing or future dates (wrong timezone). Clamp.
    if (!published || Date.parse(published) > now.getTime() + 5 * 60 * 1000) published = nowIso;
    const excerpt = truncate(toPlainText(raw.html), EXCERPT_CHARS);
    const item = {
      id: shortHash(link),
      title: truncate(raw.title, 200),
      link: raw.link,
      source: feed.id,
      lang: feed.lang,
      excerpt: excerpt === raw.title ? '' : excerpt,
      image: raw.image || null,
      published,
      firstSeen: nowIso,
    };
    item.category = feed.category || categorize({ ...item, categories: raw.categories });
    out.push(item);
  }
  return out;
}

const titleKey = (item) => `${item.lang}:${words(item.title).join(' ')}`;

// Merge freshly fetched items into the previous set: keep the earliest
// firstSeen, refresh everything else, drop duplicates and old items.
export function mergeItems(previous, fresh, now = new Date()) {
  const byId = new Map();
  for (const item of previous) byId.set(item.id, item);
  for (const item of fresh) {
    const old = byId.get(item.id);
    byId.set(item.id, old ? { ...item, firstSeen: old.firstSeen, published: old.published } : item);
  }

  const cutoff = now.getTime() - KEEP_HOURS * 3600 * 1000;
  const sorted = [...byId.values()]
    .filter((item) => Date.parse(item.published) >= cutoff)
    .sort(byNewest);

  // The same headline syndicated under two URLs: keep the first (newest).
  const seenTitles = new Set();
  const unique = [];
  for (const item of sorted) {
    const key = titleKey(item);
    if (seenTitles.has(key)) continue;
    seenTitles.add(key);
    unique.push(item);
  }
  return unique.slice(0, MAX_ITEMS);
}

export function byNewest(a, b) {
  return Date.parse(b.published) - Date.parse(a.published) || a.id.localeCompare(b.id);
}
