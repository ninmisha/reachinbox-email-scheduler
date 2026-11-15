import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { pool } from '../db';
import { requireAuth, wrap } from '../auth';
import { postRaw, sendTest } from '../slack';

const router = Router();

// Frontend calls this, then navigates the browser to the returned Slack authorize URL.
router.get(
  '/api/slack/connect-url',
  requireAuth,
  wrap(async (req, res) => {
    if (!config.slack.clientId) return res.status(500).json({ error: 'Slack is not configured on the server' });
    const state = jwt.sign({ uid: req.userId, purpose: 'slack' }, config.jwtSecret, { expiresIn: '10m' });
    const params = new URLSearchParams({
      client_id: config.slack.clientId,
      scope: 'incoming-webhook',
      redirect_uri: config.slack.redirectUri,
      state,
    });
    res.json({ url: `https://slack.com/oauth/v2/authorize?${params}` });
  }),
);

// Slack redirects here. The user is identified by the signed `state`, not by a cookie
// (the redirect may come through a tunnel on a different host).
router.get(
  '/auth/slack/callback',
  wrap(async (req, res) => {
    const back = (s: string) => res.redirect(`${config.frontendUrl}/dashboard?slack=${s}`);
    try {
      if (req.query.error) return back('denied');
      const { uid } = jwt.verify(String(req.query.state), config.jwtSecret) as { uid: number };
      const r = await fetch('https://slack.com/api/oauth.v2.access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: config.slack.clientId,
          client_secret: config.slack.clientSecret,
          code: String(req.query.code),
          redirect_uri: config.slack.redirectUri,
        }),
      });
      const data = (await r.json()) as {
        ok: boolean;
        error?: string;
        incoming_webhook?: { url: string; channel: string };
        team?: { name: string };
      };
      if (!data.ok || !data.incoming_webhook) {
        console.error('[slack] oauth failed:', data.error);
        return back('error');
      }
      await pool.query(
        `INSERT INTO slack_connections (user_id, webhook_url, channel, team) VALUES ($1,$2,$3,$4)
         ON CONFLICT (user_id) DO UPDATE SET webhook_url=EXCLUDED.webhook_url, channel=EXCLUDED.channel,
           team=EXCLUDED.team, connected_at=now()`,
        [uid, data.incoming_webhook.url, data.incoming_webhook.channel, data.team?.name ?? null],
      );
      await postRaw(data.incoming_webhook.url, ':white_check_mark: Slack connected to the email scheduler.');
      back('connected');
    } catch (e) {
      console.error('[slack] callback failed:', (e as Error).message);
      back('error');
    }
  }),
);

router.get(
  '/api/slack',
  requireAuth,
  wrap(async (req, res) => {
    const { rows } = await pool.query('SELECT channel, team FROM slack_connections WHERE user_id=$1', [req.userId]);
    res.json(rows[0] ? { connected: true, channel: rows[0].channel, team: rows[0].team } : { connected: false });
  }),
);

router.post(
  '/api/slack/test',
  requireAuth,
  wrap(async (req, res) => {
    const ok = await sendTest(req.userId!);
    res.status(ok ? 200 : 400).json({ ok });
  }),
);

router.delete(
  '/api/slack',
  requireAuth,
  wrap(async (req, res) => {
    await pool.query('DELETE FROM slack_connections WHERE user_id=$1', [req.userId]);
    res.status(204).end();
  }),
);

export default router;
