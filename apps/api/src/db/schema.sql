-- GroundDesing Pro — PostgreSQL schema
-- Run once: psql -U postgres -d grounddesing -f schema.sql

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS users (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email       TEXT NOT NULL UNIQUE,
  name        TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  plan               TEXT NOT NULL DEFAULT 'community' CHECK (plan IN ('community','individual','professional')),
  stripe_customer_id TEXT UNIQUE,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS projects (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  description TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS calc_results (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  module      TEXT NOT NULL,   -- 'wenner' | 'schlumberger' | 'grid' | 'conductor' | 'voltages' | 'gel'
  inputs      JSONB NOT NULL,
  outputs     JSONB NOT NULL,
  norm        TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '1 hour'),
  used_at    TIMESTAMPTZ
);

-- Estadísticas agregadas del motor de optimización (bandit UCB1) — aprendizaje
-- propio sobre qué acción de optimización resulta más efectiva por módulo,
-- construido enteramente a partir del uso real del sistema (sin IA/API externa).
CREATE TABLE IF NOT EXISTS optimization_stats (
  module      TEXT NOT NULL,
  action_kind TEXT NOT NULL,
  n           INTEGER NOT NULL DEFAULT 0,
  mean_reward DOUBLE PRECISION NOT NULL DEFAULT 0,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (module, action_kind)
);

CREATE INDEX IF NOT EXISTS idx_projects_user   ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_results_project ON calc_results(project_id);
CREATE INDEX IF NOT EXISTS idx_results_module  ON calc_results(module);
CREATE INDEX IF NOT EXISTS idx_prt_token       ON password_reset_tokens(token_hash);
