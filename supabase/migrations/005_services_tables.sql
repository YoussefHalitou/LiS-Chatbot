-- Migration: Services tables (t_services, t_service_prices)

-- ─── t_services ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS t_services (
  service_id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  default_unit TEXT,
  category TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── t_service_prices ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS t_service_prices (
  price_id TEXT PRIMARY KEY,
  service_id TEXT NOT NULL REFERENCES t_services(service_id) ON DELETE CASCADE,
  supplier TEXT,
  unit TEXT,
  cost_per_unit NUMERIC,
  customer_price_per_unit NUMERIC
);

CREATE INDEX IF NOT EXISTS idx_t_service_prices_service ON t_service_prices(service_id);

-- Trigger
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_t_services_updated_at') THEN
    CREATE TRIGGER update_t_services_updated_at
      BEFORE UPDATE ON t_services FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;
