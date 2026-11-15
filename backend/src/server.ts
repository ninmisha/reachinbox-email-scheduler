import express, { NextFunction, Request, Response } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';
import { ZodError } from 'zod';
import { config } from './config';
import { emailQueue } from './queue';
import authRoutes from './routes/auth';
import emailRoutes from './routes/emails';
import slackRoutes from './routes/slack';

export function createServer() {
  const app = express();
  app.use(cors({ origin: config.frontendUrl, credentials: true }));
  app.use(express.json({ limit: '5mb' }));
  app.use(cookieParser());

  app.get('/health', (_req, res) => res.json({ ok: true }));

  // Live BullMQ dashboard (optional basic auth)
  const board = new ExpressAdapter();
  board.setBasePath('/admin/queues');
  createBullBoard({ queues: [new BullMQAdapter(emailQueue)], serverAdapter: board });
  app.use('/admin/queues', (req: Request, res: Response, next: NextFunction) => {
    const { user, pass } = config.bullBoard;
    if (!user) return next();
    const [u, p] = Buffer.from((req.headers.authorization ?? '').split(' ')[1] ?? '', 'base64').toString().split(':');
    if (u === user && p === pass) return next();
    res.set('WWW-Authenticate', 'Basic realm="queues"').status(401).send('Auth required');
  });
  app.use('/admin/queues', board.getRouter());

  app.use(authRoutes);
  app.use(emailRoutes);
  app.use(slackRoutes);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof ZodError) {
      return res.status(400).json({ error: err.issues.map((i) => i.message).join('; ') });
    }
    console.error('[error]', err);
    res.status(500).json({ error: 'Something went wrong. Try again.' });
  });
  return app;
}
