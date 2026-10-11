// Post the day's top stories to the site's Facebook page.
//
// Turned on by two environment variables (in Vercel: Project → Settings →
// Environment Variables, Production): FACEBOOK_PAGE_ID and
// FACEBOOK_PAGE_TOKEN. Setup steps are in the README.
//
// Each post is the outlet's own headline, "स्रोत: <outlet>" and a link to the
// story's page on this site, so the page never states anything in its own
// words. Facebook builds the preview (picture and title) from that page, so
// only stories whose page is already live (they were in the previous build's
// archive) are posted.

import { sameTopic } from './cluster.js';

const GRAPH = 'https://graph.facebook.com';

// The text of a post: the headline as the outlet wrote it, credited.
export function postMessage(story, { sourceName, lang }) {
  const credit = lang === 'np' ? 'स्रोत' : 'Source';
  return `${story.title}\n\n${credit}: ${sourceName(story.source)}`;
}

// Pick which top stories to post: covered by enough outlets, recent, already
// live on the site, and not the same story or topic as anything the page
// posted in the last `topicHours` (another outlet's version of a story that
// was already posted counts as the same).
export function choosePosts(clusters, { live, posted, now, minSources, hours, max, topicHours = 12 }) {
  const cutoff = now.getTime() - hours * 3600 * 1000;
  const topicCutoff = now.getTime() - topicHours * 3600 * 1000;
  const recentTitles = Object.values(posted)
    .filter((entry) => entry.title && Date.parse(entry.at) >= topicCutoff)
    .map((entry) => entry.title);
  const chosen = [];
  for (const c of clusters) {
    const members = [c.lead, ...c.related];
    const story = { ...c.lead, outlets: members.length, memberIds: members.map((m) => m.id) };
    if (members.length < minSources) continue;
    if (!live.has(story.id) || Date.parse(story.published) < cutoff) continue;
    if (members.some((m) => posted[m.id])) continue;
    if (members.some((m) => recentTitles.some((title) => sameTopic(m.title, title)))) continue;
    if (chosen.some((other) => sameTopic(other.title, story.title))) continue;
    chosen.push(story);
    if (chosen.length >= max) break;
  }
  return chosen;
}

async function graph(path, { token, version, method = 'GET', body, fetchImpl = fetch }) {
  const url = new URL(`${GRAPH}/${version}/${path}`);
  const init = { method, signal: AbortSignal.timeout(20_000) };
  if (method === 'GET') url.searchParams.set('access_token', token);
  else init.body = new URLSearchParams({ ...body, access_token: token });
  const response = await fetchImpl(url, init);
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.error) throw new Error(data.error?.message || `HTTP ${response.status}`);
  return data;
}

// Post the chosen stories. `posted` (story id → { postId, at }) is kept in
// data/archive.json; the page's own recent posts are checked too, so a story
// is never posted twice even if a build that posted it failed to deploy.
export async function postToFacebook(stories, { pageId, token, version, posted, urlFor, message, fetchImpl, now = new Date() }) {
  if (!stories.length) return { posted: 0, skipped: 0, canRead: true };
  // Reading the page needs the pages_read_engagement permission. Without it,
  // rely on `posted` alone.
  let seen = '';
  let canRead = true;
  try {
    const recent = await graph(`${pageId}/feed?fields=attachments{url}&limit=50`, { token, version, fetchImpl });
    // Facebook wraps links (l.facebook.com/l.php?u=...), so decode before matching.
    seen = JSON.stringify(recent.data || []);
    try {
      seen = decodeURIComponent(decodeURIComponent(seen));
    } catch {}
  } catch {
    canRead = false;
  }
  let count = 0;
  let skipped = 0;
  for (const story of stories) {
    if (seen.includes(`/news/${story.id}/`)) {
      for (const id of story.memberIds || [story.id]) posted[id] = { postId: null, at: now.toISOString(), title: story.title };
      skipped++;
      continue;
    }
    const result = await graph(`${pageId}/feed`, {
      token,
      version,
      method: 'POST',
      body: { message: message(story), link: urlFor(story) },
      fetchImpl,
    });
    // Remember every outlet's version, so none of them is posted later.
    for (const id of story.memberIds || [story.id]) posted[id] = { postId: result.id || null, at: now.toISOString(), title: story.title };
    count++;
  }
  return { posted: count, skipped, canRead };
}

// Forget stories that have left the archive.
export function prunePosted(posted, stories) {
  const ids = new Set(stories.map((s) => s.id));
  return Object.fromEntries(Object.entries(posted).filter(([id]) => ids.has(id)));
}
