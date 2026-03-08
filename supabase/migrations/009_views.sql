-- Migration: Database views
-- Pre-built views for common complex queries.

-- ─── v_morningplan_full ─────────────────────────────────────────
-- Complete morning plan view with ALL JOINs already done.
-- The most important view for planned projects.
CREATE OR REPLACE VIEW v_morningplan_full AS
SELECT
  mp.plan_id,
  mp.plan_date,
  mp.start_time,
  mp.service_type,
  mp.notes,
  mp.angebotsart,
  p.project_code,
  p.name    AS project_name,
  p.stadt   AS project_ort,
  v.nickname AS vehicle_nickname,
  v.status  AS vehicle_status,
  STRING_AGG(e.name, ', ' ORDER BY ms.sort_order) AS staff_list
FROM t_morningplan mp
LEFT JOIN t_projects p  ON p.project_id  = mp.project_id
LEFT JOIN t_vehicles v  ON v.vehicle_id  = mp.vehicle_id
LEFT JOIN t_morningplan_staff ms ON ms.plan_id = mp.plan_id
LEFT JOIN t_employees e ON e.employee_id = ms.employee_id
GROUP BY
  mp.plan_id, mp.plan_date, mp.start_time, mp.service_type,
  mp.notes, mp.angebotsart,
  p.project_code, p.name, p.stadt,
  v.nickname, v.status;

-- ─── v_project_full ─────────────────────────────────────────────
-- Complete project view with related data.
CREATE OR REPLACE VIEW v_project_full AS
SELECT
  p.*,
  COUNT(DISTINCT mp.plan_id) AS plan_count,
  COUNT(DISTINCT i.inspection_id) AS inspection_count
FROM t_projects p
LEFT JOIN t_morningplan mp ON mp.project_id = p.project_id
LEFT JOIN t_inspections i  ON i.project_id  = p.project_id
GROUP BY p.project_id;

-- ─── v_employee_kpi ─────────────────────────────────────────────
-- Employee KPIs and statistics.
CREATE OR REPLACE VIEW v_employee_kpi AS
SELECT
  e.employee_id,
  e.name,
  e.hourly_rate,
  e.contract_type,
  e.is_active,
  COUNT(DISTINCT ms.plan_id) AS total_assignments,
  COUNT(DISTINCT mp.plan_date) AS days_worked,
  COALESCE(SUM(tp.ges_lis_h), 0) AS total_lis_hours,
  COALESCE(SUM(tp.ges_kd_h), 0) AS total_kd_hours
FROM t_employees e
LEFT JOIN t_morningplan_staff ms ON ms.employee_id = e.employee_id
LEFT JOIN t_morningplan mp ON mp.plan_id = ms.plan_id
LEFT JOIN t_time_pairs tp ON tp.employee_id = e.employee_id
GROUP BY e.employee_id;

-- ─── v_project_profit ───────────────────────────────────────────
-- Project profitability calculations.
CREATE OR REPLACE VIEW v_project_profit AS
SELECT
  p.project_id,
  p.name,
  p.project_code,
  p.status,
  COALESCE(labour.total_labour_cost, 0) AS labour_cost,
  COALESCE(extra.total_extra_cost, 0)   AS extra_cost,
  COALESCE(disposal.total_disposal,  0) AS disposal_cost,
  COALESCE(vehicle.total_vehicle,    0) AS vehicle_cost,
  (
    COALESCE(labour.total_labour_cost, 0)
    + COALESCE(extra.total_extra_cost, 0)
    + COALESCE(disposal.total_disposal, 0)
    + COALESCE(vehicle.total_vehicle, 0)
  ) AS total_cost
