# Vollständige Datenbank-Schema-Dokumentation

## 📊 Tabellen-Übersicht

### Materialien

#### **t_materials**
- **Primärschlüssel:** `material_id` (text)
- **Spalten:**
  - `material_id`: text (PK)
  - `name`: text
  - `unit`: text (optional)
  - `category`: text (optional)
  - `vat_rate`: numeric (Standard: 19.00)
  - `is_active`: boolean (Standard: true)
  - `default_quantity`: numeric
  - `created_at`: timestamptz
  - `updated_at`: timestamptz
- **Referenzen:**
  - Wird referenziert von: `t_material_prices`, `t_material_price_history`, `t_project_material_usage`
- **Verwendung:** Materialien mit Name, Einheit, optionaler Kategorie, Mehrwertsteuersatz
- **Wichtig:** Nutze `material_id` für Joins, berücksichtige Nullbarkeit bei optionalen Feldern

#### **t_material_prices**
- **Primärschlüssel:** `material_id` (text) — eine Preiszeile pro Material
- **Spalten:**
  - `material_id`: text (PK, FK → t_materials.material_id)
  - `cost_per_unit`: numeric
  - `price_per_unit`: numeric
  - `currency`: text (Standard: 'EUR')
  - `updated_by`: uuid
  - `updated_at`: timestamptz
- **Verwendung:** Ideal für Preisabfragen oder Cost-Preis-Berechnungen

#### **t_material_price_history**
- **Primärschlüssel:** `hist_id` (uuid)
- **Spalten:**
  - `hist_id`: uuid (PK)
  - `material_id`: text (FK → t_materials.material_id)
  - `old_price`: numeric
  - `new_price`: numeric
  - `changed_at`: timestamptz
  - `changed_by`: uuid
- **Verwendung:** Audit-Log für Materialpreisänderungen, Nachverfolgung und Reporting von Preisverläufen

---

### Fahrzeuge

#### **t_vehicles**
- **Primärschlüssel:** `vehicle_id` (text)
- **Spalten:**
  - `vehicle_id`: text (PK)
  - `nickname`: text
  - `unit`: text (Standard: 'Tag')
  - `status`: text (Standard: 'bereit')
  - `inhalt`: text
  - `notes`: text
  - `is_deleted`: boolean
  - `created_at`: timestamptz
  - `updated_at`: timestamptz
- **Referenzen:**
  - Wird referenziert von: `t_vehicle_rates`, `t_vehicle_inventory`, `t_vehicle_daily_status`, `t_morningplan`
- **Verwendung:** Fahrzeug-Stammdaten, nutze `vehicle_id` für Verknüpfungen

#### **t_vehicle_rates**
- **Primärschlüssel:** `vehicle_id` (text)
- **Spalten:**
  - `vehicle_id`: text (PK, FK → t_vehicles.vehicle_id)
  - `cost_per_unit`: numeric
  - `gas_cost_per_unit`: numeric
  - `price_per_unit`: numeric
  - `gas_price_per_unit`: numeric
  - `currency`: text
  - `updated_by`: uuid
  - `updated_at`: timestamptz
  - `total_cost_per_unit`: numeric (berechnet: cost_per_unit + gas_cost_per_unit)
  - `total_price_per_unit`: numeric (berechnet: price_per_unit + gas_price_per_unit)
- **Verwendung:** Kosten- und Preisinformationen für Fahrzeuge

#### **t_vehicle_inventory**
- **Primärschlüssel:** `id` (serial int)
- **Spalten:**
  - `id`: serial int (PK)
  - `vehicle_id`: text (FK → t_vehicles.vehicle_id)
  - `inventory_date`: date
  - `contents`: text
  - `reported_by`: uuid
  - `created_at`: timestamptz
- **Verwendung:** Inventareinträge pro Fahrzeug, nützlich für tägliche Bestands- oder Inhaltsberichte

