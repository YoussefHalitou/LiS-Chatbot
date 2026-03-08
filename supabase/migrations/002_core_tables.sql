-- Migration: Core tables (t_projects, t_employees, t_users)
-- These are the foundational tables referenced by most other tables.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── t_projects ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS t_projects (
  project_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_code TEXT UNIQUE,
  name TEXT NOT NULL,
  customer_name TEXT,
  customer_email TEXT,
  customer_phone TEXT,
  strasse TEXT,
  nr TEXT,
  plz TEXT,
  stadt TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'In Planung',
  dienstleistungen TEXT,
  project_date DATE,
  project_time TIME,
  offer_type TEXT,
  project_start_date DATE,
  project_end_date DATE,
  besichtigung BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_t_projects_code ON t_projects(project_code);
CREATE INDEX IF NOT EXISTS idx_t_projects_date ON t_projects(project_date);
CREATE INDEX IF NOT EXISTS idx_t_projects_status ON t_projects(status);
CREATE INDEX IF NOT EXISTS idx_t_projects_name ON t_projects(name);

-- ─── t_employees ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS t_employees (
  employee_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_code TEXT UNIQUE,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  role TEXT,
  contract_type TEXT,
  weekly_hours_contract NUMERIC,
  hourly_rate NUMERIC DEFAULT 0,
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_t_employees_active ON t_employees(is_active);
CREATE INDEX IF NOT EXISTS idx_t_employees_name ON t_employees(name);

-- ─── t_users (RBAC) ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS t_users (
  user_id UUID PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('Admin', 'Secretary', 'Planner', 'Supervisor', 'Worker')),
  user_type TEXT CHECK (user_type IN ('office', 'field')),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-update updated_at triggers
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_t_projects_updated_at') THEN
    CREATE TRIGGER update_t_projects_updated_at
      BEFORE UPDATE ON t_projects FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_t_employees_updated_at') THEN
    CREATE TRIGGER update_t_employees_updated_at
      BEFORE UPDATE ON t_employees FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_t_users_updated_at') THEN
    CREATE TRIGGER update_t_users_updated_at
      BEFORE UPDATE ON t_users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;
