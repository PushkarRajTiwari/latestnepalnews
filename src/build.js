// Fetch every feed, merge with the previous run's stories and write the
// static site to dist/.
//
//   node src/build.js            fetch live feeds
//   node src/build.js --offline  use the sample feeds in test/fixtures
//
// Environment:
//   SITE_URL   public address, e.g. https://latestnepalnews.com (defaults to
//              the Vercel production domain, then config/site.js)
//   BASE_PATH  path the site is served under, e.g. /latestnepalnews ("" at a domain root)
//   ANTHROPIC_API_KEY  turns on Claude-written summaries (see config/site.js)

import { createHash } from 'node:crypto';
import { cp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { allCategories } from '../config/categories.js';
import { feeds } from '../config/feeds.js';
import { site } from '../config/site.js';
import Anthropic from '@anthropic-ai/sdk';

import { mergeArchive, nepalDate, pruneSummaries } from './archive.js';
import { topStories } from './cluster.js';
import { choosePosts, postMessage, postToFacebook, prunePosted } from './facebook.js';
import { fetchAll } from './fetch.js';
import { fillImages } from './images.js';
import { parseFeed } from './parse.js';
import {
  context,
  pathFor,
  renderBrief,
  renderHome,
  renderList,
  renderNotFound,
  renderPage,
  renderSources,
  renderStory,
} from './render.js';
import { mergeItems, normalizeItems } from './store.js';
import { planSummaries, writeSummaries } from './summarize.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');
const offline = process.argv.includes('--offline');

