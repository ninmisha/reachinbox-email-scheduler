import { pool } from './db';
import { EmailDoc, EmailKind } from './types';

const SELECT = `SELECT e.*, s.email AS sender_email
                FROM emails e JOIN senders s ON s.id = e.sender_id`;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function toDoc(r: any): EmailDoc {
  return {
    id: r.id,
    userId: r.user_id,
    senderEmail: r.sender_email,
    toEmail: r.to_email,
    subject: r.subject,
    body: r.body,
    status: r.status,
    scheduledAt: new Date(r.scheduled_at).toISOString(),
    sentAt: r.sent_at ? new Date(r.sent_at).toISOString() : null,
    previewUrl: r.preview_url,
    error: r.error,
  };
}

export const statusesFor = (kind: EmailKind) =>
  kind === 'scheduled' ? ['scheduled', 'processing'] : ['sent', 'failed'];

export async function getDocById(id: string): Promise<EmailDoc | null> {
  const { rows } = await pool.query(`${SELECT} WHERE e.id = $1`, [id]);
  return rows[0] ? toDoc(rows[0]) : null;
}

export async function listEmails(userId: number, kind: EmailKind, limit: number, offset: number) {
  const order = kind === 'scheduled' ? 'e.scheduled_at ASC' : 'COALESCE(e.sent_at, e.updated_at) DESC';
  const [list, total] = await Promise.all([
    pool.query(`${SELECT} WHERE e.user_id=$1 AND e.status = ANY($2) ORDER BY ${order} LIMIT $3 OFFSET $4`, [
      userId,
      statusesFor(kind),
      limit,
      offset,
    ]),
    pool.query('SELECT count(*)::int AS c FROM emails WHERE user_id=$1 AND status = ANY($2)', [
      userId,
      statusesFor(kind),
    ]),
  ]);
  return { items: list.rows.map(toDoc), total: total.rows[0].c as number };
}

export async function countEmails(userId: number) {
  const { rows } = await pool.query(
    `SELECT count(*) FILTER (WHERE status IN ('scheduled','processing'))::int AS scheduled,
            count(*) FILTER (WHERE status = 'sent')::int AS sent,
            count(*) FILTER (WHERE status = 'failed')::int AS failed,
            count(*) FILTER (WHERE status = 'cancelled')::int AS cancelled
     FROM emails WHERE user_id = $1`,
    [userId],
  );
  return rows[0] as { scheduled: number; sent: number; failed: number; cancelled: number };
}