#### **t_vehicle_daily_status**
- **Primärschlüssel:** `id` (int)
- **Spalten:**
  - `id`: int (PK)
  - `vehicle_name`: text
  - `status`: text
  - `informationen`: text
  - `plan_date`: date
  - `vehicle_id`: text (FK → t_vehicles.vehicle_id)
  - `created_at`: timestamptz
  - `updated_at`: timestamptz
- **Verwendung:** Tagesstatus-Einträge, verwendet für tagesbezogene Statusmeldungen

---

### Mitarbeiter

#### **t_employees**
- **Primärschlüssel:** `employee_id` (uuid)
- **Spalten:**
  - `employee_id`: uuid (PK)
  - `employee_code`: text (unique)
  - `name`: text
  - `email`: text
  - `phone`: text
  - `role`: text
  - `contract_type`: text
  - `weekly_hours_contract`: numeric
  - `hourly_rate`: numeric
  - `notes`: text
  - `is_active`: boolean
  - `created_at`: timestamptz
  - `updated_at`: timestamptz
- **Referenzen:**
  - Wird referenziert von: `t_employee_rate_history`, `t_morningplan_staff`, `t_time_pairs`
- **Verwendung:** Mitarbeiter-Stammdaten

#### **t_employee_rate_history**
- **Primärschlüssel:** `hist_id` (bigint)
- **Spalten:**
  - `hist_id`: bigint (PK)
  - `employee_id`: uuid (FK → t_employees.employee_id)
  - `old_hourly_rate`: numeric
  - `new_hourly_rate`: numeric
  - `changed_at`: timestamptz
  - `changed_by`: uuid
- **Verwendung:** Historie von Stundensatzänderungen, zur Nachvollziehbarkeit von Lohnanpassungen

#### **tmp_employees**
- **Primärschlüssel:** Keiner (Staging-Tabelle)
- **Verwendung:** Staging-/Importtabelle für Mitarbeiter, enthält Rohdatenfelder zur Zwischenablage vor dem Mapping in t_employees
- **Wichtig:** Nutze für Bulk-Imports und Datenbereinigung, KEIN Primärschlüssel

---

### Projekte

#### **t_projects**
- **Primärschlüssel:** `project_id` (uuid)
- **Spalten:**
  - `project_id`: uuid (PK)
  - `project_code`: text (unique)
  - `name`: text
  - `customer_name`: text
  - `customer_email`: text
  - `customer_phone`: text
  - `strasse`: text
  - `nr`: text
  - `plz`: text
  - `stadt`: text
  - `notes`: text
  - `status`: text (Standard: 'In Planung')
  - `dienstleistungen`: text
  - `project_date`: date
  - `project_time`: time
  - `offer_type`: text
  - `project_start_date`: date
  - `project_end_date`: date
  - `created_at`: timestamptz
  - `updated_at`: timestamptz
- **Referenzen:**
  - Kernreferenz für: `t_morningplan`, `t_project_costs_extra`, `t_inspections`, `t_time_pairs`, `t_project_material_usage`, `t_project_note_media`, `t_abnahmen`
- **Verwendung:** Zentrale Projekttabelle, Kernreferenz für Planung, Kosten, Inspektionen und Zeiterfassung

#### **tmp_projects**
- **Primärschlüssel:** Keiner (Staging-Tabelle)
- **Verwendung:** Staging-/Importtabelle für Projekte, dient zum Import von Fremddaten vor der Überführung in t_projects

#### **t_morningplan**
- **Primärschlüssel:** `plan_id` (uuid)
- **Spalten:**
  - `plan_id`: uuid (PK)
  - `plan_date`: date
  - `project_id`: uuid (FK → t_projects.project_id, optional)
  - `vehicle_id`: text (FK → t_vehicles.vehicle_id, optional)
  - `start_time`: time
  - `service_type`: text
  - `notes`: text
  - `angebotsart`: text
  - `created_at`: timestamptz
  - `updated_at`: timestamptz
