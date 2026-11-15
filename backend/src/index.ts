import { config } from './config';
import { initDb } from './db';
import { ensureSenders } from './mailer';
import { initSearch } from './search';
import { reconcileJobs } from './scheduler';
import { startWorker } from './worker';
import { createServer } from './server';
import { emailQueue } from './queue';
import { redis } from './redis';
import { pool } from './db';

async function main() {
  await initDb();
  await ensureSenders();
  await initSearch();

  const restored = await reconcileJobs();
  if (restored) console.log(`[boot] re-created ${restored} missing jobs from Postgres`);

  const worker = config.worker.embedded ? startWorker() : null;
  const server = createServer().listen(config.port, () => {
    console.log(`[api] http://localhost:${config.port}  |  queue dashboard: /admin/queues`);
  });

  // Graceful shutdown: let in-flight sends finish; delayed jobs stay safely in Redis.
  const shutdown = async (sig: string) => {
    console.log(`[boot] ${sig} received, shutting down`);
    server.close();
    await worker?.close();
    await emailQueue.close();
    redis.disconnect();
    await pool.end();
    process.exit(0);
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

main().catch((e) => {
  console.error('[boot] fatal', e);
  process.exit(1);
});
