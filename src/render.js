import { allCategories } from '../config/categories.js';
import { site } from '../config/site.js';
import { pages, strings } from './i18n.js';
import { escapeHtml as e, imageUrl, safeUrl } from './util.js';

const LANGS = ['np', 'en'];

// Paths. Nepali lives at the root, English under /en/.
export function pathFor(lang, slug = '') {
  const prefix = lang === 'en' ? 'en/' : '';
  return `${prefix}${slug ? `${slug}/` : ''}`;
}

function formatTime(iso, lang) {
  return new Intl.DateTimeFormat(strings[lang].locale, {
    timeZone: 'Asia/Kathmandu',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: lang === 'en',
  }).format(new Date(iso));
}

// A story's own page on the site.
export function storyPath(item) {
  return pathFor(item.lang, `news/${item.id}`);
}

function formatDate(iso, lang) {
  return new Intl.DateTimeFormat(strings[lang].locale, { timeZone: 'Asia/Kathmandu', dateStyle: 'full' }).format(new Date(iso));
}

// Everything a template needs: the language, the URL helpers and the source names.
export function context({ lang, basePath, siteUrl, sources, generatedAt }) {
  const href = (path) => `${basePath}/${path}`;
  return {
    lang,
    t: strings[lang],
    href,
    absolute: (path) => `${siteUrl.replace(/\/$/, '')}/${path}`,
    sourceName: (id) => sources.get(id)?.name || id,
    generatedAt,
  };
}

function time(item, ctx) {
  return `<time datetime="${e(item.published)}">${e(formatTime(item.published, ctx.lang))}</time>`;
}

function meta(item, ctx) {
  return `<div class="meta"><span class="source">${e(ctx.sourceName(item.source))}</span><span aria-hidden="true">·</span>${time(item, ctx)}</div>`;
}

function image(item, cls) {
  const src = imageUrl(item.image);
  if (!src) return '';
  return `<div class="${cls}"><img src="${e(src)}" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer"></div>`;
}

function storyLink(item, inner, ctx) {
  return `<a href="${e(ctx.href(storyPath(item)))}">${inner}</a>`;
}

function related(list, ctx) {
  if (!list.length) return '';
  const shown = list.slice(0, 3);
  const rest = list.length - shown.length;
  return `<div class="related">
  <p class="related-label">${e(ctx.t.alsoCovered)}</p>
  <ul>${shown
    .map((item) => `<li>${storyLink(item, e(item.title), ctx)} <span class="source">${e(ctx.sourceName(item.source))}</span></li>`)
    .join('')}${rest > 0 ? `<li class="related-more">+${rest}</li>` : ''}</ul>
</div>`;
}

// A headline card. size: "lead" | "card" | "row"
function story(item, ctx, { size = 'card', relatedItems = [], showExcerpt = true } = {}) {
  const sourceCount = relatedItems.length ? `<span class="badge">${e(ctx.t.sourcesCount(relatedItems.length + 1))}</span>` : '';
  const thumb = size === 'row' ? image(item, 'thumb thumb-sm') : image(item, 'thumb');
  return `<article class="story story-${size}${item.image ? ' has-image' : ''}">
  ${storyLink(item, `${thumb}<h3>${e(item.title)}</h3>`, ctx)}
  ${showExcerpt && item.excerpt ? `<p class="excerpt">${e(item.excerpt)}</p>` : ''}
  <div class="meta-row">${meta(item, ctx)}${sourceCount}</div>
  ${related(relatedItems, ctx)}
</article>`;
}

function compact(item, ctx) {
  return `<li class="compact">${storyLink(item, e(item.title), ctx)}${meta(item, ctx)}</li>`;
}

function nav(ctx, active) {
  const link = (slug, label) =>
    `<a href="${ctx.href(pathFor(ctx.lang, slug))}"${active === slug ? ' aria-current="page"' : ''}>${e(label)}</a>`;
  return [
    link('', ctx.t.home),
    link('latest', ctx.t.latest),
    ...(ctx.hasBrief ? [link('brief', ctx.t.brief)] : []),
    ...allCategories.map((c) => link(c.slug, c.label[ctx.lang])),
  ].join('');
}

