import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

import { categorize } from '../src/categorize.js';
import { stem, topStories } from '../src/cluster.js';
import { discoverFeedUrl, parseFeed } from '../src/parse.js';
import { context, renderList } from '../src/render.js';
import { mergeItems, normalizeItems } from '../src/store.js';
import { normalizeUrl, toPlainText, truncate } from '../src/util.js';

const now = new Date('2026-10-08T06:00:00Z');
const fixture = async (name) =>
  (await readFile(new URL(`fixtures/${name}`, import.meta.url), 'utf8')).replace(/\{\{ago:(\d+)\}\}/g, (_, m) =>
    new Date(now.getTime() - m * 60_000).toUTCString()
  );
const feed = (overrides = {}) => ({ id: 'test', name: 'Test', lang: 'en', url: 'https://example.com/feed', ...overrides });

test('parses RSS with CDATA, media images and categories', async () => {
  const items = parseFeed(await fixture('onlinekhabar-en.xml'), 'https://example.com/feed');
  assert.equal(items.length, 5);
  assert.equal(items[0].title, 'Budget amendment bill tabled in Parliament amid opposition protest');
  assert.equal(items[0].link, 'https://example.com/oke/1');
  assert.deepEqual(items[0].categories, ['Politics']);
  assert.match(items[0].image, /_fixtures\/1\.svg$/);
  assert.ok(items[0].published.startsWith('2026-10-08T05:35'));
});

test('parses Atom feeds', async () => {
  const items = parseFeed(await fixture('myrepublica.xml'), 'https://example.com/feed');
  assert.equal(items.length, 2);
  assert.equal(items[0].link, 'https://example.com/rep/1');
  assert.deepEqual(items[0].categories, ['Economy']);
});

test('rejects documents that are not feeds', () => {
  assert.throws(() => parseFeed('<html><body>hi</body></html>', 'https://example.com'), /Not an RSS or Atom feed/);
});

test('finds the feed link on an HTML page', () => {
  const html = '<head><link rel="alternate" type="application/rss+xml" title="Feed" href="/feed/"></head>';
  assert.equal(discoverFeedUrl(html, 'https://news.example.com/'), 'https://news.example.com/feed/');
});

test('cleans HTML and entities out of excerpts', () => {
  assert.equal(toPlainText('<p>Hello&nbsp;<b>world</b> &#8217;s &amp; more</p><script>x()</script>'), 'Hello world ’s & more');
  assert.equal(truncate('one two three four five', 12), 'one two…');
});

test('normalizes article URLs so duplicates match', () => {
  assert.equal(
    normalizeUrl('http://www.example.com/story/?utm_source=rss&id=4#top'),
    normalizeUrl('https://example.com/story?id=4')
  );
  assert.equal(normalizeUrl('javascript:alert(1)'), null);
});

test('categorizes Nepali and English headlines', () => {
  assert.equal(categorize({ title: 'नेपाली क्रिकेट टोलीले जित हात पार्यो', categories: [] }), 'sports');
  assert.equal(categorize({ title: 'सरकारले संसदमा विधेयक पेस गर्यो', categories: [] }), 'politics');
  assert.equal(categorize({ title: 'NEPSE index climbs 40 points', categories: [] }), 'business');
  assert.equal(categorize({ title: 'Something happened', categories: ['Entertainment'] }), 'entertainment');
  assert.equal(categorize({ title: 'Bus tickets for Dashain go on sale', categories: [] }), 'national');
  // "us" inside a word must not trigger anything
  assert.equal(categorize({ title: 'Business as usual for bus drivers', categories: [] }), 'business');
});

test('normalizeItems drops bad links and clamps future dates', () => {
  const items = normalizeItems(
    [
      { title: 'Good', link: 'https://example.com/a', html: '<p>Body</p>', published: '2030-01-01T00:00:00Z', categories: [] },
      { title: 'No link', link: null, html: '', published: null, categories: [] },
      { title: 'Bad link', link: 'javascript:alert(1)', html: '', published: null, categories: [] },
    ],
    feed(),
    now
  );
  assert.equal(items.length, 1);
  assert.equal(items[0].published, now.toISOString());
  assert.equal(items[0].excerpt, 'Body');
});

test('mergeItems keeps first-seen time, removes duplicates and old stories', () => {
  const old = { id: 'a', title: 'Story A', link: 'https://x/a', source: 's', lang: 'en', published: '2026-10-08T01:00:00Z', firstSeen: '2026-10-08T01:05:00Z' };
  const expired = { ...old, id: 'z', title: 'Ancient', published: '2026-10-01T00:00:00Z' };
  const fresh = [
    { ...old, firstSeen: '2026-10-08T06:00:00Z', excerpt: 'updated' },
    { ...old, id: 'b', title: 'Story  A!', source: 't' },
  ];
  const merged = mergeItems([old, expired], fresh, now);
  assert.equal(merged.length, 1);
  assert.equal(merged[0].firstSeen, '2026-10-08T01:05:00Z');
  assert.equal(merged[0].excerpt, 'updated');
});

test('groups the same story from different outlets', async () => {
  const items = [];
  for (const [name, id, lang] of [['onlinekhabar.xml', 'okb', 'np'], ['setopati.xml', 'seto', 'np'], ['bbc-nepali.xml', 'bbc', 'np']]) {
    items.push(...normalizeItems(parseFeed(await fixture(name), 'https://example.com'), feed({ id, lang }), now));
  }
  const top = topStories(items, { lang: 'np', now });
  const budget = top.find((c) => c.lead.title.includes('बजेट'));
  assert.equal(budget.related.length, 1);
  assert.equal(top[0].related.length, 1);
  assert.equal(stem('नेप्सेमा'), 'नेप्से');
});

test('escapes feed text in HTML', () => {
  const ctx = context({ lang: 'en', basePath: '', siteUrl: 'https://example.com', sources: new Map(), generatedAt: now.toISOString() });
  const html = renderList(ctx, {
    slug: 'latest',
    title: 'Latest',
    items: [{ id: 'x', title: '<script>alert(1)</script>', link: 'https://e.com/"><x', source: 's', lang: 'en', excerpt: '<img onerror=1>', image: 'javascript:1', published: now.toISOString() }],
  });
  assert.ok(!html.includes('<script>alert'));
  assert.ok(!html.includes('<img onerror'));
  assert.ok(!html.includes('javascript:1'));
  assert.ok(html.includes('&lt;script&gt;'));
});
