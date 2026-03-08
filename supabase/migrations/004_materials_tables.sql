-- Migration: Materials tables (t_materials, t_material_prices, t_material_price_history)

-- ─── t_materials ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS t_materials (
  material_id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  unit TEXT,
  category TEXT,
  vat_rate NUMERIC NOT NULL DEFAULT 19.00,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  default_quantity NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── t_material_prices ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS t_material_prices (
  material_id TEXT PRIMARY KEY REFERENCES t_materials(material_id) ON DELETE CASCADE,
  cost_per_unit NUMERIC,
  price_per_unit NUMERIC,
  currency TEXT NOT NULL DEFAULT 'EUR',
  updated_by UUID,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── t_material_price_history ───────────────────────────────────
CREATE TABLE IF NOT EXISTS t_material_price_history (
  hist_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  material_id TEXT NOT NULL REFERENCES t_materials(material_id) ON DELETE CASCADE,
  old_price NUMERIC,
  new_price NUMERIC,
  changed_at TIMESTAMPTZ DEFAULT NOW(),
  changed_by UUID
);

CREATE INDEX IF NOT EXISTS idx_t_material_price_history_material ON t_material_price_history(material_id);

-- Trigger
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_t_materials_updated_at') THEN
    CREATE TRIGGER update_t_materials_updated_at
      BEFORE UPDATE ON t_materials FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;