FROM t_projects p
LEFT JOIN (
  SELECT project_id, SUM(ges_lis_h * COALESCE(e.hourly_rate, 0)) AS total_labour_cost
  FROM t_time_pairs tp
  LEFT JOIN t_employees e ON e.employee_id = tp.employee_id
  GROUP BY project_id
) labour ON labour.project_id = p.project_id
LEFT JOIN (
  SELECT project_id, SUM(cost) AS total_extra_cost
  FROM t_project_costs_extra
  GROUP BY project_id
) extra ON extra.project_id = p.project_id
LEFT JOIN (
  SELECT project_id, SUM(total_cost) AS total_disposal
  FROM t_disposal_costs
  GROUP BY project_id
) disposal ON disposal.project_id = p.project_id
LEFT JOIN (
  SELECT project_id, SUM(COALESCE(cost_per_unit, 0) * COALESCE(quantity, 0)) AS total_vehicle
  FROM t_project_vehicle_costs
  GROUP BY project_id
) vehicle ON vehicle.project_id = p.project_id;

-- ─── v_employee_costs ───────────────────────────────────────────
-- Employee cost calculations based on time pairs.
CREATE OR REPLACE VIEW v_employee_costs AS
SELECT
  e.employee_id,
  e.name,
  e.hourly_rate,
  COUNT(tp.id) AS total_time_entries,
  COALESCE(SUM(tp.ges_lis_h), 0)                       AS total_hours,
  COALESCE(SUM(tp.ges_lis_h), 0) * COALESCE(e.hourly_rate, 0) AS total_cost
FROM t_employees e
LEFT JOIN t_time_pairs tp ON tp.employee_id = e.employee_id
GROUP BY e.employee_id;

-- ─── v_time_pairs_enriched ──────────────────────────────────────
-- Enriched time tracking data with project and employee names.
CREATE OR REPLACE VIEW v_time_pairs_enriched AS
SELECT
  tp.*,
  p.name AS project_name,
  p.project_code,
  e.name AS employee_name,
  e.hourly_rate
FROM t_time_pairs tp
LEFT JOIN t_projects  p ON p.project_id  = tp.project_id
LEFT JOIN t_employees e ON e.employee_id = tp.employee_id;

-- ─── v_material_value ───────────────────────────────────────────
-- Material inventory values.
CREATE OR REPLACE VIEW v_material_value AS
SELECT
  m.material_id,
  m.name,
  m.unit,
  m.category,
  m.is_active,
  mp.cost_per_unit,
  mp.price_per_unit,
  COALESCE(usage.total_used, 0) AS total_used
FROM t_materials m
LEFT JOIN t_material_prices mp ON mp.material_id = m.material_id
LEFT JOIN (
  SELECT material_id, SUM(quantity) AS total_used
  FROM t_project_material_usage
  GROUP BY material_id
) usage ON usage.material_id = m.material_id;

-- ─── v_inspection_detail_complete ───────────────────────────────
-- Complete inspection details.
CREATE OR REPLACE VIEW v_inspection_detail_complete AS
SELECT
  i.*,
  p.name AS project_name,
  p.project_code,
  COUNT(DISTINCT ii.id) AS item_count,
  COUNT(DISTINCT ip.id) AS photo_count,
  COALESCE(SUM(ii.volume_m3), 0) AS total_volume_m3,
  COALESCE(SUM(ii.sum_hours), 0) AS total_hours
FROM t_inspections i
LEFT JOIN t_projects p  ON p.project_id = i.project_id
LEFT JOIN t_inspection_items ii ON ii.inspection_id = i.inspection_id
LEFT JOIN t_inspection_photos ip ON ip.inspection_id = i.inspection_id
GROUP BY i.inspection_id, p.name, p.project_code;

-- ─── v_costs_by_phase ───────────────────────────────────────────
-- Cost breakdowns by project phase.
CREATE OR REPLACE VIEW v_costs_by_phase AS
SELECT
  p.project_id,
  p.name AS project_name,
  'extra'    AS cost_type, pce.phase, pce.cost AS amount
FROM t_project_costs_extra pce
JOIN t_projects p ON p.project_id = pce.project_id
UNION ALL
SELECT
  p.project_id,
  p.name, 'disposal', dc.phase, dc.total_cost
FROM t_disposal_costs dc
JOIN t_projects p ON p.project_id = dc.project_id
UNION ALL
SELECT
  p.project_id,
  p.name, 'vehicle', pvc.phase, COALESCE(pvc.cost_per_unit, 0) * COALESCE(pvc.quantity, 0)
FROM t_project_vehicle_costs pvc
JOIN t_projects p ON p.project_id = pvc.project_id;