- **Kinder-Tabelle:** `t_morningplan_staff`
- **Verwendung:** Tagesplan-Einträge

#### **t_morningplan_staff**
- **Primärschlüssel:** `id` (bigint)
- **Spalten:**
  - `id`: bigint (PK)
  - `plan_id`: uuid (FK → t_morningplan.plan_id)
  - `employee_id`: uuid (FK → t_employees.employee_id)
  - `role`: text
  - `individual_start_time`: time
  - `member_notes`: text
  - `sort_order`: int
- **Verwendung:** Personalzuweisungen zu Morgenplänen

#### **t_project_note_media**
- **Primärschlüssel:** `id` (uuid)
- **Spalten:**
  - `id`: uuid (PK)
  - `project_id`: uuid (FK → t_projects.project_id)
  - `field_key`: text
  - `mode`: text
  - `text_value`: text
  - `image_base64`: text (legacy)
  - `created_at`: timestamptz
- **Verwendung:** Medien oder lange Notizen zu Projekten, nützlich für anhängbare Mediendaten

#### **t_project_material_usage**
- **Primärschlüssel:** `id` (uuid)
- **Spalten:**
  - `id`: uuid (PK)
  - `project_id`: uuid (FK → t_projects.project_id)
  - `material_id`: text (FK → t_materials.material_id)
  - `quantity`: numeric (Standard: 1)
  - `phase`: text (Standard: 'Nachkalkulation')
  - `created_at`: timestamptz
- **Verwendung:** Materialien pro Projekt, gut für Aggregation von Materialkosten

#### **t_project_costs_extra**
- **Primärschlüssel:** `cost_id` (uuid)
- **Spalten:**
  - `cost_id`: uuid (PK)
  - `project_id`: uuid (FK → t_projects.project_id)
  - `cost_type`: text
  - `description`: text
  - `cost`: numeric
  - `phase`: text
  - `created_at`: timestamptz
- **Verwendung:** Zusätzliche Projektkosten, für sonstige Kostenpositionen

#### **t_disposal_costs**
- **Primärschlüssel:** `id` (uuid)
- **Spalten:**
  - `id`: uuid (PK)
  - `project_id`: uuid (FK → t_projects.project_id)
  - `waste_type`: text
  - `used_unit`: numeric
  - `cost_per_unit`: numeric
  - `total_cost`: numeric (generiert: used_unit * cost_per_unit)
  - `phase`: text
  - `created_at`: timestamptz
- **Verwendung:** Entsorgungskosten pro Projekt

#### **t_project_discounts**
- **Primärschlüssel:** `id` (uuid)
- **Spalten:**
  - `id`: uuid (PK)
  - `project_id`: uuid (FK → t_projects.project_id)
  - `target`: text
  - `mode`: text (flat/percent)
  - `value`: numeric
  - `description`: text
  - `created_at`: timestamptz
- **Verwendung:** Projekt-Rabatte

---

### Inspektionen

#### **t_inspections**
- **Primärschlüssel:** `inspection_id` (uuid)
- **Spalten:**
  - `inspection_id`: uuid (PK)
  - `project_id`: uuid (FK → t_projects.project_id, optional)
  - `customer_name`: text
  - `customer_email`: text
  - `customer_phone`: text
  - `strasse`: text
  - `nr`: text
  - `plz`: text
  - `stadt`: text
  - `appointment_at`: timestamptz
  - `status`: text (Standard: 'Geplant')
  - `notes`: text
  - `ziel_strasse`: text
  - `ziel_nr`: text
  - `ziel_plz`: text
  - `ziel_stadt`: text
  - `etage`: text
  - `hvz`: text
  - `created_at`: timestamptz
  - `updated_at`: timestamptz
- **Referenzen:**
  - Wird referenziert von: `t_inspection_items`, `t_inspection_photos`, `t_inspection_signatures`, `t_inspection_calc_items`, `t_inspection_discounts`
