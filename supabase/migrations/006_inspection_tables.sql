-- Migration: Inspection tables
-- t_inspections and all child tables for rooms, items, photos, signatures, calculations, discounts.

-- ─── t_inspections ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS t_inspections (
  inspection_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES t_projects(project_id) ON DELETE SET NULL,
  customer_name TEXT,
  customer_email TEXT,
  customer_phone TEXT,
  strasse TEXT,
  nr TEXT,
  plz TEXT,
  stadt TEXT,
  appointment_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'Geplant',
  notes TEXT,
  ziel_strasse TEXT,
  ziel_nr TEXT,
  ziel_plz TEXT,
  ziel_stadt TEXT,
  etage TEXT,
  hvz TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_t_inspections_project ON t_inspections(project_id);
CREATE INDEX IF NOT EXISTS idx_t_inspections_status ON t_inspections(status);

-- ─── t_inspection_items ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS t_inspection_items (
  id BIGSERIAL PRIMARY KEY,
  inspection_id UUID NOT NULL REFERENCES t_inspections(inspection_id) ON DELETE CASCADE,
  room TEXT,
  notes TEXT,
  volume_m3 NUMERIC,
  persons INTEGER,
  hours NUMERIC,
  sum_hours NUMERIC GENERATED ALWAYS AS (COALESCE(persons, 0) * COALESCE(hours, 0)) STORED,
  entsorgungskosten NUMERIC,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_t_inspection_items_inspection ON t_inspection_items(inspection_id);

-- ─── t_inspection_room_items ────────────────────────────────────
CREATE TABLE IF NOT EXISTS t_inspection_room_items (
  id SERIAL PRIMARY KEY,
  inspection_id UUID NOT NULL REFERENCES t_inspections(inspection_id) ON DELETE CASCADE,
  room_id INTEGER, -- references t_inspection_items.id
  item_name TEXT,
  quantity INTEGER NOT NULL DEFAULT 1,
  montage_option TEXT NOT NULL DEFAULT 'Keine',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── t_inspection_photos ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS t_inspection_photos (
  id BIGSERIAL PRIMARY KEY,
  inspection_id UUID NOT NULL REFERENCES t_inspections(inspection_id) ON DELETE CASCADE,
  url TEXT,
  caption TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── t_inspection_signatures ────────────────────────────────────
CREATE TABLE IF NOT EXISTS t_inspection_signatures (
  id BIGSERIAL PRIMARY KEY,
  inspection_id UUID NOT NULL REFERENCES t_inspections(inspection_id) ON DELETE CASCADE,
  signer_name TEXT,
  signed_at TIMESTAMPTZ,
  signature_data TEXT
);

-- ─── t_inspection_calc_items ────────────────────────────────────
CREATE TABLE IF NOT EXISTS t_inspection_calc_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  inspection_id UUID NOT NULL REFERENCES t_inspections(inspection_id) ON DELETE CASCADE,
  source_item_id BIGINT REFERENCES t_inspection_items(id) ON DELETE SET NULL,
  kind TEXT, -- 'material', 'service', 'labour'
  position_label TEXT,
  qty NUMERIC NOT NULL DEFAULT 1,
  unit TEXT,
  unit_price NUMERIC NOT NULL DEFAULT 0,
  line_total NUMERIC GENERATED ALWAYS AS (COALESCE(qty, 0) * COALESCE(unit_price, 0)) STORED,
  sort_order INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── t_inspection_discounts ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS t_inspection_discounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  inspection_id UUID NOT NULL REFERENCES t_inspections(inspection_id) ON DELETE CASCADE,
  mode TEXT,
  value NUMERIC,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_t_inspections_updated_at') THEN
    CREATE TRIGGER update_t_inspections_updated_at
      BEFORE UPDATE ON t_inspections FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;
