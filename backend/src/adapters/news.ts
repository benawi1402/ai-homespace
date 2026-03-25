import RssParser from 'rss-parser';
import { createHash } from 'node:crypto';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { config } from '../config';
import { cache } from '../cache';
import type { NewsPost, NewsData } from '../types';

const CACHE_KEY = 'news';

// ── Curated feeds covering user interests ────────────────────────────────────
const DEFAULT_FEEDS: Array<{ url: string; name: string }> = [
  { url: 'https://news.ycombinator.com/rss',            name: 'Hacker News' },
  { url: 'https://feeds.arstechnica.com/arstechnica/index', name: 'Ars Technica' },
  { url: 'https://www.rockpapershotgun.com/feed',       name: 'Rock Paper Shotgun' },
  { url: 'https://www.tagesschau.de/xml/rss2/',         name: 'Tagesschau' },
  { url: 'https://feeds.npr.org/1003/rss.xml',          name: 'NPR Politics' },
  { url: 'https://www.pcgamer.com/rss/',                name: 'PC Gamer' },
];

const FEEDS = config.news.feedUrls.length ? config.news.feedUrls : DEFAULT_FEEDS;

// ── RSS item helpers ─────────────────────────────────────────────────────────
type CustomItem = {
  title?: string;
  link?: string;
  guid?: string;
  isoDate?: string;
  contentSnippet?: string;
  content?: string;
  enclosure?: { url?: string; type?: string };
  mediaContent?: { $?: { url?: string; medium?: string } };
  mediaThumbnail?: { $?: { url?: string } };
};

function extractImgSrc(html: string): string | undefined {
  const m = html.match(/<img[^>]+src=["']([^"']+)["']/i);
  return m?.[1];
}

function pickImageUrl(item: CustomItem): string | undefined {
  if (item.mediaThumbnail?.$?.url) return item.mediaThumbnail.$.url;
  const mc = item.mediaContent?.$;
  if (mc?.url && (!mc.medium || mc.medium === 'image')) return mc.url;
  const enc = item.enclosure;
  if (enc?.url && enc.type?.startsWith('image/')) return enc.url;
  if (item.content) return extractImgSrc(item.content);
  return undefined;
}

// ── Keyword scoring (fallback when no OpenAI key) ────────────────────────────
const INTEREST_KEYWORDS = [
  // Software dev
  'programming', 'developer', 'software', 'typescript', 'javascript', 'rust',
  'python', 'golang', 'linux', 'open source', 'github', 'framework', 'release',
  'tool', 'api', 'open-source',
  // AI/ML
  'ai', 'artificial intelligence', 'machine learning', 'llm', 'gpt', 'claude',
  'gemini', 'neural', 'openai', 'deepmind', 'anthropic', 'model', 'diffusion',
  // Politics
  'election', 'politics', 'parliament', 'bundestag', 'germany', 'deutschland',
  'congress', 'senate', 'trump', 'biden', 'harris', 'washington', 'white house',
  'scholz', 'merz', 'habeck',
  // PC Gaming
  'game', 'gaming', 'pc game', 'indie', 'steam', 'strategy', 'rpg',
  'early access', 'mod', 'playthrough', 'retro', 'roguelike', 'hardcore',
  'simulator', 'review', 'patch', 'expansion', 'dlc',
];

function keywordScore(post: NewsPost): number {
  const text = `${post.title} ${post.description}`.toLowerCase();
  let score = 0;
  for (const kw of INTEREST_KEYWORDS) {
    if (text.includes(kw)) score++;
  }
  return score;
}

// ── Dislike persistence ──────────────────────────────────────────────────────
export interface DislikeEntry {
  id: string;
  title: string;
  synopsis: string;
  dislikedAt: string;
}

interface DislikeStore {
  dislikes: DislikeEntry[];
}

const dislikesPath = () => join(config.dataDir, 'news-dislikes.json');

async function loadDislikes(): Promise<DislikeEntry[]> {
  try {
    const raw = await readFile(dislikesPath(), 'utf-8');
    const store = JSON.parse(raw) as DislikeStore;
    return store.dislikes ?? [];
  } catch {
    return [];
  }
}

export async function saveDislikes(entry: DislikeEntry): Promise<void> {
  const dislikes = await loadDislikes();
  // Keep at most 200 dislike records
  dislikes.push(entry);
  const trimmed = dislikes.slice(-200);
  await mkdir(config.dataDir, { recursive: true });
  await writeFile(dislikesPath(), JSON.stringify({ dislikes: trimmed }, null, 2), 'utf-8');
  // Bust cache so next GET re-ranks with the updated signal
  cache.invalidate(CACHE_KEY);
}

