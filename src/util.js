import { createHash } from 'node:crypto';

const NAMED_ENTITIES = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ',
  ndash: '–', mdash: '—', hellip: '…', lsquo: '‘', rsquo: '’',
  ldquo: '“', rdquo: '”', laquo: '«', raquo: '»', bull: '•', middot: '·',
  copy: '©', reg: '®', trade: '™', zwj: '‍', zwnj: '‌',
};

export function decodeEntities(text) {
  return String(text).replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, code) => {
    if (code[0] === '#') {
      const n = code[1] === 'x' || code[1] === 'X' ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
      return Number.isFinite(n) && n > 0 && n < 0x110000 ? String.fromCodePoint(n) : match;
    }
    return NAMED_ENTITIES[code.toLowerCase()] ?? match;
  });
}

// HTML (or text that may contain HTML) to a single line of plain text.
export function toPlainText(html) {
  if (html == null) return '';
  return decodeEntities(
    String(html)
      .replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ')
      .replace(/<[^>]*>/g, ' ')
  )
    .replace(/\s+/g, ' ')
    .trim();
}

// Shorten to at most `max` characters, cutting at a word boundary.
export function truncate(text, max) {
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const space = cut.lastIndexOf(' ');
  return (space > max * 0.5 ? cut.slice(0, space) : cut).replace(/[\s,.;:–—।-]+$/, '') + '…';
}

export function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Returns the URL if it is an absolute http(s) URL, otherwise null.
export function safeUrl(value, base) {
  if (!value) return null;
  try {
    const url = new URL(String(value).trim(), base);
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.href : null;
  } catch {
    return null;
  }
}

const TRACKING_PARAMS = /^(utm_|fbclid$|gclid$|ref$|amp$)/i;

// A stable form of an article URL, used to spot the same article twice.
export function normalizeUrl(value) {
  const href = safeUrl(value);
  if (!href) return null;
  const url = new URL(href);
  url.hash = '';
  url.protocol = 'https:';
  url.hostname = url.hostname.replace(/^www\./, '');
  for (const key of [...url.searchParams.keys()]) {
    if (TRACKING_PARAMS.test(key)) url.searchParams.delete(key);
  }
  url.pathname = url.pathname.replace(/\/+$/, '') || '/';
  return url.href;
}

export function shortHash(text) {
  return createHash('sha1').update(String(text)).digest('hex').slice(0, 12);
}

// Lower-cased words of a title, without punctuation.
export function words(text) {
  return String(text)
    .toLowerCase()
    .replace(/[‘’'"“”‘’`]/g, '')
    .split(/[\s.,;:!?()[\]{}<>|/\\।॥–—\-_+*=&%$#@^~"']+/u)
    .filter(Boolean);
}

const NP_DIGITS = '०१२३४५६७८९';

export function toNepaliDigits(value) {
  return String(value).replace(/\d/g, (d) => NP_DIGITS[d]);
}

// Run `worker` over `items` with at most `limit` running at once.
export async function mapLimit(items, limit, worker) {
  const results = new Array(items.length);
  let next = 0;
  async function run() {
    while (next < items.length) {
      const index = next++;
      results[index] = await worker(items[index], index);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, run));
  return results;
}
