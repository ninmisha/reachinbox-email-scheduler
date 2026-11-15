import { Pool } from 'pg';
import { config } from './config';

export const pool = new Pool({ connectionString: config.databaseUrl, max: 20 });

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id          SERIAL PRIMARY KEY,
  google_id   TEXT UNIQUE,
  password_hash TEXT,
  email       TEXT NOT NULL,
  name        TEXT,
  avatar      TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS senders (
  id          SERIAL PRIMARY KEY,
  email       TEXT UNIQUE NOT NULL,
  smtp_host   TEXT NOT NULL,
  smtp_port   INT  NOT NULL,
  smtp_user   TEXT NOT NULL,
  smtp_pass   TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS emails (
  id            UUID PRIMARY KEY,
  seq           BIGSERIAL,
  user_id       INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  sender_id     INT NOT NULL REFERENCES senders(id),
  batch_id      UUID NOT NULL,
  to_email      TEXT NOT NULL,
  subject       TEXT NOT NULL,
  body          TEXT NOT NULL,
  scheduled_at  TIMESTAMPTZ NOT NULL,
  sent_at       TIMESTAMPTZ,
  status        TEXT NOT NULL DEFAULT 'scheduled'
                CHECK (status IN ('scheduled','processing','sent','failed','cancelled')),
  hourly_limit  INT NOT NULL,
  message_id    TEXT,
  preview_url   TEXT,
  error         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS emails_user_status_idx ON emails (user_id, status, scheduled_at);
CREATE INDEX IF NOT EXISTS emails_status_idx ON emails (status, updated_at);

CREATE TABLE IF NOT EXISTS slack_connections (
  user_id       INT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  webhook_url   TEXT NOT NULL,
  channel       TEXT,
  team          TEXT,
  connected_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
`;

const MIGRATIONS = `
ALTER TABLE users ALTER COLUMN google_id DROP NOT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT;
`;

export async function initDb(): Promise<void> {
  await pool.query(SCHEMA);
  await pool.query(MIGRATIONS);
}
