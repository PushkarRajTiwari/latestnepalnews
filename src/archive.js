// The story archive keeps every story from the last `days` days, so each one
// keeps its own page on the site after it drops off the homepage, together
// with the summaries written for them.

import { byNewest } from './store.js';

// Combine the previous archive with this build's stories. A story's
// published time, first-seen time and summary survive feed refreshes.
export function mergeArchive(previous, items, { now = new Date(), days = 30 } = {}) {
  const byId = new Map();
  for (const story of previous) byId.set(story.id, story);
  for (const item of items) {
    const old = byId.get(item.id);
    byId.set(item.id, old ? { ...item, published: old.published, firstSeen: old.firstSeen, summaryId: old.summaryId } : item);
  }
  const cutoff = now.getTime() - days * 24 * 3600 * 1000;
  return [...byId.values()].filter((story) => Date.parse(story.published) >= cutoff).sort(byNewest);
}

// Drop summaries no remaining story points at, and links to stories that left
// the archive.
export function pruneSummaries(summaries, stories) {
  const ids = new Set(stories.map((s) => s.id));
  const used = new Set(stories.map((s) => s.summaryId).filter(Boolean));
  const kept = {};
  for (const [id, summary] of Object.entries(summaries)) {
    if (used.has(id)) kept[id] = { ...summary, itemIds: summary.itemIds.filter((itemId) => ids.has(itemId)) };
  }
  return kept;
}

// The date in Nepal (YYYY-MM-DD) for a timestamp.
export function nepalDate(iso) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kathmandu' }).format(new Date(iso));
}