function logo() {
  return `<svg class="logo-mark" viewBox="0 0 32 32" aria-hidden="true"><path d="M7 3v26h20L15.5 17.5H25L7 3z" fill="var(--brand)"/><path d="M7 3v26h20L15.5 17.5H25L7 3z" fill="none" stroke="var(--brand-2)" stroke-width="2.2" stroke-linejoin="round"/><circle cx="13" cy="12.5" r="2" fill="#fff"/><circle cx="13" cy="23" r="2.6" fill="#fff"/></svg>`;
}

// Full page shell. `slug` is the page's path slug, shared by both languages,
// so the language switch and hreflang tags can point at the twin page. Pages
// with no twin (a story's own page) set `twin: false`; their language switch
// goes to the other language's homepage.
// Structured data for search engines. "<" is escaped so feed text can never
// close the script tag.
function ldJson(data) {
  return `<script type="application/ld+json">${JSON.stringify(data).replace(/</g, '\\u003c')}</script>`;
}

function organization(ctx) {
  return {
    '@type': 'NewsMediaOrganization',
    name: ctx.t.siteName,
    url: ctx.absolute(pathFor(ctx.lang)),
    logo: { '@type': 'ImageObject', url: ctx.absolute('og-image.png') },
    ...(site.contactEmail ? { email: site.contactEmail } : {}),
  };
}

export function layout(ctx, { slug = '', title, description, body, active = slug, noindex = false, twin = true, image, type = 'website', published, structured }) {
  const { t, lang } = ctx;
  const other = lang === 'np' ? 'en' : 'np';
  const pageTitle = title ? `${title} | ${t.siteName}` : `${t.siteName}: ${t.tagline}`;
  const desc = description || t.description;
  const canonical = ctx.absolute(pathFor(lang, slug));
  const hreflang = twin
    ? `${LANGS.map((l) => `<link rel="alternate" hreflang="${strings[l].htmlLang}" href="${e(ctx.absolute(pathFor(l, slug)))}">`).join('\n')}
<link rel="alternate" hreflang="x-default" href="${e(ctx.absolute(pathFor('np', slug)))}">`
    : '';
  const jsonLd = slug
    ? structured
      ? ldJson({ '@context': 'https://schema.org', ...structured })
      : ''
    : ldJson({
        '@context': 'https://schema.org',
        '@graph': [{ '@type': 'WebSite', name: t.siteName, url: canonical, inLanguage: t.htmlLang }, organization(ctx)],
      });
  return `<!doctype html>
<html lang="${t.htmlLang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${e(pageTitle)}</title>
<meta name="description" content="${e(desc)}">
<meta name="robots" content="${noindex ? 'noindex, follow' : 'max-image-preview:large'}">
<link rel="canonical" href="${e(canonical)}">
${hreflang}
<meta property="og:type" content="${type}">
<meta property="og:site_name" content="${e(t.siteName)}">
<meta property="og:title" content="${e(type === 'article' ? title : pageTitle)}">
<meta property="og:description" content="${e(desc)}">
<meta property="og:url" content="${e(canonical)}">
<meta property="og:image" content="${e(imageUrl(image) || ctx.absolute('og-image.png'))}">
${published ? `<meta property="article:published_time" content="${e(published)}">` : ''}
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#dc143c">
<link rel="icon" href="${ctx.href('favicon.svg')}" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Mukta:wght@400;500;700;800&display=swap">
<link rel="stylesheet" href="${ctx.href(`style.css?v=${ctx.assetVersion || ''}`)}">
${jsonLd}
</head>
<body class="lang-${lang}">
<a class="skip" href="#main">${e(t.skip)}</a>
<header class="masthead">
  <div class="topbar wrap">
    <span class="today">${e(formatDate(ctx.generatedAt, lang))}</span>
    <a class="lang-switch" href="${ctx.href(pathFor(other, twin ? slug : ''))}" hreflang="${strings[other].htmlLang}" lang="${strings[other].htmlLang}">${e(t.switchTo)}</a>
  </div>
  <div class="brand wrap">
    <a class="logo" href="${ctx.href(pathFor(lang))}">${logo()}<span class="logo-text">${e(t.siteName)}</span></a>
    <p class="tagline">${e(t.tagline)}</p>
  </div>
  <nav class="sections" aria-label="${e(t.home)}"><div class="wrap nav-inner">${nav(ctx, active)}</div></nav>
</header>
<main id="main" class="wrap">
${body}
</main>
<footer class="footer">
  <div class="wrap">
    <p class="footer-note">${e(t.footerNote)}</p>
    <nav class="footer-links">
      <a href="${ctx.href(pathFor(lang, 'about'))}">${e(t.about)}</a>
      <a href="${ctx.href(pathFor(lang, 'sources'))}">${e(t.sources)}</a>
      <a href="${ctx.href(pathFor(lang, 'disclaimer'))}">${e(t.disclaimer)}</a>
      <a href="${ctx.href(pathFor(lang, 'privacy'))}">${e(t.privacy)}</a>
    </nav>
    <p class="updated">${e(t.updated)}: <time datetime="${e(ctx.generatedAt)}" data-absolute>${e(formatTime(ctx.generatedAt, lang))}</time> · © ${new Date(ctx.generatedAt).getUTCFullYear()} ${e(t.siteName)}</p>
  </div>
</footer>
<script src="${ctx.href(`app.js?v=${ctx.assetVersion || ''}`)}" defer></script>
</body>
</html>
`;
}

