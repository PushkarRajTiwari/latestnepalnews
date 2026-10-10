import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

import { mergeArchive, pruneSummaries } from '../src/archive.js';
import { categorize } from '../src/categorize.js';
import { stem, topStories } from '../src/cluster.js';
import { choosePosts, postMessage, postToFacebook, prunePosted } from '../src/facebook.js';
import { fillImages, pageImage } from '../src/images.js';
import { discoverFeedUrl, parseFeed } from '../src/parse.js';
import { context, renderList, renderStory } from '../src/render.js';
import { mergeItems, normalizeItems } from '../src/store.js';
import { planSummaries, writeSummaries } from '../src/summarize.js';
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
  // Nepalis abroad beat World when both match
  assert.equal(categorize({ title: 'अमेरिकामा नेपाली समुदायले तीज मनायो', categories: [] }), 'diaspora');
  assert.equal(categorize({ title: 'Nepali migrant workers stranded in Malaysia', categories: [] }), 'diaspora');
  assert.equal(categorize({ title: 'China and India hold border talks', categories: [] }), 'world');
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

const story = (id, source, title, minutesAgo = 30, extra = {}) => ({
  id, title, link: `https://${source}.example/${id}`, source, lang: 'en', excerpt: `${title} excerpt`, image: null,
  category: 'politics', published: new Date(now.getTime() - minutesAgo * 60_000).toISOString(), firstSeen: now.toISOString(), ...extra,
});
const budgetStories = () => [
  story('a', 'kp', 'Finance minister presents federal budget in parliament today'),
  story('b', 'ht', 'Federal budget presented in parliament by finance minister', 40),
  story('c', 'rep', 'Unrelated story about weather in Pokhara', 50),
];
const enCtx = () => context({ lang: 'en', basePath: '', siteUrl: 'https://example.com', sources: new Map([['kp', { name: 'Kathmandu Post' }]]), generatedAt: now.toISOString() });

test('the archive keeps summaries and first-seen times, and drops stories past its window', () => {
  const kept = story('a', 'kp', 'Kept', 60, { summaryId: 's1', firstSeen: '2026-10-08T04:00:00Z' });
  const old = story('z', 'kp', 'Old', 60 * 24 * 40);
  const merged = mergeArchive([kept, old], [story('a', 'kp', 'Kept, new title', 10)], { now, days: 30 });
  assert.deepEqual(merged.map((s) => s.id), ['a']);
  assert.equal(merged[0].summaryId, 's1');
  assert.equal(merged[0].title, 'Kept, new title');
  assert.equal(merged[0].firstSeen, '2026-10-08T04:00:00Z');
  const summaries = pruneSummaries({ s1: { itemIds: ['a', 'z'] }, s2: { itemIds: ['z'] } }, merged);
  assert.deepEqual(summaries, { s1: { itemIds: ['a'] } });
});

test('plans one summary per story that several outlets cover, and reuses it', () => {
  const stories = budgetStories();
  const summaries = {};
  const jobs = planSummaries(stories, summaries, { lang: 'en', now });
  assert.equal(jobs.length, 1);
  assert.deepEqual(jobs[0].members.map((m) => m.id).sort(), ['a', 'b']);

  // Once written, a new outlet joining attaches to it without a rewrite.
  summaries[jobs[0].id] = { lang: 'en', text: 'x', count: 2, itemIds: ['a', 'b'] };
  stories[0].summaryId = stories[1].summaryId = jobs[0].id;
  stories.push(story('d', 'oke', 'Finance minister presents budget in federal parliament', 20));
  assert.equal(planSummaries(stories, summaries, { lang: 'en', now }).length, 0);
  assert.equal(stories[3].summaryId, jobs[0].id);
  // A second new outlet triggers a rewrite.
  stories.push(story('e', 'set', 'Budget presented in federal parliament by finance minister', 15));
  assert.equal(planSummaries(stories, summaries, { lang: 'en', now }).length, 1);
});

const fakeClient = (reply) => {
  const calls = [];
  return {
    calls,
    beta: { messages: { create: async (params) => (calls.push(params), reply(params)) } },
  };
};