- **Verwendung:** Besichtigungs-/Inspektionsdaten

#### **t_inspection_items**
- **Primärschlüssel:** `id` (bigint)
- **Spalten:**
  - `id`: bigint (PK)
  - `inspection_id`: uuid (FK → t_inspections.inspection_id)
  - `room`: text
  - `notes`: text
  - `volume_m3`: numeric
  - `persons`: int
  - `hours`: numeric
  - `sum_hours`: numeric (generiert: persons * hours)
  - `entsorgungskosten`: numeric
  - `created_at`: timestamptz
- **Verwendung:** Raum/Item-Übersichten pro Inspektion

#### **t_inspection_room_items**
- **Primärschlüssel:** `id` (int)
- **Spalten:**
  - `id`: int (PK)
  - `inspection_id`: uuid (FK → t_inspections.inspection_id)
  - `room_id`: int (Referenz auf t_inspection_items.id)
  - `item_name`: text
  - `quantity`: int (Standard: 1)
  - `montage_option`: text (Standard: 'Keine')
  - `notes`: text
  - `created_at`: timestamptz
  - `updated_at`: timestamptz
- **Verwendung:** Detailliste von Gegenständen pro Raum

#### **t_inspection_photos**
- **Primärschlüssel:** `id` (bigint)
- **Spalten:**
  - `id`: bigint (PK)
  - `inspection_id`: uuid (FK → t_inspections.inspection_id)
  - `url`: text
  - `caption`: text
  - `created_at`: timestamptz
- **Verwendung:** Fotos zur Inspektion

#### **t_inspection_signatures**
- **Primärschlüssel:** `id` (bigint)
- **Spalten:**
  - `id`: bigint (PK)
  - `inspection_id`: uuid (FK → t_inspections.inspection_id)
  - `signer_name`: text
  - `signed_at`: timestamptz
  - `signature_data`: text
- **Verwendung:** Unterschriften für Inspektionen

#### **t_inspection_calc_items**
- **Primärschlüssel:** `id` (uuid)
- **Spalten:**
  - `id`: uuid (PK)
  - `inspection_id`: uuid (FK → t_inspections.inspection_id)
  - `source_item_id`: bigint (FK → t_inspection_items.id, optional)
  - `kind`: text (z.B. material/service/labour)
  - `position_label`: text
  - `qty`: numeric (Standard: 1)
  - `unit`: text
  - `unit_price`: numeric (Standard: 0)
  - `line_total`: numeric (generiert: qty * unit_price)
  - `sort_order`: int
  - `created_at`: timestamptz
- **Verwendung:** Kalkulationszeilen für Inspektionen

#### **t_inspection_discounts**
- **Primärschlüssel:** `id` (uuid)
- **Spalten:**
  - `id`: uuid (PK)
  - `inspection_id`: uuid (FK → t_inspections.inspection_id)
  - `mode`: text
  - `value`: numeric
  - `description`: text
  - `created_at`: timestamptz
- **Verwendung:** Rabatte pro Inspektion

---

### Dienstleistungen

#### **t_services**
- **Primärschlüssel:** `service_id` (text)
- **Spalten:**
  - `service_id`: text (PK)
  - `name`: text
  - `default_unit`: text
  - `category`: text
  - `is_active`: boolean (Standard: true)
  - `created_at`: timestamptz
  - `updated_at`: timestamptz
- **Referenzen:**
  - Wird referenziert von: `t_service_prices`
- **Verwendung:** Dienstleistungs-Stammdaten

#### **t_service_prices**
- **Primärschlüssel:** `price_id` (text)
- **Spalten:**
  - `price_id`: text (PK)
  - `service_id`: text (FK → t_services.service_id)
  - `supplier`: text
  - `unit`: text
  - `cost_per_unit`: numeric
  - `customer_price_per_unit`: numeric
- **Verwendung:** Preiszeilen für Dienstleistungen

---

### Zeiterfassung

