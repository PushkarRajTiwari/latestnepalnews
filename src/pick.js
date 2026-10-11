// Let an AI choose which story to post to Facebook: the most important or
// urgent one for Nepali readers, even when only one outlet has it so far.
// Services are tried in order (Claude, then ChatGPT, then Gemini); each one
// is used only when its API key is set. If none is set or all fail, the
// usual ranking stands (most outlets first, then newest).

const TIMEOUT_MS = 20_000;

function prompt(stories, { sourceName, now, recent = [] }) {
  const lines = stories.map((story, i) => {
    const minutes = Math.max(0, Math.round((now.getTime() - Date.parse(story.published)) / 60_000));
    const outlets = story.outlets > 1 ? `${story.outlets} outlets` : '1 outlet';
    return `${i + 1}. ${story.title} (${sourceName(story.source)}; ${outlets}; ${minutes} min ago)`;
  });
  return `You run the Facebook page of a Nepali news site. Below are the latest headlines. Pick the ONE story that is most important or urgent for readers in Nepal right now: breaking news, disasters, deaths of public figures, major government or economic decisions, or things that affect many people's daily lives. A story only one outlet has reported can still be the most important. Prefer serious news over gossip.

${lines.join('\n')}
${recent.length ? `\nThe page already posted these recently, so avoid another story on the same topic:\n${recent.map((t) => `- ${t}`).join('\n')}\n` : ''}
Reply with only the number of your choice.`;
}

function parseChoice(text, count) {
  const match = /\d+/.exec(text || '');
  const n = match ? Number(match[0]) : NaN;
  return n >= 1 && n <= count ? n - 1 : null;
}

async function postJson(url, body, headers, fetchImpl) {
  const response = await fetchImpl(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error?.message || `HTTP ${response.status}`);
  return data;
}

// Each service: { name, key (env var), ask(text, { key, model, fetchImpl }) → reply text }.
export const services = [
  {
    name: 'Claude',
    key: 'ANTHROPIC_API_KEY',
    async ask(text, { key, model, fetchImpl }) {
      const data = await postJson(
        'https://api.anthropic.com/v1/messages',
        { model, max_tokens: 16, messages: [{ role: 'user', content: text }] },
        { 'x-api-key': key, 'anthropic-version': '2023-06-01' },
        fetchImpl
      );
      return (data.content || []).map((block) => block.text || '').join('');
    },
  },
  {
    name: 'ChatGPT',
    key: 'OPENAI_API_KEY',
    async ask(text, { key, model, fetchImpl }) {
      const data = await postJson(
        'https://api.openai.com/v1/chat/completions',
        { model, messages: [{ role: 'user', content: text }] },
        { authorization: `Bearer ${key}` },
        fetchImpl
      );
      return data.choices?.[0]?.message?.content || '';
    },
  },
  {
    name: 'Gemini',
    key: 'GEMINI_API_KEY',
    async ask(text, { key, model, fetchImpl }) {
      const data = await postJson(
        `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
        { contents: [{ parts: [{ text }] }] },
        { 'x-goog-api-key': key },
        fetchImpl
      );
      return (data.candidates?.[0]?.content?.parts || []).map((part) => part.text || '').join('');
    },
  },
];

// Returns { story, by } where `by` names the service that chose, or
// 'ranking' when no service could. `stories` are already in ranking order.
export async function pickStory(stories, { env = process.env, models, sourceName, now = new Date(), recent = [], fetchImpl = fetch, log = () => {} }) {
  if (!stories.length) return { story: null, by: 'ranking' };
  if (stories.length === 1) return { story: stories[0], by: 'ranking' };
  const text = prompt(stories, { sourceName, now, recent });
  for (const service of services) {
    const key = env[service.key];
    if (!key) continue;
    try {
      const reply = await service.ask(text, { key, model: models[service.name], fetchImpl });
      const index = parseChoice(reply, stories.length);
      if (index !== null) return { story: stories[index], by: service.name };
      log(`${service.name} gave no usable answer`);
    } catch (error) {
      log(`${service.name} failed: ${error.message}`);
    }
  }
  return { story: stories[0], by: 'ranking' };
}
