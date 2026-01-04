# Datenbank-Informationen in der Anwendung

Dieses Dokument listet alle Informationen auf, die bereits in der Anwendung bezüglich der Supabase-Datenbank vorhanden sind.

---

## 📊 Übersicht

Die Anwendung enthält umfangreiche Informationen über die Supabase-Datenbankstruktur, die hauptsächlich im `SYSTEM_PROMPT` der Datei `app/api/chat/route.ts` dokumentiert sind.

---

## 🗂️ Tabellen (BASE TABLES)

### **t_projects** ⭐
- **Zweck:** Projekte
- **Spalten:**
  - `project_id` (UUID)
  - `project_code` (String)
  - `name` (String)
  - `ort` (String, optional)
  - `dienstleistungen` (String)
  - `status` (String, Standard: 'geplant')
  - `project_date` (Date)
  - `project_time` (Time)
- **Verwendung:**
  - **WICHTIG:** Für "alle projekte" OHNE Datumsfilter verwenden
  - `v_morningplan_full` zeigt nur Projekte MIT Plänen
  - `t_projects` zeigt ALLE Projekte in der Datenbank
- **Beispiele:**
  - "alle projekte" → `queryTable('t_projects', {}, limit: 100)`
  - "projekte" (ohne Datum) → `queryTable('t_projects', {}, limit: 100)`

### **t_employees**
- **Zweck:** Mitarbeiter
- **Spalten:**
  - `employee_id` (UUID)
  - `name` (String)
  - `role` (String, optional)
  - `contract_type` (String: 'intern', 'Intern', 'Fest', etc.)
  - `hourly_rate` (Number, Standard: 0)
  - `is_active` (Boolean, Standard: true)
- **Besonderheiten:**
  - Automatisches Fuzzy-Matching bei Namenssuche (ilike)
  - Limit: 50 für Mitarbeitersuchen empfohlen

### **t_morningplan**
- **Zweck:** Tagesplanung
- **Spalten:**
  - `plan_id` (UUID)
  - `plan_date` (Date)
  - `project_id` (UUID, FK → t_projects)
  - `vehicle_id` (UUID, FK → t_vehicles)
  - `start_time` (Time)
  - `service_type` (String)
- **Beziehungen:**
  - `project_id` → `t_projects.project_id`
  - `vehicle_id` → `t_vehicles.vehicle_id`

### **t_morningplan_staff**
- **Zweck:** Mitarbeiter-Zuteilung zu Plänen
- **Spalten:**
  - `plan_id` (UUID, FK → t_morningplan)
  - `employee_id` (UUID, FK → t_employees)
  - `role` (String, optional)
  - `individual_start_time` (Time, optional)
  - `sort_order` (Number, Standard: 0)
- **Beziehungen:**
  - `plan_id` → `t_morningplan.plan_id`
  - `employee_id` → `t_employees.employee_id`

### **t_vehicles**
- **Zweck:** Fahrzeuge
- **Spalten:**
  - `vehicle_id` (UUID)
  - `nickname` (String)
  - `unit` (String)
  - `status` (String)
  - `is_deleted` (Boolean)

### **t_materials / t_material_prices**
- **Zweck:** Materialien + Preise (EK/VK)
- **t_materials:**
  - `material_id` (String, Format: M-[UPPERCASE_NAME]-[RANDOM])
  - `name` (String)
  - `unit` (String, optional)
  - `category` (String, optional)
  - `vat_rate` (Number, Standard: 19%)
  - `is_active` (Boolean, Standard: true)
  - `default_quantity` (Number, Standard: 1)
- **t_material_prices:**
  - `material_id` (UUID, FK → t_materials)
  - `purchase_price` (Number, EK)
  - `sale_price` (Number, VK)
- **Beziehungen:**
  - `t_material_prices.material_id` → `t_materials.material_id`

### **t_services / t_service_prices**
- **Zweck:** Dienstleistungen + Preise
- **Beziehungen:**
  - `t_service_prices.service_id` → `t_services.service_id`

### **t_inspections / t_inspection_items**
- **Zweck:** Besichtigungen + Details
- **Beziehungen:**
  - `t_inspections.project_id` → `t_projects.project_id`
  - `t_inspection_items.inspection_id` → `t_inspections.inspection_id`

### **t_time_pairs**
- **Zweck:** Zeiterfassung pro Projekt
- **Beziehungen:**
  - `t_time_pairs.project_id` → `t_projects.project_id`

### **t_vehicle_rates**
- **Zweck:** Fahrzeug-Tarife
- **Beziehungen:**
  - `t_vehicle_rates.vehicle_id` → `t_vehicles.vehicle_id`

### **t_project_note_media**
- **Zweck:** Projekt-Notizen und Medien
- **Beziehungen:**
  - `t_project_note_media.project_id` → `t_projects.project_id`

---