test('writes summaries with Claude and records skips and failures', async () => {
  const stories = budgetStories();
  const summaries = {};
  const jobs = planSummaries(stories, summaries, { lang: 'en', now });
  const client = fakeClient(() => ({ stop_reason: 'end_turn', content: [{ type: 'text', text: 'The budget was presented.\n\nOpposition protested.' }] }));
  const written = await writeSummaries(jobs, summaries, { client, model: 'claude-opus-5-5', max: 5, sourceName: (id) => id, now });
  assert.equal(written, 1);
  const summary = summaries[jobs[0].id];
  assert.equal(summary.text, 'The budget was presented.\n\nOpposition protested.');
  assert.equal(summary.count, 2);
  assert.equal(stories[0].summaryId, jobs[0].id);
  const params = client.calls[0];
  assert.equal(params.model, 'claude-opus-5-5');
  assert.equal(params.fallbacks, 'default');
  assert.match(params.messages[0].content, /<headline>Finance minister presents/);
  assert.match(params.system, /English/);

  // SKIP and refusals are stored so they aren't retried every build.
  const skipped = {};
  const skipJobs = planSummaries(budgetStories(), skipped, { lang: 'en', now });
  await writeSummaries(skipJobs, skipped, { client: fakeClient(() => ({ stop_reason: 'refusal', content: [] })), model: 'claude-haiku-5-5', max: 5, sourceName: (id) => id, now });
  assert.equal(skipped[skipJobs[0].id].skip, true);

  // Errors are logged and skipped; nothing is stored.
  const failed = {};
  const failJobs = planSummaries(budgetStories(), failed, { lang: 'en', now });
  const boom = fakeClient(() => {
    throw Object.assign(new Error('invalid x-api-key'), { status: 401 });
  });
  assert.equal(await writeSummaries(failJobs, failed, { client: boom, model: 'claude-haiku-5-5', max: 5, sourceName: (id) => id, now }), 0);
  assert.deepEqual(failed, {});
  assert.equal(boom.calls[0].fallbacks, undefined);
});

test('story pages keep readers on the site and link out once', () => {
  const ctx = enCtx();
  const [a, b] = budgetStories();
  a.image = 'https://kp.example/photo.jpg';
  const summary = { text: 'First paragraph.\n\nSecond <b>paragraph</b>.', count: 2, itemIds: ['a', 'b'] };
  const html = renderStory(ctx, { item: a, summary, others: [b], more: [b] });
  assert.ok(html.includes('<link rel="canonical" href="https://example.com/en/news/a/">'));
  assert.ok(html.includes('<meta property="og:type" content="article">'));
  assert.ok(html.includes('<meta property="og:image" content="https://kp.example/photo.jpg">'));
  assert.ok(html.includes(`<meta property="og:title" content="${a.title}">`));
  assert.ok(html.includes('Read the full story at Kathmandu Post'));
  assert.ok(html.includes('href="https://kp.example/a"'));
  assert.ok(html.includes('https://wa.me/?text='));
  assert.ok(html.includes('&lt;b&gt;paragraph'));
  assert.ok(html.includes('href="/en/news/b/"'));
  assert.ok(!html.includes('noindex'));
  assert.ok(!html.includes('rel="alternate" hreflang'));
  const ld = JSON.parse(html.match(/<script type="application\/ld\+json">(.*?)<\/script>/)[1]);
  assert.equal(ld['@type'], 'NewsArticle');
  assert.deepEqual(ld.isBasedOn, ['https://kp.example/a', 'https://ht.example/b']);

  b.image = 'http://kp.example/old.jpg';
  const plain = renderStory(ctx, { item: b });
  assert.ok(plain.includes('src="https://kp.example/old.jpg"'));
  assert.ok(plain.includes('noindex'));
  assert.ok(plain.includes('Excerpt from'));

  b.title = 'Bad </script><script>alert(1)</script>';
  const tricky = renderStory(ctx, { item: b });
  assert.equal(tricky.split('</script>').length - 1, 2); // JSON-LD and app.js only
});

test('headline cards link to the story page on the site', () => {
  const html = renderList(enCtx(), { slug: 'latest', title: 'Latest', items: budgetStories() });
  assert.ok(html.includes('href="/en/news/a/"'));
  assert.ok(!html.includes('href="https://kp.example/a"'));
});

test('reads a plain <image> tag on an RSS item, as Onlinekhabar sends', () => {
  const xml = `<rss><channel><image><url>https://ok.example/logo.png</url></image>
<item><title>A</title><link>https://ok.example/a</link><image>https://ok.example/a.jpg</image></item></channel></rss>`;
  assert.equal(parseFeed(xml, 'https://ok.example/feed')[0].image, 'https://ok.example/a.jpg');
});

test('finds the og:image on an article page', () => {
  const head = `<head><meta name="twitter:image" content="https://x.example/tw.jpg">
<meta content='/uploads/a.jpg?w=1&amp;h=2' property='og:image' /></head>`;
  assert.equal(pageImage(head, 'https://x.example/story/1'), 'https://x.example/uploads/a.jpg?w=1&h=2');
  assert.equal(pageImage('<link rel="image_src" href="https://x.example/i.png">', 'https://x.example/'), 'https://x.example/i.png');
  assert.equal(pageImage('<meta property="og:title" content="t">', 'https://x.example/'), null);
});

