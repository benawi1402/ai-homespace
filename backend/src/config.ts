function parseFeedUrls(raw: string): Array<{ url: string; name: string }> {
  if (!raw.trim()) return [];
  return raw.split(',').map((entry) => {
    const [url, name] = entry.trim().split('|');
    return { url: url.trim(), name: (name ?? url).trim() };
  });
}

export const config = {
  port: parseInt(process.env.PORT ?? '3001', 10),
  nodeEnv: process.env.NODE_ENV ?? 'development',

  weather: {
    apiKey: process.env.WEATHER_API_KEY ?? '',
    city: process.env.WEATHER_CITY ?? 'Amsterdam',
    units: (process.env.WEATHER_UNITS ?? 'metric') as 'metric' | 'imperial',
    cacheTtl: parseInt(process.env.WEATHER_CACHE_TTL ?? '600', 10),
  },

  mail: {
    host: process.env.MAIL_HOST ?? '',
    port: parseInt(process.env.MAIL_PORT ?? '993', 10),
    user: process.env.MAIL_USER ?? '',
    password: process.env.MAIL_PASSWORD ?? '',
    tls: process.env.MAIL_TLS !== 'false',
    mailbox: process.env.MAIL_MAILBOX ?? 'INBOX',
    name: process.env.MAIL_NAME ?? '',
    cacheTtl: parseInt(process.env.MAIL_CACHE_TTL ?? '120', 10),
  },

  mail2: {
    host: process.env.MAIL2_HOST ?? '',
    port: parseInt(process.env.MAIL2_PORT ?? '993', 10),
    user: process.env.MAIL2_USER ?? '',
    password: process.env.MAIL2_PASSWORD ?? '',
    tls: process.env.MAIL2_TLS !== 'false',
    mailbox: process.env.MAIL2_MAILBOX ?? 'INBOX',
    name: process.env.MAIL2_NAME ?? '',
    cacheTtl: parseInt(process.env.MAIL2_CACHE_TTL ?? '120', 10),
  },

  hass: {
    url: process.env.HASS_URL ?? '',
    token: process.env.HASS_TOKEN ?? '',
    cacheTtl: parseInt(process.env.HASS_CACHE_TTL ?? '30', 10),
  },

  news: {
    // Optional comma-separated list: "https://example.com/rss|Feed Name,..."
    feedUrls: parseFeedUrls(process.env.NEWS_FEED_URLS ?? ''),
    cacheTtl: parseInt(process.env.NEWS_CACHE_TTL ?? '1800', 10),
  },

  openai: {
    apiKey: process.env.OPENAI_API_KEY ?? '',
    model: process.env.OPENAI_MODEL ?? 'gpt-4o-mini',
  },

  dataDir: process.env.DATA_DIR ?? '/app/data',
};
