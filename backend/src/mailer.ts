import nodemailer, { Transporter } from 'nodemailer';
import { pool } from './db';
import { config } from './config';
import { Sender } from './types';

/** Creates Ethereal (fake SMTP) accounts on first run and stores them in Postgres. */
export async function ensureSenders(): Promise<void> {
  const { rows } = await pool.query<{ c: number }>('SELECT count(*)::int AS c FROM senders');
  for (let i = rows[0].c; i < config.senderCount; i++) {
    const acc = await nodemailer.createTestAccount();
    await pool.query(
      `INSERT INTO senders (email, smtp_host, smtp_port, smtp_user, smtp_pass)
       VALUES ($1,$2,$3,$4,$5) ON CONFLICT (email) DO NOTHING`,
      [acc.user, acc.smtp.host, acc.smtp.port, acc.user, acc.pass],
    );
    console.log(`[mailer] created Ethereal sender ${acc.user}`);
  }
}

export async function listSenders(): Promise<Sender[]> {
  const { rows } = await pool.query<Sender>('SELECT * FROM senders ORDER BY id');
  return rows;
}

const senderCache = new Map<number, Sender>();
export async function getSender(id: number): Promise<Sender> {
  const cached = senderCache.get(id);
  if (cached) return cached;
  const { rows } = await pool.query<Sender>('SELECT * FROM senders WHERE id=$1', [id]);
  if (!rows[0]) throw new Error(`Sender ${id} not found`);
  senderCache.set(id, rows[0]);
  return rows[0];
}

const transports = new Map<number, Transporter>();
function transportFor(s: Sender): Transporter {
  let t = transports.get(s.id);
  if (!t) {
    t = nodemailer.createTransport({
      host: s.smtp_host,
      port: s.smtp_port,
      secure: false,
      auth: { user: s.smtp_user, pass: s.smtp_pass },
    });
    transports.set(s.id, t);
  }
  return t;
}

function htmlToText(html: string): string {
  return html
    .replace(/<\/(p|div|li|h[1-6])>|<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .trim();
}

export async function sendMail(sender: Sender, to: string, subject: string, body: string) {
  const info = await transportFor(sender).sendMail({
    from: `"ReachInbox Scheduler" <${sender.email}>`,
    to,
    subject,
    text: htmlToText(body),
    html: body,
  });
  return {
    messageId: info.messageId as string,
    previewUrl: (nodemailer.getTestMessageUrl(info) || null) as string | null,
  };
}
