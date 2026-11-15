import 'dotenv/config';

const str = (key: string, fallback = ''): string => process.env[key] ?? fallback;
const num = (key: string, fallback: number): number => {
  const raw = process.env[key];
  if (raw === undefined || raw === '') return fallback;
  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
};

const backendUrl = str('BACKEND_URL', 'http://localhost:4000');

export const config = {
  port: num('PORT', 4000),
  frontendUrl: str('FRONTEND_URL', 'http://localhost:5173'),
  backendUrl,
  crossSiteCookies: str('COOKIE_CROSS_SITE') === 'true',
  jwtSecret: str('JWT_SECRET', 'dev-secret-change-me'),
  devApiKey: str('DEV_API_KEY'),

  databaseUrl: str('DATABASE_URL', 'postgres://postgres:postgres@localhost:5432/scheduler'),
  redisUrl: str('REDIS_URL', 'redis://localhost:6379'),
  elasticsearchUrl: str('ELASTICSEARCH_URL', 'http://localhost:9200'),

  google: {
    clientId: str('GOOGLE_CLIENT_ID'),
    clientSecret: str('GOOGLE_CLIENT_SECRET'),
    redirectUri: `${backendUrl}/auth/google/callback`,
  },
  slack: {
    clientId: str('SLACK_CLIENT_ID'),
    clientSecret: str('SLACK_CLIENT_SECRET'),
    redirectUri: str('SLACK_REDIRECT_URI', `${backendUrl}/auth/slack/callback`),
  },

  worker: {
    concurrency: num('WORKER_CONCURRENCY', 5),
    minDelayMs: num('MIN_DELAY_BETWEEN_EMAILS_MS', 2000),
    embedded: str('RUN_WORKER', 'true') !== 'false',
  },
  rate: {
    maxPerWindowPerSender: num('MAX_EMAILS_PER_HOUR_PER_SENDER', 100),
    windowMs: num('RATE_WINDOW_SECONDS', 3600) * 1000,
  },
  senderCount: num('SENDER_COUNT', 3),
  bullBoard: { user: str('BULL_BOARD_USER'), pass: str('BULL_BOARD_PASS') },
};
