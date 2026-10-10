// Site-wide settings.
export const site = {
  // Public address of the site. The build workflow overrides this with the
  // address GitHub Pages reports, so it is only used for local builds.
  url: 'https://www.latestnepalnews.com',

  // Shown on the About and Disclaimer pages when set, e.g. 'hello@latestnepalnews.com'.
  contactEmail: '',

  // Number of stories in each homepage block.
  topStories: 9,
  perSection: 5,
  latestSidebar: 15,
  perCategoryPage: 60,
  perLatestPage: 120,

  // Every story gets its own page on the site at /news/<id>/. Pages are kept
  // this many days after the story was published.
  storyDays: 30,

  // Short summaries written by Claude for stories that several outlets cover.
  // They're only written when the ANTHROPIC_API_KEY environment variable is
  // set (in Vercel: Project → Settings → Environment Variables).
  summaries: {
    model: 'claude-opus-5-5',
    // At most this many new summaries per build, to cap the cost.
    maxPerBuild: 12,
    // Only stories first seen in the last this-many hours get a summary.
    hours: 24,
  },

  // Stories shown on each day's brief page.
  briefStories: 10,

  // Automatic posts to the Facebook page. Only on when the FACEBOOK_PAGE_ID
  // and FACEBOOK_PAGE_TOKEN environment variables are set (see README).
  facebook: {
    // Which language's top stories to post: 'np' or 'en'.
    lang: 'np',
    // At most this many posts per build.
    maxPerBuild: 3,
    // Only stories at least this many outlets report.
    minSources: 2,
    // Only stories published in the last this-many hours.
    hours: 6,
    graphVersion: 'v23.0',
  },
};
