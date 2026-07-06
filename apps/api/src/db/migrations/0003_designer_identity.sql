-- 0003_designer_identity.sql — identificación profesional del proyectista eléctrico,
-- persistida en la cuenta para reutilizarse en la portada de todos los informes PDF
-- (título profesional, licencia/registro, empresa y logo como data URL PNG/JPEG).

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS designer_title TEXT,
  ADD COLUMN IF NOT EXISTS designer_license TEXT,
  ADD COLUMN IF NOT EXISTS designer_company TEXT,
  ADD COLUMN IF NOT EXISTS designer_logo TEXT;
