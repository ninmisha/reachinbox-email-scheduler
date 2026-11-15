// Run the worker as its own process: `npm run worker` (set RUN_WORKER=false on the API).
import { initDb, pool } from './db';
import { ensureSenders } from './mailer';
import { initSearch } from './search';
import { startWorker } from './worker';
import { redis } from './redis';

async function main() {
  await initDb();
  await ensureSenders();
  await initSearch();
  const worker = startWorker();
  const shutdown = async () => {
    await worker.close();
    redis.disconnect();
    await pool.end();
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
