-- 0002_user_normative_prefs.sql — asocia país y perfil normativo a la cuenta,
-- para que la referencia normativa (nacional + internacional madre IEEE 80/81)
-- viaje con el usuario en vez de depender solo de localStorage por navegador.

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS country_code TEXT,
  ADD COLUMN IF NOT EXISTS normative_profile_id TEXT,
  ADD COLUMN IF NOT EXISTS rg_relaxed_conditions_met BOOLEAN NOT NULL DEFAULT false;
