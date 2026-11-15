# Email Job Scheduler (BullMQ + Redis + Postgres)

Full-stack scheduler that accepts email send requests, schedules them with **BullMQ delayed jobs** (no cron),
sends through **Ethereal SMTP**, survives restarts without duplicates, enforces **concurrency, per-send delay and
hourly rate limits**, alerts **Slack** when a limit is hit, and ships a **React dashboard** with Google login.

| Layer | Stack |
|---|---|
| Backend | TypeScript, Express, BullMQ, ioredis, Postgres (`pg`), Nodemailer (Ethereal), Elasticsearch, bull-board |
| Frontend | React 19 + Vite, TypeScript, Tailwind CSS v4, React Router |
| Infra | Docker Compose: Postgres 16, Redis 7 (AOF on), Elasticsearch 8 |

---

## 1. Run it locally

**Prerequisites:** Node 20+, Docker.

```bash
# 1) infra
docker compose up -d            # postgres :5432, redis :6379, elasticsearch :9200

# 2) backend
cd backend
cp .env.example .env            # fill in the Google (and Slack) values, see sections 2 and 3
npm install
npm run dev                     # API + embedded worker on http://localhost:4000

# 3) frontend (new terminal)
cd frontend
npm install
npm run dev                     # http://localhost:5173
```

Optional: run the worker as a separate process (this is how you would scale it):

```bash
RUN_WORKER=false npm run dev    # API only
npm run worker                  # one or more worker processes
```

Queue dashboard (live): **http://localhost:4000/admin/queues** (set `BULL_BOARD_USER` / `BULL_BOARD_PASS` for basic auth).

### Ethereal Email setup
Nothing to do by hand. On first boot the backend calls `nodemailer.createTestAccount()` `SENDER_COUNT` times
(default 3) and stores the accounts in the `senders` table, so there are **multiple senders** and they persist.
Every sent email stores its Ethereal preview URL, shown as **Open in Ethereal** in the Sent tab.
(Needs internet access to `api.ethereal.email` once.)

## 2. Google login (real OAuth)
1. Google Cloud Console, then APIs & Services, Credentials, **Create OAuth client ID** (Web application).
2. Authorized redirect URI: `http://localhost:4000/auth/google/callback`
3. Put the values in `backend/.env` as `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`.

Flow: `/auth/google` redirects to Google, the callback exchanges the code, verifies the ID token, upserts the user and
sets an httpOnly JWT cookie, then redirects to `/dashboard`. The header shows name, email, avatar and a Log out button.

## 3. Slack alerts (real OAuth)
1. Create an app at api.slack.com/apps, then OAuth & Permissions, scope **`incoming-webhook`**.
2. Slack requires an **HTTPS** redirect URL, so locally run `ngrok http 4000` and add
   `https://<id>.ngrok-free.app/auth/slack/callback` as a redirect URL.
3. In `backend/.env` set `SLACK_CLIENT_ID`, `SLACK_CLIENT_SECRET`, `SLACK_REDIRECT_URI` (the same ngrok URL).
4. In the dashboard click **Connect Slack**, pick a channel, done. **Send test** posts a live message.

Behaviour: the webhook URL is stored per user. When a sender hits its limit, a real message is posted to that
user's channel (once per sender per window). If Slack is not connected the alert is skipped silently; connecting
later works immediately, no redeploy. Disconnect removes the stored webhook.

---

## 4. Architecture

```
Browser ──> Express API ──> Postgres (source of truth: every email + status)
                │
                └─> BullMQ queue (Redis, AOF) ──> Worker(s) ──> Ethereal SMTP
                                                     │
                                       Redis counters (rate limit) ──> Slack webhook
                                                     └─> Elasticsearch (searchable index)
```

