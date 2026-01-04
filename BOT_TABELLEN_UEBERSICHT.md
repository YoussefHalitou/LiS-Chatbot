# Tabellen-Übersicht: Welche Tabellen kennt der Bot?

## 📊 Tabellen für INSERT/UPDATE/DELETE (Schreibzugriff)

**Definiert in:** `lib/constants.ts` → `INSERT_ALLOWED_TABLES`

| Tabelle | Beschreibung | Status |
|---------|--------------|--------|
| `t_projects` | Projekte | ✅ Getestet & funktioniert |
| `t_morningplan` | Tagesplan-Einträge | ✅ Verfügbar |
| `t_morningplan_staff` | Personalzuweisungen zu Morgenplänen | ✅ Verfügbar |
| `t_vehicles` | Fahrzeuge | ✅ Getestet & funktioniert |
| `t_employees` | Mitarbeiter | ✅ Getestet & funktioniert |
| `t_services` | Services | ✅ Getestet & funktioniert |
| `t_materials` | Materialien | ✅ Getestet & funktioniert |
| `t_material_prices` | Materialpreise | ✅ Verfügbar |

**Hinweis:** Nur diese Tabellen können für INSERT/UPDATE/DELETE verwendet werden. Alle anderen Tabellen sind READ-ONLY.

---

## 📖 Tabellen für READ-ONLY (Abfragen)

### Basis-Tabellen (im System-Prompt dokumentiert)

#### Projekte & Planung
- **`t_projects`** ⭐ - Zentrale Projekttabelle
- **`t_morningplan`** - Tagesplan-Einträge
- **`t_morningplan_staff`** - Personalzuweisungen

#### Mitarbeiter
- **`t_employees`** - Mitarbeiter-Stammdaten
- **`t_employee_rate_history`** - Historie von Stundensatzänderungen

#### Fahrzeuge
- **`t_vehicles`** - Fahrzeug-Stammdaten
- **`t_vehicle_rates`** - Kosten- und Preisinformationen für Fahrzeuge
- **`t_vehicle_inventory`** - Inventareinträge pro Fahrzeug
- **`t_vehicle_daily_status`** - Tagesstatus-Einträge

#### Materialien & Services
- **`t_materials`** - Materialien
- **`t_material_prices`** - Materialpreise (eine Preiszeile pro Material)
- **`t_material_price_history`** - Audit-Log für Materialpreisänderungen
- **`t_services`** - Services
- **`t_service_prices`** - Service-Preise

#### Inspektionen
- **`t_inspections`** - Inspektionen
- **`t_inspection_items`** - Raum/Item-Übersichten pro Inspektion
- **`t_inspection_room_items`** - Detailliste von Gegenständen pro Raum
- **`t_inspection_photos`** - Fotos zu Inspektionen
- **`t_inspection_signatures`** - Unterschriften zu Inspektionen
- **`t_inspection_calc_items`** - Kalkulationszeilen für Inspektionen
- **`t_inspection_discounts`** - Rabatte für Inspektionen

#### Projektdetails
- **`t_time_pairs`** - Zeiterfassungszeilen
- **`t_project_note_media`** - Medien oder lange Notizen zu Projekten
- **`t_project_material_usage`** - Materialien pro Projekt
- **`t_project_costs_extra`** - Zusätzliche Projektkosten
- **`t_disposal_costs`** - Entsorgungskosten pro Projekt
- **`t_project_discounts`** - Projekt-Rabatte
- **`t_abnahmen`** - Abnahme-/Handover-Protokoll
- **`t_worker_ratings`** - Mitarbeitenden-Bewertungen

#### Benutzer & Kontakte
- **`t_users`** - Benutzer (intern)
- **`contacts`** - CRM-Kontakttabelle
- **`lexware_contacts_full`** - Große, denormalisierte Import-Tabelle aus Lexware

#### Chat (RLS-geschützt)
- **`t_chats`** - Chat-Metadaten pro Benutzer
- **`t_chat_messages`** - Einzelne Nachrichten innerhalb von Chats

#### Staging-Tabellen
- **`tmp_employees`** - Staging-Tabelle für Mitarbeiter (KEIN Primärschlüssel)
- **`tmp_projects`** - Staging-Tabelle für Projekte (KEIN Primärschlüssel)

---

## 🔍 Views (für komplexe Abfragen)

**Wichtig:** Der Bot sollte immer Views bevorzugen statt manueller JOINs!

### Haupt-Views
- **`v_morningplan_full`** ⭐ - Kompletter Morgenplan mit allen JOINs (Projekte, Mitarbeiter, Fahrzeuge)
- **`v_project_full`** - Kompletter Projekt-View mit allen verwandten Daten
- **`v_employee_kpi`** - Mitarbeiter-KPIs und Statistiken
- **`v_project_profit`** - Projekt-Rentabilitätsberechnungen
- **`v_inspection_detail_complete`** - Komplette Inspektionsdetails
- **`v_costs_by_phase`** - Kostenaufschlüsselung nach Projektphase
- **`v_time_pairs_enriched`** - Angereicherte Zeiterfassungsdaten
- **`v_employee_costs`** - Mitarbeiterkosten-Berechnungen
- **`v_material_value`** - Materialinventar-Werte

---

## 🛠️ Dynamische Tabellen-Erkennung

Der Bot kann auch **dynamisch Tabellen abfragen** über:
- **Tool:** `getTableNames()` - Gibt alle verfügbaren Tabellen zurück
- **Tool:** `getTableStructure(tableName)` - Gibt die Struktur einer Tabelle zurück

Diese Tools nutzen:
1. OpenAPI-Schema von Supabase
2. RPC-Funktion `get_table_names` (falls vorhanden)
3. `information_schema` direkt (als Fallback)

---

## 📋 Zusammenfassung

### Gesamtanzahl
- **INSERT-fähige Tabellen:** 8
- **READ-ONLY Tabellen:** ~30+
- **Views:** 9
- **Staging-Tabellen:** 2

### Kategorien
1. **Projekte & Planung** (3 Tabellen + 1 View)
2. **Mitarbeiter** (2 Tabellen + 1 View)
3. **Fahrzeuge** (4 Tabellen)
4. **Materialien & Services** (5 Tabellen + 1 View)
5. **Inspektionen** (7 Tabellen + 1 View)
6. **Projektdetails** (7 Tabellen + 2 Views)
7. **Benutzer & Kontakte** (3 Tabellen)
8. **Chat** (2 Tabellen, RLS-geschützt)
9. **Staging** (2 Tabellen)

---

## 🔐 Sicherheit

- **INSERT/UPDATE/DELETE:** Nur auf `INSERT_ALLOWED_TABLES` erlaubt
- **RLS (Row Level Security):** Aktiv auf `t_chats` und `t_chat_messages`
- **Validierung:** Alle Tabellennamen werden gegen Whitelist geprüft
- **Sanitization:** Alle Werte werden vor dem Insert/Update/Delete sanitized

---

## 📝 Hinweise

1. **Views bevorzugen:** Für komplexe Abfragen immer Views verwenden (z.B. `v_morningplan_full` statt manueller JOINs)
2. **Dynamische Erkennung:** Der Bot kann `getTableNames()` verwenden, um alle verfügbaren Tabellen zu sehen
3. **Struktur-Abfrage:** Mit `getTableStructure(tableName)` kann der Bot die Spalten einer Tabelle sehen
4. **INSERT-Beschränkungen:** Nur Tabellen in `INSERT_ALLOWED_TABLES` können modifiziert werden
