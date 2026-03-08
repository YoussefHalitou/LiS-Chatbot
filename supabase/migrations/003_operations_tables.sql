-- Migration: Operations tables (t_morningplan, t_morningplan_staff, t_vehicles)
-- Morning plan and vehicle management.

-- ─── t_vehicles ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS t_vehicles (
  vehicle_id TEXT PRIMARY KEY,
  nickname TEXT,
  unit TEXT NOT NULL DEFAULT 'Tag',
  status TEXT NOT NULL DEFAULT 'bereit',
  inhalt TEXT,
  notes TEXT,
  is_deleted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── t_morningplan ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS t_morningplan (
  plan_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  plan_date DATE NOT NULL,
  project_id UUID REFERENCES t_projects(project_id) ON DELETE SET NULL,
  vehicle_id TEXT REFERENCES t_vehicles(vehicle_id) ON DELETE SET NULL,
  start_time TIME,
  service_type TEXT,
  notes TEXT,
  angebotsart TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_t_morningplan_date ON t_morningplan(plan_date);
CREATE INDEX IF NOT EXISTS idx_t_morningplan_project ON t_morningplan(project_id);

-- ─── t_morningplan_staff ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS t_morningplan_staff (
  id BIGSERIAL PRIMARY KEY,
  plan_id UUID NOT NULL REFERENCES t_morningplan(plan_id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES t_employees(employee_id) ON DELETE CASCADE,
  role TEXT,
  individual_start_time TIME,
  member_notes TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_t_morningplan_staff_plan ON t_morningplan_staff(plan_id);
CREATE INDEX IF NOT EXISTS idx_t_morningplan_staff_employee ON t_morningplan_staff(employee_id);

-- ─── t_vehicle_rates ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS t_vehicle_rates (
  vehicle_id TEXT PRIMARY KEY REFERENCES t_vehicles(vehicle_id) ON DELETE CASCADE,
  cost_per_unit NUMERIC,
  gas_cost_per_unit NUMERIC,
  price_per_unit NUMERIC,
  gas_price_per_unit NUMERIC,
  currency TEXT DEFAULT 'EUR',
  updated_by UUID,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  total_cost_per_unit NUMERIC GENERATED ALWAYS AS (COALESCE(cost_per_unit, 0) + COALESCE(gas_cost_per_unit, 0)) STORED,
  total_price_per_unit NUMERIC GENERATED ALWAYS AS (COALESCE(price_per_unit, 0) + COALESCE(gas_price_per_unit, 0)) STORED
);

-- ─── t_vehicle_inventory ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS t_vehicle_inventory (
  id SERIAL PRIMARY KEY,
  vehicle_id TEXT NOT NULL REFERENCES t_vehicles(vehicle_id) ON DELETE CASCADE,
  inventory_date DATE,
  contents TEXT,
  reported_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── t_vehicle_daily_status ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS t_vehicle_daily_status (
  id SERIAL PRIMARY KEY,
  vehicle_name TEXT,
  status TEXT,
  informationen TEXT,
  plan_date DATE,
  vehicle_id TEXT REFERENCES t_vehicles(vehicle_id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── t_employee_rate_history ────────────────────────────────────
CREATE TABLE IF NOT EXISTS t_employee_rate_history (
  hist_id BIGSERIAL PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES t_employees(employee_id) ON DELETE CASCADE,
  old_hourly_rate NUMERIC,
  new_hourly_rate NUMERIC,
  changed_at TIMESTAMPTZ DEFAULT NOW(),
  changed_by UUID
);

-- Triggers
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_t_vehicles_updated_at') THEN
    CREATE TRIGGER update_t_vehicles_updated_at
      BEFORE UPDATE ON t_vehicles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_t_morningplan_updated_at') THEN
    CREATE TRIGGER update_t_morningplan_updated_at
      BEFORE UPDATE ON t_morningplan FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;
