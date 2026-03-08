-- Migration: Financial tables
-- Project costs, disposal costs, discounts, vehicle costs, material usage.

-- ─── t_project_costs_extra ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS t_project_costs_extra (
  cost_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES t_projects(project_id) ON DELETE CASCADE,
  cost_type TEXT,
  description TEXT,
  cost NUMERIC,
  phase TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_t_project_costs_extra_project ON t_project_costs_extra(project_id);

-- ─── t_disposal_costs ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS t_disposal_costs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES t_projects(project_id) ON DELETE CASCADE,
  waste_type TEXT,
  used_unit NUMERIC,
  cost_per_unit NUMERIC,
  total_cost NUMERIC GENERATED ALWAYS AS (COALESCE(used_unit, 0) * COALESCE(cost_per_unit, 0)) STORED,
  phase TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── t_project_discounts ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS t_project_discounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES t_projects(project_id) ON DELETE CASCADE,
  target TEXT,
  mode TEXT, -- 'flat' or 'percent'
  value NUMERIC,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── t_project_vehicle_costs ────────────────────────────────────
CREATE TABLE IF NOT EXISTS t_project_vehicle_costs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES t_projects(project_id) ON DELETE CASCADE,
  vehicle_id TEXT REFERENCES t_vehicles(vehicle_id) ON DELETE SET NULL,
  cost_per_unit NUMERIC,
  price_per_unit NUMERIC,
  quantity NUMERIC,
  phase TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── t_project_material_usage ───────────────────────────────────
CREATE TABLE IF NOT EXISTS t_project_material_usage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES t_projects(project_id) ON DELETE CASCADE,
  material_id TEXT REFERENCES t_materials(material_id) ON DELETE SET NULL,
  quantity NUMERIC NOT NULL DEFAULT 1,
  phase TEXT NOT NULL DEFAULT 'Nachkalkulation',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── t_project_note_media ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS t_project_note_media (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES t_projects(project_id) ON DELETE CASCADE,
  field_key TEXT,
  mode TEXT,
  text_value TEXT,
  image_base64 TEXT, -- legacy
  created_at TIMESTAMPTZ DEFAULT NOW()
);
