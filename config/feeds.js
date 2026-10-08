// News sources. Each entry is fetched on every build.
//
//   id        short unique key (letters, digits, dashes)
//   name      shown next to every headline
//   lang      "np" (Nepali) or "en" (English)
//   url       RSS/Atom feed URL. A plain homepage also works: the fetcher
//             looks for a <link rel="alternate" type="application/rss+xml">.
//   home      the publisher's homepage, used on the Sources page
//   category  optional: force every item from this feed into one category
//
// A feed that fails is skipped and reported in /data/status.json, so it is
// safe to add a source here and check the next build to see whether it works.

export const feeds = [
  // Nepali
  { id: 'onlinekhabar', name: 'अनलाइनखबर', lang: 'np', url: 'https://www.onlinekhabar.com/feed', home: 'https://www.onlinekhabar.com' },
  { id: 'ekantipur', name: 'कान्तिपुर', lang: 'np', url: 'https://ekantipur.com/rss', home: 'https://ekantipur.com' },
  { id: 'setopati', name: 'सेतोपाटी', lang: 'np', url: 'https://www.setopati.com/feed', home: 'https://www.setopati.com' },
  { id: 'ratopati', name: 'रातोपाटी', lang: 'np', url: 'https://www.ratopati.com/feed', home: 'https://www.ratopati.com' },
  { id: 'bbc-nepali', name: 'बीबीसी नेपाली', lang: 'np', url: 'https://feeds.bbci.co.uk/nepali/rss.xml', home: 'https://www.bbc.com/nepali' },
  { id: 'nagarik', name: 'नागरिक', lang: 'np', url: 'https://nagariknews.nagariknetwork.com/feed', home: 'https://nagariknews.nagariknetwork.com' },
  { id: 'ukaalo', name: 'उकालो', lang: 'np', url: 'https://ukaalo.com/feed', home: 'https://ukaalo.com' },
  { id: 'baahrakhari', name: 'बाह्रखरी', lang: 'np', url: 'https://baahrakhari.com/feed', home: 'https://baahrakhari.com' },
  { id: 'lokaantar', name: 'लोकान्तर', lang: 'np', url: 'https://lokaantar.com/feed', home: 'https://lokaantar.com' },
  { id: 'nepalpress', name: 'नेपाल प्रेस', lang: 'np', url: 'https://www.nepalpress.com', home: 'https://www.nepalpress.com' },
  { id: 'khabarhub', name: 'खबरहब', lang: 'np', url: 'https://www.khabarhub.com/feed', home: 'https://www.khabarhub.com' },
  { id: 'himalkhabar', name: 'हिमालखबर', lang: 'np', url: 'https://www.himalkhabar.com/feed', home: 'https://www.himalkhabar.com' },
  { id: 'techpana', name: 'टेकपाना', lang: 'np', url: 'https://www.techpana.com/feed', home: 'https://www.techpana.com', category: 'tech' },
  { id: 'swasthyakhabar', name: 'स्वास्थ्य खबर', lang: 'np', url: 'https://swasthyakhabar.com/feed', home: 'https://swasthyakhabar.com', category: 'health' },

  // English
  { id: 'onlinekhabar-en', name: 'Onlinekhabar English', lang: 'en', url: 'https://english.onlinekhabar.com/feed', home: 'https://english.onlinekhabar.com' },
  { id: 'kathmandupost', name: 'The Kathmandu Post', lang: 'en', url: 'https://kathmandupost.com/rss', home: 'https://kathmandupost.com' },
  { id: 'myrepublica', name: 'My Republica', lang: 'en', url: 'https://myrepublica.nagariknetwork.com', home: 'https://myrepublica.nagariknetwork.com' },
  { id: 'himalayantimes', name: 'The Himalayan Times', lang: 'en', url: 'https://thehimalayantimes.com', home: 'https://thehimalayantimes.com' },
  { id: 'risingnepal', name: 'The Rising Nepal', lang: 'en', url: 'https://risingnepaldaily.com/rss', home: 'https://risingnepaldaily.com' },
  { id: 'nepalitimes', name: 'Nepali Times', lang: 'en', url: 'https://www.nepalitimes.com/feed', home: 'https://www.nepalitimes.com' },
  { id: 'khabarhub-en', name: 'Khabarhub English', lang: 'en', url: 'https://english.khabarhub.com/feed', home: 'https://english.khabarhub.com' },
  { id: 'nepallivetoday', name: 'Nepal Live Today', lang: 'en', url: 'https://www.nepallivetoday.com/feed', home: 'https://www.nepallivetoday.com' },
  { id: 'ratopati-en', name: 'Ratopati English', lang: 'en', url: 'https://english.ratopati.com/feed', home: 'https://english.ratopati.com' },
  { id: 'lokaantar-en', name: 'Lokaantar English', lang: 'en', url: 'https://english.lokaantar.com', home: 'https://english.lokaantar.com' },
];
