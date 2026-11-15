import { randomBytes, scrypt as scryptCb, timingSafeEqual } from 'crypto';
import { promisify } from 'util';
import { Router } from 'express';
import { OAuth2Client } from 'google-auth-library';
import { z } from 'zod';
import { config } from '../config';
import { pool } from '../db';
import { COOKIE, requireAuth, setSessionCookie, wrap } from '../auth';

const router = Router();
const scrypt = promisify(scryptCb) as (pw: string, salt: Buffer, len: number) => Promise<Buffer>;
const google = () => new OAuth2Client(config.google.clientId, config.google.clientSecret, config.google.redirectUri);

async function hashPassword(pw: string): Promise<string> {
  const salt = randomBytes(16);
  return `${salt.toString('hex')}:${(await scrypt(pw, salt, 64)).toString('hex')}`;
}
async function verifyPassword(pw: string, stored: string): Promise<boolean> {
  const [salt, key] = stored.split(':');
  const actual = await scrypt(pw, Buffer.from(salt, 'hex'), 64);
  return timingSafeEqual(actual, Buffer.from(key, 'hex'));
}

// Step 1: send the browser to Google's real consent screen
router.get('/auth/google', (_req, res) => {
  if (!config.google.clientId) return res.status(500).send('GOOGLE_CLIENT_ID is not configured');
  const url = google().generateAuthUrl({ scope: ['openid', 'email', 'profile'], prompt: 'select_account' });
  res.redirect(url);
});

// Step 2: Google redirects back with ?code=...
router.get(
  '/auth/google/callback',
  wrap(async (req, res) => {
    const code = String(req.query.code ?? '');
    if (!code) return res.redirect(`${config.frontendUrl}/?error=login_failed`);
    try {
      const client = google();
      const { tokens } = await client.getToken(code);
      const ticket = await client.verifyIdToken({ idToken: tokens.id_token!, audience: config.google.clientId });
      const p = ticket.getPayload()!;
      // Link an earlier email/password account that has the same (Google-verified) email
      await pool.query(
        `UPDATE users SET google_id=$1, name=$3, avatar=$4 WHERE google_id IS NULL AND lower(email)=lower($2)`,
        [p.sub, p.email, p.name ?? p.email, p.picture ?? null],
      );
      const { rows } = await pool.query(
        `INSERT INTO users (google_id, email, name, avatar) VALUES ($1,$2,$3,$4)
         ON CONFLICT (google_id) DO UPDATE SET email=EXCLUDED.email, name=EXCLUDED.name, avatar=EXCLUDED.avatar
         RETURNING id`,
        [p.sub, p.email, p.name ?? p.email, p.picture ?? null],
      );
      setSessionCookie(res, rows[0].id);
      res.redirect(`${config.frontendUrl}/dashboard`);
    } catch (e) {
      console.error('[auth] google callback failed:', (e as Error).message);
      res.redirect(`${config.frontendUrl}/?error=login_failed`);
    }
  }),
);

// Email + password: logs in, or creates the account the first time ("sign up through email")
const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(8).max(200),
});
router.post(
  '/api/auth/login',
  wrap(async (req, res) => {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Enter a valid email and a password of at least 8 characters.' });
    const { email, password } = parsed.data;
    const { rows } = await pool.query('SELECT id, password_hash FROM users WHERE lower(email)=$1 LIMIT 1', [email]);
    let id: number;
    if (rows[0]) {
      if (!rows[0].password_hash) return res.status(409).json({ error: 'This email uses Google sign-in. Choose "Login with Google".' });
      if (!(await verifyPassword(password, rows[0].password_hash))) return res.status(401).json({ error: 'Wrong email or password.' });
      id = rows[0].id;
    } else {
      const ins = await pool.query('INSERT INTO users (email, name, password_hash) VALUES ($1,$2,$3) RETURNING id', [
        email,
        email.split('@')[0],
        await hashPassword(password),
      ]);
      id = ins.rows[0].id;
    }
    setSessionCookie(res, id);
    res.json({ ok: true });
  }),
);

router.get(
  '/api/me',
  requireAuth,
  wrap(async (req, res) => {
    const { rows } = await pool.query('SELECT id, email, name, avatar FROM users WHERE id=$1', [req.userId]);
    if (!rows[0]) return res.status(401).json({ error: 'User not found' });
    res.json(rows[0]);
  }),
);

router.post('/api/auth/logout', (_req, res) => {
  res.clearCookie(COOKIE, { sameSite: config.crossSiteCookies ? 'none' : 'lax', secure: config.crossSiteCookies });
  res.status(204).end();
});

export default router;