function sectionHead(ctx, title, slug) {
  const more = slug ? `<a class="more" href="${ctx.href(pathFor(ctx.lang, slug))}">${e(ctx.t.more)} →</a>` : '';
  return `<div class="section-head"><h2>${e(title)}</h2>${more}</div>`;
}

const emptyState = (ctx) => `<p class="empty">${e(ctx.t.empty)}</p>`;

export function renderHome(ctx, { top, byCategory, latest }) {
  const [lead, ...rest] = top;
  const topHtml = lead
    ? `<section class="top" aria-labelledby="top-title">
  <div class="section-head"><h2 id="top-title">${e(ctx.t.topStories)}</h2></div>
  <div class="top-grid">
    <div class="top-lead">${story(lead.lead, ctx, { size: 'lead', relatedItems: lead.related })}</div>
    <div class="top-side">${rest.slice(0, 2).map((c) => story(c.lead, ctx, { size: 'card', relatedItems: c.related, showExcerpt: false })).join('')}</div>
  </div>
  <div class="top-more">${rest.slice(2).map((c) => story(c.lead, ctx, { size: 'row', relatedItems: c.related, showExcerpt: false })).join('')}</div>
</section>`
    : emptyState(ctx);

  const sections = allCategories
    .filter((c) => byCategory.get(c.slug)?.length)
    .map((c) => {
      const [first, ...others] = byCategory.get(c.slug);
      return `<section class="category-block">
  ${sectionHead(ctx, c.label[ctx.lang], c.slug)}
  <div class="category-grid">
    ${story(first, ctx, { size: 'card' })}
    <ul class="compact-list">${others.map((item) => compact(item, ctx)).join('')}</ul>
  </div>
</section>`;
    })
    .join('\n');

  const body = `${topHtml}
<div class="columns">
  <div class="col-main">${sections}</div>
  <aside class="col-side" aria-labelledby="latest-title">
    <div class="sticky">
      ${sectionHead(ctx, ctx.t.latestNews, 'latest').replace('<h2>', '<h2 id="latest-title">')}
      <ol class="compact-list latest-list">${latest.map((item) => compact(item, ctx)).join('')}</ol>
    </div>
  </aside>
</div>`;
  return layout(ctx, { body });
}

export function renderList(ctx, { slug, title, items, description }) {
  const body = `<div class="page-head"><h1>${e(title)}</h1><p class="count">${e(ctx.t.stories(items.length))}</p></div>
${items.length ? `<div class="list">${items.map((item) => story(item, ctx, { size: 'row' })).join('')}</div>` : emptyState(ctx)}`;
  return layout(ctx, { slug, title, body, description });
}