#### **t_time_pairs**
- **Primärschlüssel:** `id` (int)
- **Spalten:**
  - `id`: int (PK)
  - `pair_id`: text (unique extern)
  - `project_id`: uuid (FK → t_projects.project_id)
  - `datum`: date
  - `mitarbeiter`: text (Snapshot-Name)
  - `lis_von`: time
  - `lis_bis`: time
  - `kunde_von`: time
  - `kunde_bis`: time
  - `pause_min`: int (Standard: 0)
  - `ges_lis_h`: numeric (generiert: Stundensumme LIS)
  - `ges_kd_h`: numeric (generiert: Stundensumme Kunde)
  - `employee_id`: uuid (FK → t_employees.employee_id)
  - `created_at`: timestamptz
  - `updated_at`: timestamptz
- **Verwendung:** Zeiterfassungszeilen

---

### Benutzer

#### **t_users**
- **Primärschlüssel:** `user_id` (uuid)
- **Spalten:**
  - `user_id`: uuid (PK)
  - `email`: text (unique)
  - `role`: text (Check: Admin/Secretary/Planner/Supervisor/Worker)
  - `user_type`: text (Check: office/field)
  - `is_active`: boolean (Standard: true)
  - `created_at`: timestamptz
  - `updated_at`: timestamptz
- **Wichtig:** `auth.users` ist separat; manche Tabellen referenzieren `auth.users.id`

---

### Kontakte

#### **contacts**
- **Primärschlüssel:** `id` (int)
- **Spalten:**
  - `id`: int (PK)
  - `lexware_id`: text (unique)
  - `name`: text
  - `anrede`: text
  - `notes`: text
  - `version`: int
  - `created_date`: date
  - `updated_date`: date
  - `synced_at`: timestamptz
  - `organization_id`: text
  - `kundennummer`: text
  - `lieferantennummer`: text
  - `firma`: text
  - `strasse`: text
  - `nr`: text
  - `plz`: text
  - `stadt`: text
  - `email`: text
  - `phone`: text
  - `archived`: boolean
- **Verwendung:** CRM-Kontakttabelle

#### **lexware_contacts_full**
- **Primärschlüssel:** `id` (text)
- **Spalten:**
  - `id`: text (PK)
  - Viele Rechnungs-/Versand-/Kontaktfelder
  - `raw_json`: jsonb (für unstrukturierte Importdaten)
- **Verwendung:** Große, denormalisierte Import-Tabelle aus Lexware, geeignet für Bulk-Analysen und ETL

---

### Abnahmen

#### **t_abnahmen**
- **Primärschlüssel:** `abnahme_id` (uuid)
- **Spalten:**
  - `abnahme_id`: uuid (PK)
  - `project_id`: uuid (FK → t_projects.project_id)
  - `plan_id`: uuid (FK → t_morningplan.plan_id, optional)
  - `datum`: date
  - Viele Abrechnungsfelder
  - Onsite-Zeiten
  - Viele boolesche Flags
  - Diverse material- und moving-supply-Zähler (mv_*, mat_*)
  - `created_at`: timestamptz
  - `updated_at`: timestamptz
- **Verwendung:** Abnahme-/Handover-Protokoll, umfangreiche Tabelle für abschließende Übergaben

---

### Chats

#### **t_chats**
- **Primärschlüssel:** `id` (uuid)
- **Spalten:**
  - `id`: uuid (PK)
  - `user_id`: uuid (FK → auth.users.id, NOT t_users)
  - `title`: text (Standard: 'Neuer Chat')
  - `message_count`: int
  - `is_shared`: boolean
  - `shared_with_user_ids`: uuid[]
  - `created_at`: timestamptz
  - `updated_at`: timestamptz
- **Wichtig:** RLS-Policies sind aktiv — Zugriffe erfordern korrekten Auth-Context