// On Vercel, VERCEL_PROJECT_PRODUCTION_URL is the production domain (the
// custom domain once one is added).
const vercelUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL && `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
const siteUrl = (process.env.SITE_URL || vercelUrl || site.url).replace(/\/$/, '');
const basePath = (process.env.BASE_PATH || '').replace(/\/$/, '');
// Vercel preview builds read the production archive but never write
// summaries, so only production spends on the API.
const vercelEnv = process.env.VERCEL_ENV;
const canSummarize = Boolean(process.env.ANTHROPIC_API_KEY) && !offline && (!vercelEnv || vercelEnv === 'production');
// Facebook posts go out from production builds only.
const canPostToFacebook =
  Boolean(process.env.FACEBOOK_PAGE_ID && process.env.FACEBOOK_PAGE_TOKEN) && !offline && (!vercelEnv || vercelEnv === 'production');

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

// The archive behind every story's own page. If it can't be read on a
// production build, fail rather than publish a site that has lost its
// story pages and summaries; the previous deploy stays live.
async function loadArchive() {
  const empty = { stories: [], summaries: {}, facebook: {} };
  if (offline) return empty;
  try {
    const response = await fetch(`${siteUrl}/data/archive.json`, { signal: AbortSignal.timeout(60_000) });
    if (response.status === 404) {
      console.log('No story archive yet; starting one');
      return empty;
    }
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    if (!Array.isArray(data.stories)) throw new Error('archive.json has no stories');
    console.log(`Loaded ${data.stories.length} archived stories and ${Object.keys(data.summaries || {}).length} summaries`);
    return { stories: data.stories, summaries: data.summaries || {}, facebook: data.facebook || {} };
  } catch (error) {
    if (vercelEnv === 'production') throw new Error(`Could not load the story archive: ${error.message}`);
    console.log(`No story archive (${error.message}); starting fresh`);
    return empty;
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
  const archive = await loadArchive();
  const results = offline ? await loadFixtures(now) : await fetchAll(feeds, now);

  for (const r of results) {
    console.log(`${r.ok ? '✓' : '✗'} ${r.id.padEnd(18)} ${r.ok ? `${r.count} items` : r.error}`);
  }
  const working = results.filter((r) => r.ok).length;
  console.log(`${working}/${feeds.length} feeds working`);

  const fresh = results.flatMap((r) => r.items);
  if (!offline) {
    const images = await fillImages(fresh, [...previous, ...archive.stories]);
    const withImage = fresh.filter((item) => item.image).length;
    console.log(
      `Images: ${withImage}/${fresh.length} stories have one; ${images.found} of ${images.checked} article pages read gave one` +
        `${images.failed ? `, ${images.failed} could not be read` : ''}${images.left ? `, ${images.left} wait for the next build` : ''}`
    );
  }
  const known = new Set(feeds.map((f) => f.id));
  const items = mergeItems(previous.filter((item) => known.has(item.source)), fresh, now);
  if (!items.length && !offline) {
    // Every feed failed and there is nothing from before: don't publish an empty site.
    throw new Error('No stories at all; refusing to publish an empty site');
  }

  // Every story from the last storyDays days keeps its own page.
  const stories = mergeArchive(archive.stories.filter((story) => known.has(story.source)), items, { now, days: site.storyDays });
  if (!offline) {
    // Stories that have already left their outlet's feed still need a picture
    // for their own page and any card that shows them.
    const later = await fillImages(stories, [], { max: 60 });
    const storyImage = new Map(stories.filter((story) => story.image).map((story) => [story.id, story.image]));
    for (const item of items) if (!item.image && storyImage.has(item.id)) item.image = storyImage.get(item.id);
    if (later.checked) console.log(`Images for older stories: ${later.found} of ${later.checked} article pages read gave one${later.left ? `, ${later.left} wait` : ''}`);
  }
  let summaries = archive.summaries;
  const jobs = ['np', 'en']
    .flatMap((lang) => planSummaries(stories, summaries, { lang, now, hours: site.summaries.hours }))
    .sort((a, b) => b.members.length - a.members.length);
  if (canSummarize && jobs.length) {
    console.log(`\nWriting up to ${site.summaries.maxPerBuild} of ${jobs.length} summaries with ${site.summaries.model}`);
    const written = await writeSummaries(jobs, summaries, {
      client: new Anthropic(),
      model: site.summaries.model,
      max: site.summaries.maxPerBuild,
      sourceName: (id) => feeds.find((f) => f.id === id)?.name || id,
      now,
    });
    console.log(`Wrote ${written} summaries`);
  } else if (jobs.length) {
    console.log(`\n${jobs.length} stories are waiting for a summary (summaries are off: ANTHROPIC_API_KEY is not set, or this isn't a production build)`);
  }
  summaries = pruneSummaries(summaries, stories);

  // Share the top stories on the Facebook page. A failure here never stops the site from updating.
  const facebook = prunePosted(archive.facebook, stories);
  const fbConfig = site.facebook;
  const live = new Set(archive.stories.map((story) => story.id));
  const toPost = choosePosts(topStories(items, { lang: fbConfig.lang, now, limit: site.topStories }), {
    live,
    posted: facebook,
    now,
    minSources: fbConfig.minSources,
    hours: fbConfig.hours,
    max: fbConfig.maxPerBuild,
  });
  if (canPostToFacebook) {
    const sourceName = (id) => feeds.find((f) => f.id === id)?.name || id;
    try {
      const done = await postToFacebook(toPost, {
        pageId: process.env.FACEBOOK_PAGE_ID,
        token: process.env.FACEBOOK_PAGE_TOKEN,
        version: fbConfig.graphVersion,
        posted: facebook,
        urlFor: (story) => `${siteUrl}/${pathFor(story.lang, `news/${story.id}`)}`,
        message: (story) => postMessage(story, { sourceName, lang: story.lang }),
        now,
      });
      console.log(`Facebook: posted ${done.posted} stories${done.skipped ? `, ${done.skipped} were already on the page` : ''}`);
    } catch (error) {
      console.log(`Facebook posting failed: ${error.message}`);
    }
  } else if (toPost.length) {
    console.log(`${toPost.length} stories would be posted to Facebook (posting is off: FACEBOOK_PAGE_ID / FACEBOOK_PAGE_TOKEN not set, or not a production build)`);
  }
  const storyById = new Map(stories.map((story) => [story.id, story]));
  const usableSummary = (story) => {
    const summary = story.summaryId && summaries[story.summaryId];
    return summary && !summary.skip && summary.text ? summary : null;
  };

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
    // Daily briefs: each day's biggest summarized stories, by the date in Nepal.
    const briefs = new Map();
    for (const summary of Object.values(summaries)) {
      const lead = storyById.get(summary.itemIds[0]);
      if (summary.lang !== lang || summary.skip || !summary.text || !lead) continue;
      if (!briefs.has(summary.date)) briefs.set(summary.date, []);
      briefs.get(summary.date).push({ item: lead, summary });
    }
    const briefDates = [...briefs.keys()].sort().reverse();
    for (const entries of briefs.values()) {
      entries.sort((a, b) => b.summary.count - a.summary.count || Date.parse(b.item.published) - Date.parse(a.item.published));
      entries.splice(site.briefStories);
    }

    const ctx = { ...context({ lang, basePath, siteUrl, sources, generatedAt }), assetVersion, hasBrief: briefDates.length > 0 };
    const mine = items.filter((item) => item.lang === lang);
    const page = async (slug, html, inSitemap = true, lastmod = generatedAt) => {
      await write(join(pathFor(lang, slug), 'index.html'), html);
      if (inSitemap) urls.push({ loc: ctx.absolute(pathFor(lang, slug)), lastmod });
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
    await page('latest', renderList(ctx, { slug: 'latest', title: ctx.t.latestNews, items: mine.slice(0, site.perLatestPage), description: ctx.t.latestDescription }));
    for (const category of allCategories) {
      await page(
        category.slug,
        renderList(ctx, {
          slug: category.slug,
          title: category.label[lang],
          items: byCategory.get(category.slug).slice(0, site.perCategoryPage),
          description: category.description?.[lang] || ctx.t.categoryDescription(category.label[lang]),
        })
      );
    }
    const counts = new Map();
    for (const item of items) counts.set(item.source, (counts.get(item.source) || 0) + 1);
    await page('sources', renderSources(ctx, { feeds: feeds.filter((f) => f.lang === lang), status, counts }));
    for (const key of ['about', 'disclaimer', 'privacy']) await page(key, renderPage(ctx, key));
    if (lang === 'np') await write('404.html', renderNotFound(ctx));

    const latestBrief = briefDates[0] || nepalDate(generatedAt);
    await page('brief', renderBrief(ctx, { date: latestBrief, entries: briefs.get(latestBrief) || [], dates: briefDates, slug: 'brief' }), briefDates.length > 0);
    for (const date of briefDates) {
      await page(`brief/${date}`, renderBrief(ctx, { date, entries: briefs.get(date), dates: briefDates, slug: `brief/${date}` }));
    }

    let storyPages = 0;
    for (const story of stories) {
      if (story.lang !== lang) continue;
      const summary = usableSummary(story);
      const others = summary
        ? summary.itemIds.filter((id) => id !== story.id).map((id) => storyById.get(id)).filter(Boolean)
        : [];
      const more = (byCategory.get(story.category) || mine).filter((other) => other.id !== story.id).slice(0, 6);
      await page(`news/${story.id}`, renderStory(ctx, { item: story, summary, others, more }), Boolean(summary), story.published);
      storyPages++;
    }
    console.log(`  ${storyPages} story pages, ${briefDates.length} daily briefs`);
  }

  await write(
    'sitemap.xml',
    `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${u.loc}</loc><lastmod>${u.lastmod}</lastmod></url>`).join('\n')}
</urlset>
`
  );
  await write('robots.txt', `User-agent: *\nAllow: /\n\nSitemap: ${siteUrl}/sitemap.xml\n`);
  await write('data/news.json', JSON.stringify({ generatedAt, items }));
  await write('data/archive.json', JSON.stringify({ generatedAt, stories, summaries, facebook }));
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