export function renderSources(ctx, { feeds, status, counts }) {
  const rows = feeds
    .map((feed) => {
      const s = status.get(feed.id);
      const ok = s?.ok;
      return `<li class="source-row">
  <a href="${e(feed.home)}" target="_blank" rel="noopener">${e(feed.name)}</a>
  <span class="source-lang">${feed.lang === 'np' ? 'नेपाली' : 'English'}</span>
  <span class="source-count">${e(ctx.t.stories(counts.get(feed.id) || 0))}</span>
  <span class="dot ${ok ? 'dot-ok' : 'dot-bad'}" title="${ok ? 'OK' : e(s?.error || 'Not fetched')}"></span>
</li>`;
    })
    .join('');
  const body = `<div class="page-head"><h1>${e(ctx.t.sources)}</h1></div>
<div class="prose"><p>${e(ctx.t.sourcesIntro)}</p></div>
<ul class="sources">${rows}</ul>`;
  return layout(ctx, { slug: 'sources', title: ctx.t.sources, body });
}

export function renderPage(ctx, key) {
  const contact = site.contactEmail
    ? `<p><a href="mailto:${e(site.contactEmail)}">${e(site.contactEmail)}</a></p>`
    : '';
  const withContact = key === 'privacy' ? '' : contact;
  const body = `<div class="page-head"><h1>${e(ctx.t[key])}</h1></div>
<div class="prose">${pages[key][ctx.lang]}${withContact}</div>`;
  return layout(ctx, { slug: key, title: ctx.t[key], body });
}

export function renderNotFound(ctx) {
  const body = `<div class="page-head"><h1>${e(ctx.t.notFound)}</h1></div>
<div class="prose"><p>${e(ctx.t.notFoundBody)}</p><p><a href="${ctx.href(pathFor(ctx.lang))}">${e(ctx.t.backHome)}</a></p></div>`;
  return layout(ctx, { slug: '', title: ctx.t.notFound, body, noindex: true });
}

function shareLinks(ctx, url, title) {
  const u = encodeURIComponent(url);
  const text = encodeURIComponent(`${title} ${url}`);
  const links = [
    ['Facebook', `https://www.facebook.com/sharer/sharer.php?u=${u}`],
    ['WhatsApp', `https://wa.me/?text=${text}`],
    ['Viber', `viber://forward?text=${text}`],
    ['X', `https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${u}`],
  ];
  return `<div class="share" aria-label="${e(ctx.t.share)}">
  <span class="share-label">${e(ctx.t.share)}</span>
  <button type="button" class="share-btn share-native" data-share-url="${e(url)}" data-share-title="${e(title)}" hidden>${e(ctx.t.share)}</button>
  ${links.map(([name, href]) => `<a class="share-btn" href="${e(href)}" target="_blank" rel="noopener">${name}</a>`).join('\n  ')}
  <button type="button" class="share-btn" data-copy="${e(url)}" data-copied="${e(ctx.t.copied)}">${e(ctx.t.copyLink)}</button>
</div>`;
}

const paragraphs = (text) =>
  text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p>${e(p)}</p>`)
    .join('');

// A story's own page: the summary or excerpt, a button to the full story at
// the source, share buttons and more stories to read.
export function renderStory(ctx, { item, summary, others = [], more = [] }) {
  const sourceName = ctx.sourceName(item.source);
  const url = ctx.absolute(storyPath(item));
  const category = allCategories.find((c) => c.slug === item.category);
  const img = imageUrl(item.image);
  const summaryHtml = summary
    ? `<section class="summary" aria-labelledby="summary-title">
  <h2 id="summary-title">${e(ctx.t.summary)}</h2>
  ${paragraphs(summary.text)}
  <p class="summary-note">${e(ctx.t.summaryNote(summary.count))}</p>
