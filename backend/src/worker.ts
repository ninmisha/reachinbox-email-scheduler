import { DelayedError, Job, Worker } from 'bullmq';
import { redis } from './redis';
import { pool } from './db';
import { config } from './config';
import { EmailJobData, QUEUE_NAME } from './queue';
import { getSender, sendMail } from './mailer';
import { firstNotifyInWindow, release, tryAcquire } from './rateLimiter';
import { notifyRateLimit } from './slack';
import { getDocById } from './repo';
import { indexEmail } from './search';

/** {{name}} -> local part of the address, {{email}} -> full address. */
const personalize = (t: string, to: string) =>
  t.replace(/\{\{\s*email\s*\}\}/gi, to).replace(/\{\{\s*name\s*\}\}/gi, to.split('@')[0]);

const reindex = (id: string) => getDocById(id).then(indexEmail).catch(() => undefined);

async function processor(job: Job<EmailJobData>, token?: string): Promise<string> {
  const { emailId } = job.data;

  // 1) Idempotency: atomically claim the row. Only one worker can flip scheduled -> processing.
  //    A 'processing' row older than 2 min is a crashed worker's leftover and may be re-claimed.
  const claim = await pool.query(
    `UPDATE emails SET status='processing', updated_at=now()
     WHERE id=$1 AND (status='scheduled' OR (status='processing' AND updated_at < now() - interval '2 minutes'))
     RETURNING *`,
    [emailId],
  );
  const email = claim.rows[0];
  if (!email) return 'skipped (already handled)';

  const sender = await getSender(email.sender_id);
  const limit = Math.min(email.hourly_limit, config.rate.maxPerWindowPerSender);

  // 2) Hourly limit: Redis-backed counter shared by all workers.
  const slot = await tryAcquire(sender.id, limit);
  if (!slot.allowed) {
    // Never drop: push the same job to the next window. seq%1000 keeps original order roughly stable.
    const runAt = slot.nextWindowStart + (Number(email.seq) % 1000);
    await pool.query(`UPDATE emails SET status='scheduled', scheduled_at=$2, updated_at=now() WHERE id=$1`, [
      emailId,
      new Date(runAt),
    ]);
    if (await firstNotifyInWindow(sender.id, slot.windowStart)) {
      await notifyRateLimit(email.user_id, sender.email, limit, new Date(slot.nextWindowStart));
    }
    await job.moveToDelayed(runAt, token);
    reindex(emailId);
    throw new DelayedError();
  }

  // 3) Send
  try {
    const { messageId, previewUrl } = await sendMail(
      sender,
      email.to_email,
      personalize(email.subject, email.to_email),
      personalize(email.body, email.to_email),
    );
    await pool.query(
      `UPDATE emails SET status='sent', sent_at=now(), message_id=$2, preview_url=$3, error=NULL, updated_at=now()
       WHERE id=$1`,
      [emailId, messageId, previewUrl],
    );
    reindex(emailId);
    return `sent ${messageId}`;
  } catch (err) {
    await release(slot.key);
    const isFinal = job.attemptsMade + 1 >= (job.opts.attempts ?? 1);
    await pool.query(`UPDATE emails SET status=$2, error=$3, updated_at=now() WHERE id=$1`, [
      emailId,
      isFinal ? 'failed' : 'scheduled',
      (err as Error).message.slice(0, 500),
    ]);
    reindex(emailId);
    throw err; // BullMQ retries with backoff until attempts are exhausted
  }
}

export function startWorker(): Worker<EmailJobData> {
  const worker = new Worker<EmailJobData>(QUEUE_NAME, processor, {
    connection: redis,
    concurrency: config.worker.concurrency,
    // Min delay between sends across ALL workers: 1 job per minDelayMs.
    limiter: { max: 1, duration: config.worker.minDelayMs },
  });
  worker.on('failed', (job, err) => console.warn(`[worker] job ${job?.id} failed: ${err.message}`));
  worker.on('error', (err) => console.error('[worker] error', err.message));
  console.log(
    `[worker] started (concurrency=${config.worker.concurrency}, minDelay=${config.worker.minDelayMs}ms, ` +
      `maxPerWindowPerSender=${config.rate.maxPerWindowPerSender})`,
  );
  return worker;
}
