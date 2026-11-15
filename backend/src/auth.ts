import { NextFunction, Request, RequestHandler, Response } from 'express';
import jwt from 'jsonwebtoken';
import { config } from './config';
import { pool } from './db';

export const COOKIE = 'token';

export const wrap =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>): RequestHandler =>
  (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };

export function signSession(userId: number): string {
  return jwt.sign({ uid: userId }, config.jwtSecret, { expiresIn: '7d' });
}

export function setSessionCookie(res: Response, userId: number) {
  res.cookie(COOKIE, signSession(userId), {
    httpOnly: true,
    sameSite: config.crossSiteCookies ? 'none' : 'lax',
    secure: config.crossSiteCookies,
    maxAge: 7 * 24 * 3600 * 1000,
  });
}

export const requireAuth: RequestHandler = wrap(async (req, res, next) => {
  // Dev-only escape hatch for Postman / load test (disabled unless DEV_API_KEY is set)
  if (config.devApiKey && req.header('x-api-key') === config.devApiKey) {
    const { rows } = await pool.query(
      `INSERT INTO users (google_id, email, name) VALUES ('dev-user','dev@local','Dev User')
       ON CONFLICT (google_id) DO UPDATE SET email = EXCLUDED.email RETURNING id`,
    );
    req.userId = rows[0].id;
    return next();
  }
  const token = req.cookies?.[COOKIE];
  if (!token) return res.status(401).json({ error: 'Not signed in' });
  try {
    const payload = jwt.verify(token, config.jwtSecret) as { uid: number };
    req.userId = payload.uid;
    next();
  } catch {
    res.status(401).json({ error: 'Session expired, sign in again' });
  }
});
