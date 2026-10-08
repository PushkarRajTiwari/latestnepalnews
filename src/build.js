// Fetch every feed, merge with the previous run's stories and write the
// static site to dist/.
//
//   node src/build.js            fetch live feeds
//   node src/build.js --offline  use the sample feeds in test/fixtures
//
// Environment:
//   SITE_URL   public address, e.g. https://latestnepalnews.com
//   BASE_PATH  path the site is served under, e.g. /latestnepalnews ("" at a domain root)

import { createHash } from 'node:crypto';
import { cp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { allCategories } from '../config/categories.js';
import { feeds } from '../config/feeds.js';
import { site } from '../config/site.js';
import { topStories } from './cluster.js';
import { fetchAll } from './fetch.js';
import { parseFeed } from './parse.js';
import { context, pathFor, renderHome, renderList, renderNotFound, renderPage, renderSources } from './render.js';
import { mergeItems, normalizeItems } from './store.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');
const offline = process.argv.includes('--offline');

const siteUrl = (process.env.SITE_URL || site.url).replace(/\/$/, '');
const basePath = (process.env.BASE_PATH || '').replace(/\/$/, '');

async function loadPrevious() {
  if (offline) return [];
  try {
    const response = await fetch(`${siteUrl}/data/news.json`, { signal: AbortSignal.timeout(15_000) });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    console.log(`Loaded ${data.items.length} stories from the previous build`);
    return Array.isArray(data.items) ? data.items : [];
  } catch (error) {
    console.log(`No previous stories (${error.message}); starting fresh`);
    return [];
  }
}

async function loadFixtures(now) {
  const dir = join(root, 'test', 'fixtures');
  const results = [];
  for (const feed of feeds) {
    try {
      // Sample feeds write dates as {{ago:MINUTES}} so they always look fresh.
      const xml = (await readFile(join(dir, `${feed.id}.xml`), 'utf8')).replace(/\{\{ago:(\d+)\}\}/g, (_, minutes) =>
        new Date(now.getTime() - minutes * 60_000).toUTCString()
      );
      const items = normalizeItems(parseFeed(xml, feed.url), feed, now);
      results.push({ id: feed.id, ok: true, count: items.length, items });
    } catch {
      results.push({ id: feed.id, ok: false, error: 'No sample feed', items: [] });
    }
  }
  return results;
}

async function write(path, content) {
  const file = join(dist, path);
  await mkdir(dirname(file), { recursive: true });
  await writeFile(file, content);
}

async function main() {
  const now = new Date();
  const previous = await loadPrevious();
  const results = offline ? await loadFixtures(now) : await fetchAll(feeds, now);

  for (const r of results) {
    console.log(`${r.ok ? '✓' : '✗'} ${r.id.padEnd(18)} ${r.ok ? `${r.count} items` : r.error}`);
  }
  const working = results.filter((r) => r.ok).length;
  console.log(`${working}/${feeds.length} feeds working`);

  const fresh = results.flatMap((r) => r.items);
  const known = new Set(feeds.map((f) => f.id));
  const items = mergeItems(previous.filter((item) => known.has(item.source)), fresh, now);
  if (!items.length && !offline) {
    // Every feed failed and there is nothing from before: don't publish an empty site.
    throw new Error('No stories at all; refusing to publish an empty site');
  }

  await rm(dist, { recursive: true, force: true });
  await cp(join(root, 'static'), dist, { recursive: true });
  if (offline) await cp(join(root, 'test', 'fixtures', 'images'), join(dist, '_fixtures'), { recursive: true });

  const assetVersion = createHash('sha1')
    .update(await readFile(join(root, 'static', 'style.css')))
    .update(await readFile(join(root, 'static', 'app.js')))
    .digest('hex')
    .slice(0, 8);

  const sources = new Map(feeds.map((f) => [f.id, f]));
  const status = new Map(results.map((r) => [r.id, r]));
  const generatedAt = now.toISOString();
  const urls = [];

  for (const lang of ['np', 'en']) {
    const ctx = { ...context({ lang, basePath, siteUrl, sources, generatedAt }), assetVersion };
    const mine = items.filter((item) => item.lang === lang);
    const page = async (slug, html, inSitemap = true) => {
      await write(join(pathFor(lang, slug), 'index.html'), html);
      if (inSitemap) urls.push(ctx.absolute(pathFor(lang, slug)));
    };

    const byCategory = new Map(allCategories.map((c) => [c.slug, mine.filter((item) => item.category === c.slug)]));
    const top = topStories(items, { lang, now, limit: site.topStories });
    console.log(`\n[${lang}] ${mine.length} stories: ${[...byCategory].map(([slug, list]) => `${slug} ${list.length}`).join(', ')}`);
    for (const cluster of top) console.log(`  top: ${cluster.related.length + 1} sources · ${cluster.lead.title}`);
    const shown = new Set(top.flatMap((c) => [c.lead, ...c.related]).map((item) => item.id));
    const homeSections = new Map(
      [...byCategory].map(([slug, list]) => [slug, list.filter((item) => !shown.has(item.id)).slice(0, site.perSection)])
    );

    await page('', renderHome(ctx, { top, byCategory: homeSections, latest: mine.slice(0, site.latestSidebar) }));
    await page('latest', renderList(ctx, { slug: 'latest', title: ctx.t.latestNews, items: mine.slice(0, site.perLatestPage) }));
    for (const category of allCategories) {
      await page(
        category.slug,
        renderList(ctx, { slug: category.slug, title: category.label[lang], items: byCategory.get(category.slug).slice(0, site.perCategoryPage) })
      );
    }
    const counts = new Map();
    for (const item of items) counts.set(item.source, (counts.get(item.source) || 0) + 1);
    await page('sources', renderSources(ctx, { feeds: feeds.filter((f) => f.lang === lang), status, counts }));
    for (const key of ['about', 'disclaimer', 'privacy']) await page(key, renderPage(ctx, key));
    if (lang === 'np') await write('404.html', renderNotFound(ctx));
  }

  await write(
    'sitemap.xml',
    `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${u}</loc><lastmod>${generatedAt}</lastmod></url>`).join('\n')}
</urlset>
`
  );
  await write('robots.txt', `User-agent: *\nAllow: /\n\nSitemap: ${siteUrl}/sitemap.xml\n`);
  await write('data/news.json', JSON.stringify({ generatedAt, items }));
  await write(
    'data/status.json',
    JSON.stringify(
      { generatedAt, feeds: results.map(({ items: _, ...r }) => r) },
      null,
      2
    )
  );

  const files = await readdir(dist, { recursive: true });
  console.log(`Wrote ${items.length} stories and ${files.length} files to dist/`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