</section>`
    : item.excerpt
      ? `<blockquote class="story-excerpt"><p>${e(item.excerpt)}</p><footer>${e(ctx.t.excerptFrom(sourceName))}</footer></blockquote>`
      : '';
  const othersHtml = others.length
    ? `<section class="others"><h2>${e(ctx.t.alsoReporting)}</h2><ul>${others
        .map(
          (o) => `<li><a href="${e(safeUrl(o.link) || '#')}" target="_blank" rel="noopener">${e(o.title)}</a> <span class="source">${e(ctx.sourceName(o.source))}</span></li>`
        )
        .join('')}</ul></section>`
    : '';
  const body = `<article class="story-page">
  ${category ? `<p class="kicker"><a href="${ctx.href(pathFor(ctx.lang, category.slug))}">${e(category.label[ctx.lang])}</a></p>` : ''}
  <h1>${e(item.title)}</h1>
  ${meta(item, ctx)}
  ${img ? `<div class="thumb story-image"><img src="${e(img)}" alt="" decoding="async" referrerpolicy="no-referrer"></div>` : ''}
  ${summaryHtml}
  <p class="read-full"><a class="button" href="${e(safeUrl(item.link) || '#')}" target="_blank" rel="noopener">${e(ctx.t.readFull(sourceName))} →</a></p>
  ${shareLinks(ctx, url, item.title)}
  ${othersHtml}
</article>
${more.length ? `<section class="more-news">${sectionHead(ctx, ctx.t.moreNews, category?.slug || 'latest')}<div class="list">${more.map((m) => story(m, ctx, { size: 'row', showExcerpt: false })).join('')}</div></section>` : ''}`;
  const description = summary ? summary.text.replace(/\s+/g, ' ').slice(0, 200) : item.excerpt || item.title;
  const structured = {
    '@type': 'NewsArticle',
    headline: item.title.slice(0, 110),
    description,
    datePublished: item.published,
    inLanguage: ctx.t.htmlLang,
    mainEntityOfPage: url,
    ...(img ? { image: [img] } : {}),
    ...(category ? { articleSection: category.label[ctx.lang] } : {}),
    isBasedOn: [item, ...others].map((o) => safeUrl(o.link)).filter(Boolean),
    author: organization(ctx),
    publisher: organization(ctx),
  };
  return layout(ctx, {
    slug: `news/${item.id}`,
    active: category?.slug,
    title: item.title,
    description,
    body,
    twin: false,
    image: item.image,
    type: 'article',
    published: item.published,
    structured,
    // Pages with only a headline and an excerpt add little for search
    // engines; only summarized stories are indexed.
    noindex: !summary,
  });
}

// One day's brief: the day's biggest summarized stories. `entries` are
// { item, summary } pairs; `dates` are the days that have a brief.
export function renderBrief(ctx, { date, entries, dates, slug }) {
  const day = formatDate(`${date}T12:00:00+05:45`, ctx.lang);
  const list = entries.length
    ? entries
        .map(
          ({ item, summary }) => `<article class="brief-item">
  <h2><a href="${e(ctx.href(storyPath(item)))}">${e(item.title)}</a></h2>
  ${paragraphs(summary.text)}
  <div class="meta-row"><span class="badge">${e(ctx.t.sourcesCount(summary.count))}</span></div>
</article>`
        )
        .join('\n')
    : `<p class="empty">${e(ctx.t.briefEmpty)}</p>`;
  const earlier = dates.filter((d) => d !== date);
  const body = `<div class="page-head"><h1>${e(ctx.t.brief)}</h1><p class="count">${e(day)}</p></div>
<div class="brief">
  <p class="brief-intro">${e(ctx.t.briefIntro)}</p>
  ${list}
  ${entries.length ? `<p class="summary-note">${e(ctx.t.briefNote)}</p>` : ''}
  ${earlier.length ? `<nav class="earlier"><h2>${e(ctx.t.earlierBriefs)}</h2><ul>${earlier
    .map((d) => `<li><a href="${ctx.href(pathFor(ctx.lang, `brief/${d}`))}">${e(formatDate(`${d}T12:00:00+05:45`, ctx.lang))}</a></li>`)
    .join('')}</ul></nav>` : ''}
</div>`;
  // Only /brief/ is sure to exist in both languages.
  return layout(ctx, { slug, active: 'brief', title: `${ctx.t.brief}: ${day}`, body, noindex: !entries.length, twin: slug === 'brief' });
}
