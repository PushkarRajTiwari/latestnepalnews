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
  // set (in Vercel: Project → Settings → Environment Variables). With
  // GEMINI_API_KEY set too, Gemini writes them whenever Claude fails (or
  // alone, if only that key is set).
  summaries: {
    model: 'claude-sonnet-5-5',
    fallbackModel: 'gemini-2.5-flash',
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
    // At most this many posts per build. One per 30-minute refresh keeps
    // the page's feed steady.
    maxPerBuild: 1,
    // Only stories at least this many outlets report (1 = any story).
    // Stories more outlets report still go first.
    minSources: 1,
    // Only stories published in the last this-many hours.
    hours: 6,
    // Look for something to post among this many top stories (most outlets
    // first), so there's still a fresh one when the top few were posted.
    candidates: 30,
    graphVersion: 'v23.0',
    // An AI picks the most important of the top this-many candidates, so an
    // urgent story one outlet broke can beat one many outlets repeat. Tried
    // in order, each only if its key is set in Vercel: ANTHROPIC_API_KEY,
    // OPENAI_API_KEY, GEMINI_API_KEY. With none, the ranking decides.
    aiPool: 10,
    aiModels: {
      Claude: 'claude-sonnet-5-5',
      ChatGPT: 'gpt-4.1-mini',
      Gemini: 'gemini-2.5-flash',
    },
  },
};