// ── OpenAI ranking ───────────────────────────────────────────────────────────
async function rankWithAI(
  posts: NewsPost[],
  dislikes: DislikeEntry[],
): Promise<string[]> {
  const dislikeSection =
    dislikes.length > 0
      ? `\n\nPreviously marked as uninteresting by the user (deprioritise similar topics):\n` +
        dislikes
          .slice(-20)
          .map((d) => `- ${d.synopsis.slice(0, 120)}`)
          .join('\n')
      : '';

  const input = posts.map((p) => ({
    id: p.id,
    title: p.title,
    description: p.description.slice(0, 150),
    source: p.source,
  }));

  const resp = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.openai.apiKey}`,
    },
    body: JSON.stringify({
      model: config.openai.model,
      response_format: { type: 'json_object' },
      temperature: 0.2,
      max_tokens: 600,
      messages: [
        {
          role: 'system',
          content:
            `You are a personal news curator. The user is interested in: ` +
            `software development (languages, frameworks, open-source, releases), ` +
            `AI/ML (LLMs, research, products), German and US politics (policy, elections, government), ` +
            `PC gaming (especially hardcore, niche, indie, strategy, RPG games).` +
            dislikeSection +
            `\n\nGiven a list of articles, respond with a JSON object ` +
            `{"ranked_ids": [...]} containing the IDs ordered from most to least relevant. ` +
            `Include only articles relevant to the interests above; omit celebrity gossip, ` +
            `mainstream sports, and generic lifestyle content.`,
        },
        { role: 'user', content: JSON.stringify(input) },
      ],
    }),
  });

  if (!resp.ok) throw new Error(`OpenAI error ${resp.status}`);

  const data = (await resp.json()) as {
    choices: Array<{ message: { content: string } }>;
  };
  const content = data.choices?.[0]?.message?.content ?? '{}';
  const parsed = JSON.parse(content) as { ranked_ids?: string[] };
  return parsed.ranked_ids ?? [];
}

// ── Main fetch ───────────────────────────────────────────────────────────────
function hashId(url: string): string {
  return createHash('sha1').update(url).digest('hex').slice(0, 16);
}

export async function fetchNews(): Promise<NewsData> {
  const cached = cache.get<NewsData>(CACHE_KEY);
  if (cached) return cached;

  const parser = new RssParser<Record<string, unknown>, CustomItem>({
    timeout: 8000,
    customFields: {
      item: [
        ['media:content',   'mediaContent',   { keepArray: false }],
        ['media:thumbnail', 'mediaThumbnail', { keepArray: false }],
      ],
    },
  });
  const dislikes = await loadDislikes();
  const dislikedIds = new Set(dislikes.map((d) => d.id));

  // Fetch all feeds in parallel; silently drop any that fail or time out
  const feedResults = await Promise.allSettled(
    FEEDS.map(async ({ url, name }) => {
      const feed = await parser.parseURL(url);
      return (feed.items ?? []).slice(0, 15).map(
        (item): NewsPost => ({
          id: hashId(item.link ?? item.guid ?? item.title ?? Math.random().toString()),
          title: item.title?.trim() ?? '(untitled)',
          description: item.contentSnippet?.trim() ?? '',
          url: item.link ?? item.guid ?? '',
          source: name,
          publishedAt: item.isoDate ?? new Date().toISOString(),
          imageUrl: pickImageUrl(item),
        }),
      );
    }),
  );

  // Merge, deduplicate, filter dislikes
  const seen = new Set<string>();
  let posts: NewsPost[] = feedResults
    .filter((r): r is PromiseFulfilledResult<NewsPost[]> => r.status === 'fulfilled')
    .flatMap((r) => r.value)
    .filter((p) => {
      if (dislikedIds.has(p.id) || seen.has(p.id)) return false;
      seen.add(p.id);
      return true;
    });

  // Rank: AI if key is available, keyword scoring otherwise
  if (config.openai.apiKey && posts.length > 0) {
    try {
      const rankedIds = await rankWithAI(posts, dislikes);
      const idIndex = new Map(rankedIds.map((id, i) => [id, i]));
      posts.sort((a, b) => (idIndex.get(a.id) ?? 999) - (idIndex.get(b.id) ?? 999));
    } catch {
      // AI failed — fall through to keyword scoring
      posts.sort((a, b) => keywordScore(b) - keywordScore(a));
    }
  } else {
    posts.sort((a, b) => keywordScore(b) - keywordScore(a));
  }

  const data: NewsData = { posts: posts.slice(0, 20), updatedAt: new Date().toISOString() };
  cache.set(CACHE_KEY, data, config.news.cacheTtl);
  return data;
}
