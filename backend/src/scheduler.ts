import { randomUUID } from 'crypto';
import { pool } from './db';
import { emailQueue, EmailJobData } from './queue';
import { listSenders } from './mailer';
import { indexMany } from './search';
import { toDoc } from './repo';

export interface ScheduleInput {
  subject: string;
  body: string;
  recipients: string[];
  startTime: Date;
  delaySeconds: number;
  hourlyLimit: number;
}

/**
 * 1) Insert all rows in Postgres (source of truth)  2) enqueue one BullMQ delayed job per email.
 * jobId === email id, so re-adding the same email can never create a second job.
 */
export async function scheduleBatch(userId: number, input: ScheduleInput) {
  const senders = await listSenders();
  if (senders.length === 0) throw new Error('No senders configured');

  const batchId = randomUUID();
  const ids: string[] = [];
  const senderIds: number[] = [];
  const ats: string[] = [];
  input.recipients.forEach((_, i) => {
    ids.push(randomUUID());
    senderIds.push(senders[i % senders.length].id); // round-robin across senders
    ats.push(new Date(input.startTime.getTime() + i * input.delaySeconds * 1000).toISOString());
  });

  const { rows } = await pool.query(
    `WITH ins AS (
       INSERT INTO emails (id, user_id, sender_id, batch_id, to_email, subject, body, scheduled_at, hourly_limit)
       SELECT t.id, $5::int, t.sender_id, $6::uuid, t.to_email, $7, $8, t.at, $9::int
       FROM unnest($1::uuid[], $2::int[], $3::text[], $4::timestamptz[]) AS t(id, sender_id, to_email, at)
       RETURNING *
     )
     SELECT ins.*, s.email AS sender_email FROM ins JOIN senders s ON s.id = ins.sender_id`,
    [ids, senderIds, input.recipients, ats, userId, batchId, input.subject, input.body, input.hourlyLimit],
  );

  const now = Date.now();
  await emailQueue.addBulk(
    rows.map((r) => ({
      name: 'send-email',
      data: { emailId: r.id } as EmailJobData,
      opts: { jobId: r.id, delay: Math.max(0, new Date(r.scheduled_at).getTime() - now) },
    })),
  );

  await indexMany(rows.map(toDoc));
  return { batchId, count: rows.length, firstAt: ats[0], lastAt: ats[ats.length - 1] };
}

/**
 * Restart safety net. Jobs live in Redis (AOF) and survive restarts on their own; this also re-creates
 * any job that is missing (e.g. Redis was wiped, or the API crashed between the DB insert and enqueue).
 */
export async function reconcileJobs(): Promise<number> {
  const { rows } = await pool.query(
    `SELECT id, scheduled_at FROM emails
     WHERE status='scheduled' OR (status='processing' AND updated_at < now() - interval '2 minutes')`,
  );
  let restored = 0;
  for (let i = 0; i < rows.length; i += 200) {
    const chunk = rows.slice(i, i + 200);
    const existing = await Promise.all(chunk.map((r) => emailQueue.getJob(r.id)));
    const missing = chunk.filter((_, idx) => !existing[idx]);
    if (missing.length) {
      const now = Date.now();
      await emailQueue.addBulk(
        missing.map((r) => ({
          name: 'send-email',
          data: { emailId: r.id } as EmailJobData,
          opts: { jobId: r.id, delay: Math.max(0, new Date(r.scheduled_at).getTime() - now) },
        })),
      );
      restored += missing.length;
    }
  }
  return restored;
}
