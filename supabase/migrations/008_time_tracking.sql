-- Migration: Time tracking, abnahme, worker ratings, and contacts

-- ─── t_time_pairs ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS t_time_pairs (
  id SERIAL PRIMARY KEY,
  pair_id TEXT UNIQUE,
  project_id UUID REFERENCES t_projects(project_id) ON DELETE SET NULL,
  datum DATE,
  mitarbeiter TEXT, -- snapshot name
  lis_von TIME,
  lis_bis TIME,
  kunde_von TIME,
  kunde_bis TIME,
  pause_min INTEGER NOT NULL DEFAULT 0,
  ges_lis_h NUMERIC GENERATED ALWAYS AS (
    CASE
      WHEN lis_von IS NOT NULL AND lis_bis IS NOT NULL THEN
        EXTRACT(EPOCH FROM (lis_bis - lis_von)) / 3600.0 - COALESCE(pause_min, 0) / 60.0
      ELSE NULL
    END
  ) STORED,
  ges_kd_h NUMERIC GENERATED ALWAYS AS (
    CASE
      WHEN kunde_von IS NOT NULL AND kunde_bis IS NOT NULL THEN
        EXTRACT(EPOCH FROM (kunde_bis - kunde_von)) / 3600.0 - COALESCE(pause_min, 0) / 60.0
      ELSE NULL
    END
  ) STORED,
  employee_id UUID REFERENCES t_employees(employee_id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_t_time_pairs_project ON t_time_pairs(project_id);
CREATE INDEX IF NOT EXISTS idx_t_time_pairs_employee ON t_time_pairs(employee_id);
CREATE INDEX IF NOT EXISTS idx_t_time_pairs_datum ON t_time_pairs(datum);

-- ─── t_abnahmen ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS t_abnahmen (
  abnahme_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES t_projects(project_id) ON DELETE SET NULL,
  plan_id UUID REFERENCES t_morningplan(plan_id) ON DELETE SET NULL,
  datum DATE,
  -- Note: t_abnahmen has many additional columns (billing fields, onsite times,
  -- boolean flags, material/moving-supply counters mv_*, mat_*).
  -- These should be added as needed based on the actual production schema.
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── t_worker_ratings ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS t_worker_ratings (
  rating_id TEXT PRIMARY KEY,
  project_id UUID REFERENCES t_projects(project_id) ON DELETE SET NULL,
  plan_id UUID REFERENCES t_morningplan(plan_id) ON DELETE SET NULL,
  employee_id TEXT, -- text, not FK
  employee_name TEXT,
  datum DATE,
  rating INTEGER CHECK (rating >= 1 AND rating <= 10),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── contacts (CRM) ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS contacts (
  id SERIAL PRIMARY KEY,
  lexware_id TEXT UNIQUE,
  name TEXT,
  anrede TEXT,
  notes TEXT,
  version INTEGER,
  created_date DATE,
  updated_date DATE,
  synced_at TIMESTAMPTZ,
  organization_id TEXT,
  kundennummer TEXT,
  lieferantennummer TEXT,
  firma TEXT,
  strasse TEXT,
  nr TEXT,
  plz TEXT,
  stadt TEXT,
  email TEXT,
  phone TEXT,
  archived BOOLEAN DEFAULT FALSE
);

-- ─── Staging tables ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tmp_employees (
  name TEXT,
  role TEXT,
  contract_type TEXT,
  hourly_rate NUMERIC,
  notes TEXT
);

CREATE TABLE IF NOT EXISTS tmp_projects (
  name TEXT,
  stadt TEXT,
  status TEXT,
  notes TEXT
);

-- Triggers
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_t_time_pairs_updated_at') THEN
    CREATE TRIGGER update_t_time_pairs_updated_at
      BEFORE UPDATE ON t_time_pairs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_t_abnahmen_updated_at') THEN
    CREATE TRIGGER update_t_abnahmen_updated_at
      BEFORE UPDATE ON t_abnahmen FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;
