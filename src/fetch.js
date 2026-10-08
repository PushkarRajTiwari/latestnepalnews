import { discoverFeedUrl, looksLikeFeed, parseFeed } from './parse.js';
import { normalizeItems } from './store.js';
import { mapLimit } from './util.js';

const USER_AGENT = 'Mozilla/5.0 (compatible; LatestNepalNewsBot/1.0; +https://latestnepalnews.com/about/)';
const TIMEOUT_MS = 20_000;

async function get(url) {
  const response = await fetch(url, {
    headers: {
      'user-agent': USER_AGENT,
      accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml;q=0.9, text/html;q=0.5, */*;q=0.1',
    },
    redirect: 'follow',
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return { body: await response.text(), url: response.url || url };
}

async function getFeedBody(url) {
  let page;
  try {
    page = await get(url);
  } catch (error) {
    // One retry for flaky connections.
    await new Promise((resolve) => setTimeout(resolve, 2000));
    page = await get(url);
  }
  if (looksLikeFeed(page.body)) return page;
  const discovered = discoverFeedUrl(page.body, page.url);
  if (!discovered) throw new Error('No RSS feed found at this address');
  const feed = await get(discovered);
  if (!looksLikeFeed(feed.body)) throw new Error(`Discovered ${discovered} but it is not a feed`);
  return feed;
}

// Fetch one feed. Never throws: failures come back as { ok: false, error }.
export async function fetchFeed(feed, now = new Date()) {
  const started = Date.now();
  try {
    const { body, url } = await getFeedBody(feed.url);
    const items = normalizeItems(parseFeed(body, url), feed, now);
    return { id: feed.id, ok: true, count: items.length, url, ms: Date.now() - started, items };
  } catch (error) {
    const message = error.name === 'TimeoutError' ? 'Timed out' : error.message;
    return { id: feed.id, ok: false, error: message, ms: Date.now() - started, items: [] };
  }
}

export function fetchAll(feeds, now = new Date()) {
  return mapLimit(feeds, 6, (feed) => fetchFeed(feed, now));
}