### How scheduling works
`POST /api/emails/schedule` takes subject, body, recipients, start time, delay (s) and hourly limit. For recipient `i`
the send time is `start + i * delay`. In one go the API (1) bulk-inserts all rows in Postgres, (2) adds one **BullMQ
delayed job per email** with `delay = sendTime - now` and `jobId = emailId`, (3) indexes them in Elasticsearch.
Senders are assigned round-robin. There is **no cron anywhere**.

### How persistence on restart works
- Delayed jobs live in **Redis**, which runs with AOF persistence, so the schedule is not in process memory.
- Postgres holds the status of every email. On boot `reconcileJobs()` re-creates any `scheduled` email whose job is
  missing (for example Redis was wiped, or the API crashed between DB insert and enqueue). Existing jobs are untouched,
  so nothing restarts from scratch.
- Shutdown is graceful (`SIGTERM` waits for in-flight sends).
- Tested: schedule 5 emails 25 s out, kill the API, restart, all 5 delivered exactly once.

### Idempotency (no double sends)
1. `jobId = emailId`: BullMQ refuses a second job with the same id.
2. The worker first runs an **atomic claim**: `UPDATE emails SET status='processing' WHERE id=$1 AND status='scheduled' RETURNING *`.
   Only one worker can win; every other attempt gets zero rows and skips.
3. A `processing` row older than 2 minutes (crashed worker) can be re-claimed.

### Concurrency
`WORKER_CONCURRENCY` (default 5) jobs run in parallel per worker process; you can run many processes. Safety comes
from the atomic DB claim and the atomic Redis limiter below.

### Delay between emails
`MIN_DELAY_BETWEEN_EMAILS_MS` (**default 2000 = min 2 seconds between sends**) is applied with BullMQ's **worker
limiter** (`max: 1, duration: minDelay`), which is global across all workers on the queue. The per-batch "delay between
emails" from the compose form controls the scheduled spacing on top of that.

### Hourly rate limit
- Limit = `min(form hourly limit, MAX_EMAILS_PER_HOUR_PER_SENDER)`, **per sender**. All values come from env or the form.
- Counter key: `rl:sender:<senderId>:<windowStart>` in Redis, updated by a **Lua script** that increments only if
  under the limit, so it is atomic across any number of workers or instances (no in-memory counts).
- When the limit is hit the job is **not dropped or failed**: the DB row is moved to the next window and the same job
  is pushed there with `job.moveToDelayed(nextWindowStart + seq % 1000ms)`. The `seq` offset keeps the original order
  roughly intact. A Slack alert is sent once per sender per window.
- If a send fails after taking a slot, the slot is released. Failed sends retry 3 times with exponential backoff,
  then become `failed`.
- `RATE_WINDOW_SECONDS` (default 3600) only exists so the demo can show a window rolling over in seconds.

### Behaviour under load (1000+ emails at the same time)
All 1000+ rows are inserted and enqueued in bulk (one SQL statement, `addBulk`). Because the limiter allows one send
per 2 s and each sender can do only N per hour, the worker never bursts: jobs beyond the limit are rolled into later
windows, in order, without loss or duplicates. Try it: set `DEV_API_KEY` in `.env`, then `npm run load-test -- 1200`.
Smoke test result (30 emails due at once, limit 5 per sender, 3 senders): first window sent 15, Slack alert fired, the
rest rolled forward, final result 30 sent and exactly 30 SMTP deliveries.

### Search
Every email is indexed in Elasticsearch on schedule and re-indexed on every status change. The dashboard search box
calls `GET /api/emails/search?q=` (fuzzy match on email, subject, body). If Elasticsearch is down, the app still works
and search returns a clear 503.

---

## 5. API

| Method | Path | Notes |
|---|---|---|
| GET | `/auth/google`, `/auth/google/callback` | Google OAuth |
| GET | `/api/me`, POST `/api/auth/logout` | session |
| POST | `/api/emails/schedule` | `{subject, body, recipients[], startTime, delaySeconds, hourlyLimit}` |
| GET | `/api/emails?status=scheduled\|sent` | list (sent includes failed) |
| GET | `/api/emails/counts`, `/api/emails/search?q=&status=`, `/api/emails/senders`, `/api/emails/:id` | tab counts, search, sender list, single email |
| GET | `/api/slack/connect-url`, `/auth/slack/callback` | Slack OAuth |
| GET / POST / DELETE | `/api/slack`, `/api/slack/test` | status, test message, disconnect |
| GET | `/admin/queues` | live BullMQ dashboard |