## 👁️ Views (KEY VIEWS)

### **v_morningplan_full** ⭐ MOST IMPORTANT
- **Zweck:** Komplette Morning-Plan-Ansicht mit ALLEN JOINs
- **Spalten:**
  - `plan_id`
  - `plan_date`
  - `start_time`
  - `service_type`
  - `notes`
  - `project_code`
  - `project_name`
  - `project_ort`
  - `vehicle_nickname`
  - `vehicle_status`
  - `staff_list` (Mitarbeiter-Namen als Liste!)
- **Verwendung:**
  - ✅ "Projekte mit Mitarbeitern"
  - ✅ "Einsätze"
  - ✅ "Wer ist eingeplant"
  - ✅ "Projekte heute/morgen"
  - ✅ "Projekte diese Woche"
  - ❌ **NICHT** für "alle projekte" OHNE Datumsfilter (dann `t_projects` verwenden!)
- **Beispiele:**
  - `queryTable('v_morningplan_full', {plan_date: '2025-12-10'})`
  - `queryTable('v_morningplan_full', {plan_date: '[today]'})`

### **v_project_full**
- **Zweck:** Komplette Projekt-Ansicht mit allen zugehörigen Daten

### **v_employee_kpi**
- **Zweck:** Mitarbeiter-KPIs und Statistiken
- **Besonderheiten:**
  - Unterstützt Fuzzy-Matching bei Namenssuche

### **v_project_profit**
- **Zweck:** Projekt-Rentabilitätsberechnungen

### **v_inspection_detail_complete**
- **Zweck:** Komplette Besichtigungsdetails mit allen zugehörigen Daten

### **v_costs_by_phase**
- **Zweck:** Kostenaufschlüsselung nach Projektphase

### **v_time_pairs_enriched**
- **Zweck:** Angereicherte Zeiterfassungsdaten

### **v_employee_costs**
- **Zweck:** Mitarbeiter-Kostenberechnungen

### **v_material_value**
- **Zweck:** Materialbestandswerte

---

## 🔗 Foreign Key Beziehungen

Die folgenden Beziehungen sind dokumentiert:

1. `t_morningplan.project_id` → `t_projects.project_id`
2. `t_morningplan_staff.plan_id` → `t_morningplan.plan_id`
3. `t_morningplan_staff.employee_id` → `t_employees.employee_id`
4. `t_inspections.project_id` → `t_projects.project_id`
5. `t_inspection_items.inspection_id` → `t_inspections.inspection_id`
6. `t_vehicle_rates.vehicle_id` → `t_vehicles.vehicle_id`
7. `t_material_prices.material_id` → `t_materials.material_id`
8. `t_time_pairs.project_id` → `t_projects.project_id`
9. `t_project_note_media.project_id` → `t_projects.project_id`

---

## 🛠️ Verfügbare Funktionen

### **queryTable**
- **Zweck:** Einfache Abfragen auf einer einzelnen Tabelle
- **Parameter:**
  - `tableName` (String)
  - `filters` (Object, optional)
  - `limit` (Number, Standard: 100)
  - `joins` (Array, optional)
- **Filter-Typen:**
  - `eq` (Gleich)
  - `neq` (Ungleich)
  - `gt` (Größer als)
  - `gte` (Größer oder gleich)
  - `lt` (Kleiner als)
  - `lte` (Kleiner oder gleich)
  - `between` (Zwischen zwei Werten)
  - `like` (Pattern-Matching)
  - `ilike` (Case-insensitive Pattern-Matching)
  - `in` (In Array)
- **Besonderheiten:**
  - Automatisches Fuzzy-Matching für `name`-Felder bei `t_employees`
  - Automatische Datumsfilter für "heute", "morgen", "gestern", "diese Woche"

### **getStatistics**
- **Zweck:** Statistiken und Aggregationen
- **Parameter:**
  - `tableName` (String)
  - `aggregation` ('count' | 'sum' | 'avg' | 'min' | 'max')
  - `column` (String, optional)
  - `groupBy` (String, optional)
  - `filters` (Object, optional)
  - `limit` (Number, Standard: 1000)
- **Verwendung:**
  - "Wie viele..." → `getStatistics` verwenden!
  - "Welches Projekt hat die meisten..." → `getStatistics` mit `groupBy`
  - "Zeige Auslastung..." → `getStatistics` mit `groupBy`

### **insertRow**
- **Zweck:** Neue Zeilen einfügen
- **Parameter:**
  - `tableName` (String)
  - `values` (Object)
  - `options` (Object, optional: userId, ipAddress)
- **Erlaubte Tabellen:**
  - Definiert in `lib/constants.ts` (`INSERT_ALLOWED_TABLES`)

### **updateRow**
- **Zweck:** Bestehende Zeilen aktualisieren
- **Parameter:**
  - `tableName` (String)
  - `filters` (Object)
  - `values` (Object)
  - `options` (Object, optional: userId, ipAddress, requireSingleRow)
