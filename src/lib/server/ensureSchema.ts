import { getPool, resolveDatabaseUrl } from "@/db";

let started: Promise<void> | null = null;

const BOOTSTRAP = `
CREATE TABLE IF NOT EXISTS brand (
  id integer PRIMARY KEY,
  name text NOT NULL DEFAULT 'Act of Faith Chapel International',
  tagline text NOT NULL DEFAULT 'Live Streaming',
  admin_pin_hash text,
  admin_pin_salt text,
  admin_pin_updated_at timestamptz,
  logo_mime text,
  logo_data bytea,
  logo_version integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS streams (
  id serial PRIMARY KEY,
  code text NOT NULL,
  title text NOT NULL,
  host_name text NOT NULL,
  mode text NOT NULL DEFAULT 'video',
  status text NOT NULL DEFAULT 'live',
  phase text NOT NULL DEFAULT 'prelive',
  tagline text,
  scheduled_for text,
  cover_version integer NOT NULL DEFAULT 0,
  started_at timestamptz,
  sim_enabled boolean NOT NULL DEFAULT false,
  sim_focus text NOT NULL DEFAULT 'auto',
  sim_pace text NOT NULL DEFAULT 'normal',
  sim_context text,
  sim_transcript text,
  sim_next_at timestamptz,
  sim_count integer NOT NULL DEFAULT 0,
  sim_state jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz
);
CREATE UNIQUE INDEX IF NOT EXISTS streams_code_idx ON streams (code);

CREATE TABLE IF NOT EXISTS stream_covers (
  stream_id integer PRIMARY KEY REFERENCES streams(id) ON DELETE CASCADE,
  mime text NOT NULL,
  data bytea NOT NULL,
  width integer NOT NULL DEFAULT 0,
  height integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS participants (
  id serial PRIMARY KEY,
  stream_id integer NOT NULL REFERENCES streams(id) ON DELETE CASCADE,
  name text NOT NULL,
  token text NOT NULL,
  role text NOT NULL DEFAULT 'viewer',
  media text NOT NULL DEFAULT 'none',
  request_state text NOT NULL DEFAULT 'none',
  requested_media text NOT NULL DEFAULT 'none',
  epoch integer NOT NULL DEFAULT 1,
  mic_on boolean NOT NULL DEFAULT true,
  cam_on boolean NOT NULL DEFAULT true,
  hand_raised boolean NOT NULL DEFAULT false,
  active boolean NOT NULL DEFAULT true,
  muted boolean NOT NULL DEFAULT false,
  command jsonb,
  command_seq integer NOT NULL DEFAULT 0,
  device_info jsonb,
  photo_mime text,
  photo_data bytea,
  photo_version integer NOT NULL DEFAULT 0,
  joined_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS participants_stream_idx ON participants (stream_id);
CREATE UNIQUE INDEX IF NOT EXISTS participants_token_idx ON participants (token);

CREATE TABLE IF NOT EXISTS messages (
  id serial PRIMARY KEY,
  stream_id integer NOT NULL REFERENCES streams(id) ON DELETE CASCADE,
  participant_id integer,
  name text NOT NULL,
  body text NOT NULL,
  kind text NOT NULL DEFAULT 'chat',
  origin text NOT NULL DEFAULT 'real',
  avatar text,
  meta jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS messages_stream_idx ON messages (stream_id, id);

CREATE TABLE IF NOT EXISTS sim_queue (
  id serial PRIMARY KEY,
  stream_id integer NOT NULL REFERENCES streams(id) ON DELETE CASCADE,
  name text NOT NULL,
  avatar text NOT NULL,
  body text NOT NULL,
  kind text NOT NULL DEFAULT 'chat',
  meta jsonb NOT NULL,
  deliver_at timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS sim_queue_due_idx ON sim_queue (stream_id, deliver_at);

CREATE TABLE IF NOT EXISTS signals (
  id serial PRIMARY KEY,
  stream_id integer NOT NULL REFERENCES streams(id) ON DELETE CASCADE,
  from_id integer NOT NULL,
  to_id integer NOT NULL,
  kind text NOT NULL,
  epoch integer NOT NULL DEFAULT 1,
  payload jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS signals_target_idx ON signals (stream_id, to_id);

CREATE TABLE IF NOT EXISTS offerings (
  id serial PRIMARY KEY,
  stream_id integer REFERENCES streams(id) ON DELETE SET NULL,
  stream_code text,
  giver_name text NOT NULL,
  email text NOT NULL,
  amount integer NOT NULL,
  currency text NOT NULL DEFAULT 'GHS',
  reference text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  paystack_id text,
  channel text,
  created_at timestamptz NOT NULL DEFAULT now(),
  paid_at timestamptz
);
CREATE UNIQUE INDEX IF NOT EXISTS offerings_reference_idx ON offerings (reference);
CREATE INDEX IF NOT EXISTS offerings_status_idx ON offerings (status, created_at);

CREATE TABLE IF NOT EXISTS ads (
  slot integer PRIMARY KEY,
  mime text NOT NULL,
  data bytea NOT NULL,
  version integer NOT NULL DEFAULT 1,
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO brand (id, name, tagline, logo_version, updated_at)
VALUES (1, 'Act of Faith Chapel International', 'Live Streaming', 0, now())
ON CONFLICT (id) DO NOTHING;
`;

const EXTRA_COLUMNS: [string, string][] = [
  ["brand", "admin_pin_hash text"],
  ["brand", "admin_pin_salt text"],
  ["brand", "admin_pin_updated_at timestamptz"],
  ["brand", "logo_mime text"],
  ["brand", "logo_data bytea"],
  ["brand", "home_banner_mime text"],
  ["brand", "home_banner_data bytea"],
  ["brand", "home_banner_version integer NOT NULL DEFAULT 0"],
  ["streams", "phase text NOT NULL DEFAULT 'prelive'"],
  ["streams", "tagline text"],
  ["streams", "scheduled_for text"],
  ["streams", "cover_version integer NOT NULL DEFAULT 0"],
  ["streams", "started_at timestamptz"],
  ["streams", "sim_enabled boolean NOT NULL DEFAULT false"],
  ["streams", "sim_focus text NOT NULL DEFAULT 'auto'"],
  ["streams", "sim_pace text NOT NULL DEFAULT 'normal'"],
  ["streams", "sim_context text"],
  ["streams", "sim_transcript text"],
  ["streams", "sim_next_at timestamptz"],
  ["streams", "sim_count integer NOT NULL DEFAULT 0"],
  ["streams", "sim_state jsonb NOT NULL DEFAULT '{}'::jsonb"],
  ["participants", "muted boolean NOT NULL DEFAULT false"],
  ["participants", "command jsonb"],
  ["participants", "command_seq integer NOT NULL DEFAULT 0"],
  ["participants", "device_info jsonb"],
  ["participants", "photo_mime text"],
  ["participants", "photo_data bytea"],
  ["participants", "photo_version integer NOT NULL DEFAULT 0"],
  ["messages", "origin text NOT NULL DEFAULT 'real'"],
  ["messages", "avatar text"],
  ["messages", "meta jsonb"],
];

export async function ensureSchema() {
  if (!resolveDatabaseUrl()) return;
  if (!started) {
    started = (async () => {
      const pool = getPool();
      await pool.query(BOOTSTRAP);
      for (const [table, column] of EXTRA_COLUMNS) {
        const name = column.split(/\s+/)[0];
        await pool.query(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS ${column}`).catch(() => undefined);
        void name;
      }
    })().catch((err) => {
      started = null;
      throw err;
    });
  }
  await started;
}