Postman: set `DEV_API_KEY` and send header `x-api-key: <value>` (dev only, disabled when unset).

## 6. Features implemented

**Backend:** scheduler (BullMQ delayed jobs, no cron) · Postgres persistence · restart-safe + reconcile on boot ·
idempotency · multi-sender Ethereal SMTP · configurable concurrency · min delay between sends · Redis-backed hourly
limit with next-window rescheduling · Slack OAuth + live rate-limit alert · Elasticsearch indexing and search ·
bull-board dashboard · Google OAuth · retries with backoff · Docker Compose.

**Frontend:** real Google login · sidebar with name, email, avatar and logout · Scheduled and Sent views with counts ·
full-page Compose (rich-text body, CSV/txt upload with detected-email count and recipient chips, delay, hourly limit,
Send Later popover for start time) · email detail view · list rows with email, subject, time and status ·
loading, empty and error states · toasts · live polling · Elasticsearch search · Connect Slack card · reusable UI
components (`Button`, `Field`, `StateMessage`, `StatusBadge`, `Toast`, `RichTextEditor`) and a typed API layer.

## 7. Extras beyond the brief
- **Cancel a scheduled email** (detail view, `POST /api/emails/:id/cancel`): atomic DB status change plus BullMQ job
  removal; the worker's claim guard makes it safe even if the job is already about to run. Cancelled emails are hidden
  from both tabs.
- **Personalization**: `{{name}}` (part before the @) and `{{email}}` in subject and body are filled per recipient at send time.
- **Rich-text composer** with sanitized HTML rendering, recipient chips and a Send Later popover (as in the Figma).
- **Elasticsearch-powered search** box with fuzzy matching, debounced in the UI.
- **Send preview links**: every sent email stores its Ethereal preview URL.
- **Graceful shutdown**, **boot-time reconcile** of missing jobs, and optional **separate worker process**.
- **Dockerfile** for the backend, **GitHub Actions CI** (typecheck + builds), `x-api-key` dev access and a `load-test` script.

## 8. Assumptions, shortcuts, trade-offs
- UI follows the provided Figma: centered Google login card, sidebar inbox (user card, Compose, Scheduled/Sent with
  counts), row list with orange schedule-time pills, full-page Compose with a "Send Later" popover and a rich-text
  editor, and an email detail view. The email/password fields in the Figma login are left out because the assignment
  requires Google OAuth; logo text and exact pixel spacing are approximations of the Figma.
- Delivery is at-least-once in one narrow case: if a worker dies after SMTP accepted the mail but before the DB
  update, the row is re-claimed after 2 minutes. True exactly-once is not possible with SMTP.
- The limit window is a fixed (not sliding) window, simple and atomic, at the cost of allowing a burst across a boundary.
- Ethereal accepts mail but never delivers it; use the preview link.
- Sender accounts are shared by all users (a demo simplification); emails, Slack and sessions are per user.
- `/admin/queues` is open unless basic-auth env vars are set.
- Polling every 5 s instead of websockets.

## 9. Deploying (for the "Hosted Assignment" link)
Frontend: Vercel/Netlify (`VITE_API_URL=https://<backend>`). Backend: Render/Railway/Fly (`npm run build && npm start`)
with managed Postgres (Neon/Supabase), Redis (Upstash needs `maxmemory-policy noeviction`; Redis Cloud/Railway work),
and optionally Elastic Cloud/Bonsai. Set `COOKIE_CROSS_SITE=true`, `FRONTEND_URL`, `BACKEND_URL`, and add the hosted
callback URLs to the Google and Slack apps.
