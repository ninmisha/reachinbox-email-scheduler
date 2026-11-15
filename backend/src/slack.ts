import { pool } from './db';

async function post(webhookUrl: string, text: string): Promise<boolean> {
  try {
    const r = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });
    if (!r.ok) console.warn(`[slack] webhook responded ${r.status}`);
    return r.ok;
  } catch (e) {
    console.warn('[slack] webhook failed:', (e as Error).message);
    return false;
  }
}

async function webhookFor(userId: number): Promise<string | null> {
  const { rows } = await pool.query('SELECT webhook_url FROM slack_connections WHERE user_id=$1', [userId]);
  return rows[0]?.webhook_url ?? null;
}

/** No-op (never throws) when the user has not connected Slack. */
export async function notifyRateLimit(userId: number, senderEmail: string, limit: number, resumeAt: Date) {
  const url = await webhookFor(userId);
  if (!url) return;
  await post(
    url,
    `:warning: *Hourly send limit reached* for sender \`${senderEmail}\` (limit: ${limit}).\n` +
      `Remaining emails are not lost, they are rescheduled and resume at ${resumeAt.toUTCString()}.`,
  );
}

export async function sendTest(userId: number): Promise<boolean> {
  const url = await webhookFor(userId);
  if (!url) return false;
  return post(url, ':white_check_mark: Slack is connected to your email scheduler. Rate-limit alerts will show up here.');
}

export const postRaw = post;