- **Besonderheiten:**
  - Validiert, dass Filter genau eine Zeile identifizieren (außer `requireSingleRow: false`)
  - Automatisches Case-insensitive Matching für `name`-Felder

### **deleteRow**
- **Zweck:** Zeilen löschen
- **Parameter:**
  - `tableName` (String)
  - `filters` (Object)
  - `options` (Object, optional: userId, ipAddress, requireSingleRow)
- **Besonderheiten:**
  - Validiert, dass Filter genau eine Zeile identifizieren (außer `requireSingleRow: false`)
  - **WICHTIG:** Automatische Abfrage, um ID zu finden, wenn nur Name gegeben ist

### **queryTableWithJoin**
- **Zweck:** Abfragen mit JOIN zu verwandten Tabellen
- **Parameter:**
  - `tableName` (String)
  - `joinTable` (String)
  - `joinColumn` (String, optional)
  - `filters` (Object, optional)
  - `limit` (Number, Standard: 100)
- **Besonderheiten:**
  - Versucht automatisch mehrere JOIN-Patterns
  - Unterstützt Reverse-JOINs

### **getTableNames**
- **Zweck:** Alle verfügbaren Tabellennamen abrufen
- **Rückgabe:**
  - `tables` (Array)
  - `error` (String, optional)

### **getTableStructure**
- **Zweck:** Tabellenstruktur (Spalten) abrufen
- **Parameter:**
  - `tableName` (String)
- **Rückgabe:**
  - `columns` (Array)
  - `sampleRow` (Object, optional)
  - `error` (String, optional)

---

## 📅 Datumsfelder

Die folgenden Tabellen haben Datumsfelder, die für Filter verwendet werden können:

- `v_morningplan_full`: `plan_date`
- `t_morningplan`: `plan_date`
- `t_projects`: `project_date`

---

## 🔍 Suchfelder

### Projekt-Suche
- `v_morningplan_full`: `project_name`, `project_code`, `project_id`
- `t_projects`: `name`, `project_code`, `project_id`

### Mitarbeiter-Suche
- `t_employees`: `name` (mit automatischem Fuzzy-Matching)
- `v_employee_kpi`: `name` (mit automatischem Fuzzy-Matching)

---

## 📝 Standardwerte

### **t_projects**
- `status`: 'geplant'
- `ort`: null (optional)
- `project_code`: Auto-generiert (Format: PRJ-YYYYMMDD-XXXXX)

### **t_employees**
- `is_active`: true
- `hourly_rate`: 0 (wenn nicht angegeben)
- `contract_type`: null (wenn nicht angegeben)
- `role`: null (wenn nicht angegeben)

### **t_materials**
- `is_active`: true
- `vat_rate`: 19 (19%)
- `default_quantity`: 1
- `material_id`: Auto-generiert (Format: M-[UPPERCASE_NAME]-[RANDOM])

### **t_morningplan_staff**
- `sort_order`: 0

---

## 🚨 Wichtige Regeln

1. **"Alle Projekte" ohne Datumsfilter:**
   - ✅ Verwende `t_projects`
   - ❌ Verwende NICHT `v_morningplan_full`

2. **"Projekte heute/morgen/diese Woche":**
   - ✅ Verwende `v_morningplan_full` mit Datumsfilter

3. **Statistiken:**
   - ✅ Verwende `getStatistics` für "Wie viele...", "Welches Projekt hat...", etc.
   - ❌ Verwende NICHT `queryTable` für Statistiken

4. **Mitarbeiter-Suche:**
   - Automatisches Fuzzy-Matching (ilike)
   - Limit: 50 empfohlen

5. **Batch-Operationen:**
   - Mehrere Items in einer Anfrage werden automatisch verarbeitet
   - Zusammenfassung nach allen Operationen

---

## 📚 Weitere Informationen

- **Hauptdokumentation:** `app/api/chat/route.ts` (SYSTEM_PROMPT)
- **Funktions-Implementierungen:** `lib/supabase-query.ts`
- **Konstanten:** `lib/constants.ts` (INSERT_ALLOWED_TABLES)

---

## 🔄 Kontext-Memory

Die Anwendung extrahiert automatisch Kontext aus der Konversation:
- **Letztes Projekt:** Name, Datum, Code
- **Letzte Aktion:** Typ (query/insert/update/delete/statistics), Tabelle, Beschreibung
- **Letzte Filter:** Datumsbereich, Projektname, Mitarbeitername

Dieser Kontext wird automatisch in den SYSTEM_PROMPT eingefügt, um die Konversation zu verbessern.

---

**Stand:** 2025-12-30  
**Quelle:** `app/api/chat/route.ts` (SYSTEM_PROMPT), `lib/supabase-query.ts`

