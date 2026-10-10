import { XMLParser } from 'fast-xml-parser';
import { safeUrl, toPlainText } from './util.js';

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@',
  textNodeName: '#text',
  cdataPropName: false,
  processEntities: true,
  htmlEntities: true,
  parseTagValue: false,
  trimValues: true,
  isArray: (name) => ['item', 'entry', 'category', 'link', 'media:content', 'media:thumbnail', 'enclosure'].includes(name),
});

const asArray = (value) => (value == null ? [] : Array.isArray(value) ? value : [value]);

function text(node) {
  if (node == null) return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return text(node[0]);
  if (typeof node === 'object') return text(node['#text'] ?? '');
  return '';
}

function firstImageInHtml(html) {
  const match = /<img[^>]+src=["']([^"']+)["']/i.exec(html || '');
  return match ? match[1] : null;
}

function pickImage(entry, html, base) {
  const candidates = [];
  for (const media of [...asArray(entry['media:content']), ...asArray(entry['media:thumbnail'])]) {
    const type = media['@type'] || media['@medium'] || 'image';
    if (/image/i.test(type)) candidates.push(media['@url']);
  }
  for (const enclosure of asArray(entry.enclosure)) {
    if (/^image\//i.test(enclosure['@type'] || '')) candidates.push(enclosure['@url']);
  }
  if (entry['media:group']) {
    const group = entry['media:group'];
    for (const media of [...asArray(group['media:content']), ...asArray(group['media:thumbnail'])]) candidates.push(media['@url']);
  }
  // Onlinekhabar and some other WordPress feeds use a plain <image> per item.
  for (const node of asArray(entry.image)) candidates.push(typeof node === 'object' ? text(node.url) || node['@href'] || node['@url'] : node);
  for (const node of asArray(entry['itunes:image'])) candidates.push(node['@href']);
  candidates.push(firstImageInHtml(html));
  for (const candidate of candidates) {
    const url = safeUrl(candidate, base);
    if (url) return url;
  }
  return null;
}

function parseDate(...values) {
  for (const value of values) {
    const raw = text(value).trim();
    if (!raw) continue;
    const time = Date.parse(raw);
    if (Number.isFinite(time)) return new Date(time).toISOString();
  }
  return null;
}

function atomLink(entry) {
  const links = asArray(entry.link);
  const alternate = links.find((l) => typeof l === 'object' && (!l['@rel'] || l['@rel'] === 'alternate'));
  return alternate ? alternate['@href'] : text(links[0]);
}

// Parse an RSS 2.0, RSS 1.0 (RDF) or Atom document into a list of raw items:
// { title, link, guid, html, published, image, categories }.
export function parseFeed(xml, feedUrl) {
  const doc = parser.parse(xml);

  if (doc.rss || doc['rdf:RDF']) {
    const channel = doc.rss ? doc.rss.channel : doc['rdf:RDF'];
    const items = doc.rss ? asArray(channel?.item) : asArray(doc['rdf:RDF'].item);
    return items.map((item) => {
      const html = text(item['content:encoded']) || text(item.description);
      const link = text(item.link) || (item.guid && text(item.guid));
      return {
        title: toPlainText(text(item.title)),
        link: safeUrl(link, feedUrl),
        guid: text(item.guid) || null,
        html,
        published: parseDate(item.pubDate, item['dc:date'], item.published, item.updated),
        image: pickImage(item, html, feedUrl),
        categories: asArray(item.category).map((c) => toPlainText(text(c))).filter(Boolean),
      };
    });
  }

  if (doc.feed) {
    return asArray(doc.feed.entry).map((entry) => {
      const html = text(entry.content) || text(entry.summary);
      return {
        title: toPlainText(text(entry.title)),
        link: safeUrl(atomLink(entry), feedUrl),
        guid: text(entry.id) || null,
        html,
        published: parseDate(entry.published, entry.updated),
        image: pickImage(entry, html, feedUrl),
        categories: asArray(entry.category).map((c) => toPlainText(c['@term'] || c['@label'] || text(c))).filter(Boolean),
      };
    });
  }

  throw new Error('Not an RSS or Atom feed');
}

// Look for <link rel="alternate" type="application/rss+xml" href="..."> in an HTML page.
export function discoverFeedUrl(html, pageUrl) {
  const links = html.match(/<link\b[^>]*>/gi) || [];
  for (const tag of links) {
    if (!/rel=["']?alternate/i.test(tag)) continue;
    if (!/type=["']?application\/(rss|atom)\+xml/i.test(tag)) continue;
    const href = /href=["']([^"']+)["']/i.exec(tag);
    if (href) return safeUrl(href[1], pageUrl);
  }
  return null;
}

export function looksLikeFeed(body) {
  return /<(rss|feed|rdf:RDF)[\s>]/i.test(body.slice(0, 2000));
}
