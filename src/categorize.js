import { categories, fallbackCategory } from '../config/categories.js';

function escapeRegExp(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Pre-compile one matcher per keyword.
const matchers = categories.map((category) => ({
  slug: category.slug,
  en: category.en.map((word) => new RegExp(`(^|[^\\p{L}\\p{N}])${escapeRegExp(word)}($|[^\\p{L}\\p{N}])`, 'iu')),
  np: category.np,
}));

function countHits(matcher, text) {
  let hits = 0;
  for (const re of matcher.en) if (re.test(text)) hits++;
  for (const word of matcher.np) if (text.includes(word)) hits++;
  return hits;
}

// Pick a category slug for an item: { title, excerpt, categories }.
export function categorize(item) {
  const body = `${item.title} ${item.excerpt || ''}`;
  const tags = (item.categories || []).join(' | ');
  let best = fallbackCategory.slug;
  let bestScore = 0;
  for (const matcher of matchers) {
    // Title counts double the excerpt; the publisher's own tags count most.
    const score = countHits(matcher, item.title) * 2 + countHits(matcher, body) + countHits(matcher, tags) * 3;
    if (score > bestScore) {
      best = matcher.slug;
      bestScore = score;
    }
  }
  return best;
}
