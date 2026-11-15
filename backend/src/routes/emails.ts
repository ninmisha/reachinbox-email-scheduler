import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, wrap } from '../auth';
import { countEmails, getDocById, listEmails } from '../repo';
import { listSenders } from '../mailer';
import { pool } from '../db';
import { emailQueue } from '../queue';
import { indexEmail } from '../search';
import { scheduleBatch } from '../scheduler';
import { searchEmails } from '../search';
import { EmailKind } from '../types';

const router = Router();
router.use('/api/emails', requireAuth);

const kindSchema = z.enum(['scheduled', 'sent']);

router.get(
  '/api/emails',
  wrap(async (req, res) => {
    const kind = kindSchema.parse(req.query.status ?? 'scheduled') as EmailKind;
    const limit = Math.min(Number(req.query.limit) || 100, 500);
    const offset = Number(req.query.offset) || 0;
    res.json(await listEmails(req.userId!, kind, limit, offset));
  }),
);

router.get(
  '/api/emails/counts',
  wrap(async (req, res) => res.json(await countEmails(req.userId!))),
);

router.get(
  '/api/emails/search',
  wrap(async (req, res) => {
    const kind = kindSchema.parse(req.query.status ?? 'scheduled') as EmailKind;
    const q = String(req.query.q ?? '').trim();
    if (!q) return res.json({ items: [], total: 0 });
    try {
      res.json(await searchEmails(req.userId!, kind, q));
    } catch (e) {
      res.status(503).json({ error: (e as Error).message });
    }
  }),
);

router.get(
  '/api/emails/senders',
  wrap(async (_req, res) => {
    const senders = await listSenders();
    res.json(senders.map((s) => ({ id: s.id, email: s.email })));
  }),
);

router.get(
  '/api/emails/:id',
  wrap(async (req, res) => {
    const id = z.string().uuid().safeParse(req.params.id);
    const doc = id.success ? await getDocById(id.data) : null;
    if (!doc || doc.userId !== req.userId) return res.status(404).json({ error: 'Email not found' });
    res.json(doc);
  }),
);

router.post(
  '/api/emails/:id/cancel',
  wrap(async (req, res) => {
    const id = z.string().uuid().parse(req.params.id);
    // Only a still-scheduled email can be cancelled; the worker's atomic claim then skips it.
    const r = await pool.query(
      `UPDATE emails SET status='cancelled', updated_at=now()
       WHERE id=$1 AND user_id=$2 AND status='scheduled' RETURNING id`,
      [id, req.userId],
    );
    if (r.rowCount === 0) return res.status(409).json({ error: 'Only scheduled emails can be cancelled' });
    await emailQueue.remove(id).catch(() => undefined); // best effort, the DB status is the guard
    await indexEmail(await getDocById(id));
    res.json({ ok: true });
  }),
);

const scheduleSchema = z.object({
  subject: z.string().trim().min(1, 'Subject is required').max(300),
  body: z.string().trim().min(1, 'Body is required').max(50_000),
  recipients: z.array(z.string().trim().toLowerCase().email()).min(1, 'Add at least one valid email').max(20_000),
  startTime: z.coerce.date(),
  delaySeconds: z.coerce.number().min(0).max(86_400),
  hourlyLimit: z.coerce.number().int().min(1).max(100_000),
});

router.post(
  '/api/emails/schedule',
  wrap(async (req, res) => {
    const parsed = scheduleSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues.map((i) => i.message).join('; ') });
    }
    const input = parsed.data;
    input.recipients = [...new Set(input.recipients)]; // de-duplicate
    const result = await scheduleBatch(req.userId!, input);
    res.status(201).json(result);
  }),
);

export default router;