#### **t_chat_messages**
- **Primärschlüssel:** `id` (uuid)
- **Spalten:**
  - `id`: uuid (PK)
  - `chat_id`: uuid (FK → t_chats.id)
  - `role`: enum (user|assistant|tool)
  - `content`: text
  - `timestamp`: timestamptz
  - `tool_calls`: jsonb (optional)
  - `tool_call_id`: text (optional)
  - `created_at`: timestamptz
- **Wichtig:** RLS-Policies beachten; Lese-/Schreibberechtigungen hängen vom Auth-Context ab

---

### Bewertungen

#### **t_worker_ratings**
- **Primärschlüssel:** `rating_id` (text)
- **Spalten:**
  - `rating_id`: text (PK)
  - `project_id`: uuid (FK → t_projects.project_id)
  - `plan_id`: uuid (FK → t_morningplan.plan_id)
  - `employee_id`: text (als Text-Feld, nicht FK)
  - `employee_name`: text
  - `datum`: date
  - `rating`: int (1–10)
  - `notes`: text
  - `created_at`: timestamptz
  - `updated_at`: timestamptz
- **Verwendung:** Mitarbeitenden-Bewertungen, geeignet für Qualitätsauswertungen

---

## 🔗 Schlüsselbeziehungen

### Zentrale Beziehungen:

1. **t_projects.project_id** ist das zentrale Projekt-Identifikationsfeld
   - Referenziert von: `t_morningplan`, `t_project_costs_extra`, `t_inspections`, `t_time_pairs`, `t_project_material_usage`, `t_project_note_media`, `t_abnahmen`

2. **t_inspections.inspection_id** verbindet Inspektions-Details
   - Referenziert von: `t_inspection_items`, `t_inspection_photos`, `t_inspection_signatures`, `t_inspection_calc_items`, `t_inspection_discounts`
   - `t_inspection_items.id` wird als `room_id` in `t_inspection_room_items` verwendet

3. **t_materials.material_id** verknüpft Material-Daten
   - Referenziert von: `t_material_prices`, `t_material_price_history`, `t_project_material_usage`

4. **t_vehicles.vehicle_id** verbindet Fahrzeug-Daten
   - Referenziert von: `t_vehicle_rates`, `t_vehicle_inventory`, `t_vehicle_daily_status`, `t_morningplan`

5. **t_employees.employee_id** wird in mehreren Tabellen genutzt
   - Referenziert von: `t_employee_rate_history`, `t_morningplan_staff`, `t_time_pairs`

6. **Chats (t_chats, t_chat_messages)** nutzen `auth.users.id` für Ownership
   - RLS-geschützt — Chatbot sollte mit entsprechendem Auth-Context arbeiten

---

## ⚠️ Wichtige Hinweise

### Staging-Tabellen:
- **tmp_employees** und **tmp_projects** sind Staging-Tabellen ohne Primärschlüssel
- Nutze für sauberen ETL-Flow vor dem Einspielen in die Haupttabellen

### RLS (Row Level Security):
- **t_chats** und **t_chat_messages** haben aktive RLS-Policies
- Zugriffe erfordern korrekten Auth-Context
- Chatbot sollte mit entsprechendem Auth-Context arbeiten

### Generierte Spalten:
- `t_disposal_costs.total_cost` = `used_unit * cost_per_unit`
- `t_inspection_items.sum_hours` = `persons * hours`
- `t_inspection_calc_items.line_total` = `qty * unit_price`
- `t_vehicle_rates.total_cost_per_unit` = `cost_per_unit + gas_cost_per_unit`
- `t_vehicle_rates.total_price_per_unit` = `price_per_unit + gas_price_per_unit`

### Standardwerte:
- `t_materials.vat_rate`: 19.00
- `t_materials.is_active`: true
- `t_vehicles.unit`: 'Tag'
- `t_vehicles.status`: 'bereit'
- `t_projects.status`: 'In Planung'
- `t_inspections.status`: 'Geplant'
- `t_services.is_active`: true
- `t_users.is_active`: true
- `t_chats.title`: 'Neuer Chat'

