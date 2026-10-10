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

const GRAPH = 'https://graph.facebook.com';

// The text of a post: the headline as the outlet wrote it, credited.
export function postMessage(story, { sourceName, lang }) {
  const credit = lang === 'np' ? 'स्रोत' : 'Source';
  return `${story.title}\n\n${credit}: ${sourceName(story.source)}`;
}

// Pick which top stories to post: covered by enough outlets, recent, already
// live on the site and never posted before.
export function choosePosts(clusters, { live, posted, now, minSources, hours, max }) {
  const cutoff = now.getTime() - hours * 3600 * 1000;
  return clusters
    .filter((c) => c.related.length + 1 >= minSources)
    .map((c) => c.lead)
    .filter((story) => live.has(story.id) && !posted[story.id] && Date.parse(story.published) >= cutoff)
    .slice(0, max);
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
      posted[story.id] = { postId: null, at: now.toISOString() };
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
    posted[story.id] = { postId: result.id || null, at: now.toISOString() };
    count++;
  }
  return { posted: count, skipped, canRead };
}

// Forget stories that have left the archive.
export function prunePosted(posted, stories) {
  const ids = new Set(stories.map((s) => s.id));
  return Object.fromEntries(Object.entries(posted).filter(([id]) => ids.has(id)));
}