test('fills missing images from earlier builds, then from article pages, reading each page once', async () => {
  const items = [
    story('a', 'kp', 'Has one', 10, { image: 'https://kp.example/a.jpg' }),
    story('b', 'kp', 'Known from last build'),
    story('c', 'kp', 'Page has none last time'),
    story('d', 'kp', 'New with og'),
    story('e', 'kp', 'New without og'),
    story('f', 'kp', 'Site down'),
  ];
  const known = [{ id: 'b', image: 'https://kp.example/b.jpg' }, { id: 'c', image: null, noImage: true }];
  const read = [];
  const pages = {
    'https://kp.example/d': '<meta property="og:image" content="https://kp.example/d.jpg">',
    'https://kp.example/e': '<title>e</title>',
  };
  const result = await fillImages(items, known, {
    fetchPage: async (url) => {
      read.push(url);
      if (!pages[url]) throw new Error('down');
      return { html: pages[url], url };
    },
  });
  assert.deepEqual(read.sort(), ['https://kp.example/d', 'https://kp.example/e', 'https://kp.example/f']);
  assert.deepEqual(items.map((i) => i.image), ['https://kp.example/a.jpg', 'https://kp.example/b.jpg', null, 'https://kp.example/d.jpg', null, null]);
  assert.equal(items[4].noImage, true);
  assert.equal(items[5].noImage, undefined);
  assert.deepEqual(result, { reused: 2, checked: 3, found: 1, failed: 1, left: 0 });
});

test('cards without a picture show the outlet placeholder', () => {
  const html = renderList(enCtx(), { slug: 'latest', title: 'Latest', items: [story('a', 'kp', 'No picture')] });
  assert.match(html, /class="thumb thumb-sm thumb-ph"[^>]*><span>Kathmandu Post<\/span>|class="thumb thumb-ph"[^>]*><span>Kathmandu Post<\/span>/);
});

test('Facebook: picks live, recent, multi-outlet top stories not posted before', () => {
  const lead = (id, minutesAgo) => story(id, 'kp', `Story ${id}`, minutesAgo);
  const clusters = [
    { lead: lead('a', 30), related: [lead('a2', 30)] },
    { lead: lead('b', 30), related: [] },
    { lead: lead('c', 30), related: [lead('c2', 30)] },
    { lead: lead('d', 60 * 10), related: [lead('d2', 30)] },
    { lead: lead('e', 30), related: [lead('e2', 30)] },
    { lead: lead('f', 30), related: [lead('f2', 30)] },
  ];
  const picked = choosePosts(clusters, {
    live: new Set(['a', 'b', 'd', 'e', 'f']),
    posted: { e: { postId: '1' } },
    now,
    minSources: 2,
    hours: 6,
    max: 3,
  });
  assert.deepEqual(picked.map((s) => s.id), ['a', 'f']);
});

test('Facebook: posts credited headlines with a link, and skips ones already on the page', async () => {
  const calls = [];
  const fetchImpl = async (url, init) => {
    calls.push({ url: String(url), method: init.method, body: init.body && Object.fromEntries(init.body) });
    if (init.method === 'GET') return new Response(JSON.stringify({ data: [{ attachments: { data: [{ url: 'https://l.facebook.com/l.php?u=https%3A%2F%2Fsite.example%2Fnews%2Fb%2F' }] } }] }));
    return new Response(JSON.stringify({ id: 'page_post1' }));
  };
  const posted = {};
  const a = { ...story('a', 'kp', 'मन्त्रीले भने'), lang: 'np' };
  const result = await postToFacebook([a, story('b', 'kp', 'B')], {
    pageId: '123',
    token: 'tok',
    version: 'v23.0',
    posted,
    urlFor: (s) => `https://site.example/news/${s.id}/`,
    message: (s) => postMessage(s, { sourceName: () => 'अनलाइनखबर', lang: s.lang }),
    fetchImpl,
    now,
  });
  assert.deepEqual(result, { posted: 1, skipped: 1 });
  const post = calls.find((c) => c.method === 'POST');
  assert.ok(post.url.startsWith('https://graph.facebook.com/v23.0/123/feed'));
  assert.deepEqual(post.body, { message: 'मन्त्रीले भने\n\nस्रोत: अनलाइनखबर', link: 'https://site.example/news/a/', access_token: 'tok' });
  assert.equal(posted.a.postId, 'page_post1');
  assert.ok(posted.b);
  assert.deepEqual(Object.keys(prunePosted({ a: {}, zz: {} }, [{ id: 'a' }])), ['a']);
});
