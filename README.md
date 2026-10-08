# Latest Nepal News

**latestnepalnews.com** collects the newest headlines from Nepal's leading news sites, in Nepali and English, and refreshes them automatically every 30 minutes.

- Nepali site at `/`, English at `/en/`, with a language switch on every page.
- **Top stories**: when several outlets report the same story, it shows once with "also covered by" links.
- Topic pages: Politics, Business, Sports, Entertainment, Tech, Health, World and Nepal.
- Each story shows the headline, a short excerpt and a link to the original article. Full articles are never copied.
- It's a static site: no server, no database and no plugins to update. It's hosted free on GitHub Pages.

## How it works

A GitHub Actions workflow ([`.github/workflows/update.yml`](.github/workflows/update.yml)) runs every 30 minutes. Each run does the following:

1. Fetches every feed in [`config/feeds.js`](config/feeds.js).
2. Merges the new stories with those from the previous run, and keeps three days of news.
3. Sorts each story into a topic using the keywords in [`config/categories.js`](config/categories.js).
4. Builds the HTML pages into `dist/` and publishes them to GitHub Pages.

If a feed fails, it's skipped and the rest still publish. To see which feeds are working, open the **Sources** page or `/data/status.json` on the live site, or read the log of the latest workflow run.

## Launch checklist

1. **Turn on GitHub Pages.** In the repo, go to **Settings → Pages**. Under *Build and deployment*, set **Source** to **GitHub Actions**.
2. **Run the first build.** Go to **Actions → Update news and deploy → Run workflow**. The site appears at `https://pushkarrajtiwari.github.io/latestnepalnews/`.
3. **Add your domain.** In **Settings → Pages → Custom domain**, enter `latestnepalnews.com` and save.
4. **Point DNS at GitHub.** At your domain registrar, add these records:

   | Type | Name | Value |
   |---|---|---|
   | A | @ | 185.199.108.153 |
   | A | @ | 185.199.109.153 |
   | A | @ | 185.199.110.153 |
   | A | @ | 185.199.111.153 |
   | CNAME | www | pushkarrajtiwari.github.io |

   Delete any other A records for `@` (for example, a parking page).
5. **Enable HTTPS.** Once the DNS check in **Settings → Pages** passes, tick **Enforce HTTPS**. DNS changes can take a few hours.
6. **Rebuild with the new address.** Run the workflow once more, so links and the sitemap use `latestnepalnews.com`.
7. **Tell Google about the site.** Add it in [Google Search Console](https://search.google.com/search-console) and submit `https://latestnepalnews.com/sitemap.xml`.

## Hosting on Vercel instead

`vercel.json` already tells Vercel how to build the site and to publish the `dist` folder. Vercel rebuilds automatically on every push to `main`. To keep the news refreshing every 30 minutes:

1. In Vercel, go to **Project → Settings → Git → Deploy Hooks** and create a hook named `refresh` for the `main` branch. Copy its URL.
2. In GitHub, go to **Settings → Secrets and variables → Actions → New repository secret**. Name it `VERCEL_DEPLOY_HOOK` and paste the URL.
3. Add `latestnepalnews.com` under **Vercel → Project → Settings → Domains** and set the DNS records Vercel shows you. (You don't need the GitHub Pages DNS records above.)

The scheduled GitHub workflow then calls the hook every 30 minutes, and each Vercel build fetches the latest feeds.

Note that Vercel's free Hobby plan is for non-commercial use. If you add ads later, you'll need its Pro plan, or you can switch to GitHub Pages, which is free for this.

## Common changes

| To | Edit |
|---|---|
| Add or remove a news source | `config/feeds.js` |
| Tune which topic a headline lands in | `config/categories.js` |
| Add a contact email, or change how many stories show | `config/site.js` |
| Change the interface text or the About, Privacy and Disclaimer pages | `src/i18n.js` |
| Change the look | `static/style.css` |

Committing to `main` rebuilds and redeploys the site automatically.

## Run it locally

You need Node.js 20 or later.

```sh
npm install
npm run preview      # builds with the sample feeds in test/fixtures and serves http://localhost:4173
npm run build        # builds with the live feeds
npm test
```
