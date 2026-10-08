import { words } from './util.js';
import { byNewest } from './store.js';

// Words too common to say two headlines are about the same story.
const STOPWORDS = new Set([
  // English
  'a', 'an', 'the', 'of', 'in', 'on', 'at', 'to', 'for', 'from', 'by', 'with', 'and', 'or', 'but', 'is', 'are',
  'was', 'were', 'be', 'been', 'has', 'have', 'had', 'will', 'as', 'it', 'its', 'this', 'that', 'after', 'over',
  'into', 'about', 'says', 'said', 'new', 'nepal', 'nepali', 'nepals', 'up', 'out', 'not', 'no', 'more', 'than',
  // Nepali
  'र', 'मा', 'को', 'का', 'की', 'ले', 'लाई', 'बाट', 'छ', 'छन्', 'हो', 'भन्दै', 'भने', 'गर्न', 'गरे', 'गर्दै',
  'पनि', 'नै', 'यो', 'त्यो', 'एक', 'नेपाल', 'नेपालमा', 'नेपालको', 'आज', 'अब', 'थप', 'सम्म', 'तथा', 'भएको',
  'गरेको', 'हुने', 'रहेको', 'दिए', 'दिन', 'भयो', 'बारे',
]);

// Nepali case endings and plurals, longest first, so "नेप्सेमा" and
// "नेप्से" count as the same word.
const NP_SUFFIXES = ['हरूलाई', 'हरूले', 'हरूको', 'हरूमा', 'हरू', 'लाई', 'बाट', 'सँग', 'बीच', 'को', 'का', 'की', 'ले', 'मा'];

export function stem(word) {
  if (/[\u0900-\u097F]/.test(word)) {
    for (const suffix of NP_SUFFIXES) {
      if (word.endsWith(suffix) && word.length - suffix.length >= 2) return word.slice(0, -suffix.length);
    }
    return word;
  }
  if (word.length > 3 && word.endsWith('s') && !word.endsWith('ss')) return word.slice(0, -1);
  return word;
}

function signature(title) {
  return new Set(words(title).filter((w) => !STOPWORDS.has(w)).map(stem).filter((w) => w.length > 1 && !STOPWORDS.has(w)));
}

// How much two headlines overlap, measured against the shorter one.
function similarity(a, b) {
  let shared = 0;
  for (const word of a) if (b.has(word)) shared++;
  const smaller = Math.min(a.size, b.size);
  return { shared, overlap: smaller ? shared / smaller : 0 };
}

// Group recent items in one language that report the same story, so the
// homepage can show one headline with "also covered by" links. Returns
// clusters sorted by how many outlets covered the story, then by recency.
export function topStories(items, { lang, hours = 12, limit = 8, now = new Date() } = {}) {
  const cutoff = now.getTime() - hours * 3600 * 1000;
  const recent = items.filter((item) => item.lang === lang && Date.parse(item.published) >= cutoff).sort(byNewest);

  const clusters = [];
  for (const item of recent) {
    const sig = signature(item.title);
    let home = null;
    for (const cluster of clusters) {
      const { shared, overlap } = similarity(sig, cluster.sig);
      if (shared >= 3 && overlap >= 0.5) {
        home = cluster;
        break;
      }
    }
    if (home) {
      if (!home.items.some((other) => other.source === item.source)) home.items.push(item);
    } else {
      clusters.push({ sig, items: [item] });
    }
  }

  return clusters
    .map((cluster) => ({ lead: pickLead(cluster.items), items: cluster.items }))
    .sort((a, b) => b.items.length - a.items.length || byNewest(a.lead, b.lead))
    .filter(spreadSources())
    .slice(0, limit)
    .map(({ lead, items }) => ({ lead, related: items.filter((i) => i !== lead) }));
}

// Prefer an item with a picture and an excerpt as the cluster's headline.
function pickLead(items) {
  return [...items].sort((a, b) => score(b) - score(a) || byNewest(a, b))[0];
}

const score = (item) => (item.image ? 2 : 0) + (item.excerpt ? 1 : 0);

// Single-source stories: at most two per outlet, so one prolific site
// can't fill the whole top-stories block.
function spreadSources() {
  const perSource = new Map();
  return (cluster) => {
    if (cluster.items.length > 1) return true;
    const count = perSource.get(cluster.lead.source) || 0;
    perSource.set(cluster.lead.source, count + 1);
    return count < 2;
  };
}
