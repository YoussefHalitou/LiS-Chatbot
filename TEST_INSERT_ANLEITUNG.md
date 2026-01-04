# Test-Anleitung: Erstellen von Einträgen in Supabase

## Übersicht

Dieses Dokument beschreibt, wie die Funktionalität zum Erstellen von Einträgen in der Supabase-Datenbank getestet werden kann.

## Voraussetzungen

1. **Umgebungsvariablen konfiguriert:**
   - `NEXT_PUBLIC_SUPABASE_URL` - Die URL deiner Supabase-Instanz
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Der anonyme Schlüssel
   - `SUPABASE_SERVICE_ROLE_KEY` - Der Service-Role-Schlüssel (für Admin-Operationen)

2. **Node.js Version:**
   - Mindestens Node.js 18.0.0 (empfohlen: Node.js 20+)

## Erlaubte Tabellen für INSERT-Operationen

Die folgenden Tabellen können über die `insertRow` Funktion erstellt werden:

- `t_projects` - Projekte
- `t_morningplan` - Tagespläne
- `t_morningplan_staff` - Mitarbeiterzuweisungen zu Plänen
- `t_vehicles` - Fahrzeuge
- `t_employees` - Mitarbeiter
- `t_services` - Dienstleistungen
- `t_materials` - Materialien
- `t_material_prices` - Materialpreise

## Test-Skript ausführen

### Option 1: Direktes Testen mit tsx

```bash
# Stelle sicher, dass die .env Datei vorhanden ist
npx tsx test-insert-functionality.ts
```

### Option 2: Über die Chat-API testen

Die einfachste Methode ist, die Funktionalität über die Chat-API zu testen:

1. Starte den Development-Server:
   ```bash
   npm run dev
   ```

2. Öffne die Anwendung im Browser

3. Teste verschiedene INSERT-Befehle:

   **Projekt erstellen:**
   ```
   Erstelle ein neues Projekt mit dem Namen "Test Projekt" in Köln
   ```

   **Mitarbeiter erstellen:**
   ```
   Neuer Mitarbeiter: Max Mustermann, Stundensatz 30 Euro, intern
   ```

   **Material erstellen:**
   ```
   Neues Material: Styropor, Einheit: Kilogramm
   ```

   **Fahrzeug erstellen:**
   ```
   Neues Fahrzeug: Test-Fahrzeug-1, Status: bereit
   ```

## Manuelle Tests über die API

### Test 1: Projekt erstellen

```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {
        "role": "user",
        "content": "Erstelle ein neues Projekt mit dem Namen TestProjekt in Hamburg für morgen"
      }
    ]
  }'
```

### Test 2: Mitarbeiter erstellen

```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {
        "role": "user",
        "content": "Neuer Mitarbeiter: Test Mitarbeiter, 25 Euro pro Stunde, intern"
      }
    ]
  }'
```

### Test 3: Material erstellen

```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {
        "role": "user",
        "content": "Neues Material: TestMaterial, Einheit: Stück"
      }
    ]
  }'
```

## Erwartete Verhaltensweisen

### ✅ Erfolgreiche INSERT-Operationen

- Die Funktion `insertRow` gibt `{ data: {...}, error: null }` zurück
- Der erstellte Eintrag hat automatisch generierte Felder wie:
  - `project_id` (UUID) für Projekte
  - `employee_id` (UUID) für Mitarbeiter
  - `created_at` und `updated_at` Timestamps
- Standardwerte werden automatisch gesetzt:
  - `status: 'In Planung'` für Projekte
  - `is_active: true` für Mitarbeiter und Materialien
  - `unit: 'Tag'` und `status: 'bereit'` für Fahrzeuge

### ❌ Fehlerbehandlung

- **Ungültige Tabelle:** Wird abgelehnt mit Fehlermeldung
- **Fehlende Pflichtfelder:** Datenbank-Fehler wird zurückgegeben
- **Duplikate:** Unique-Constraint-Fehler wird zurückgegeben
- **Ungültige Foreign Keys:** Referential-Integrity-Fehler wird zurückgegeben

## Validierung der erstellten Einträge

Nach dem Erstellen kannst du die Einträge überprüfen:

### Über die Chat-API:

```
Zeige mir alle Projekte mit dem Namen "TestProjekt"
```

```
Zeige mir alle Mitarbeiter mit dem Namen "Test Mitarbeiter"
```

### Direkt in Supabase:

1. Öffne das Supabase Dashboard
2. Gehe zu "Table Editor"
3. Wähle die entsprechende Tabelle
4. Suche nach den Test-Einträgen (z.B. Name enthält "TEST")

## Cleanup (Testdaten löschen)

Die Test-Skripte enthalten automatische Cleanup-Funktionen. Für manuelle Tests kannst du:

1. **Über die Chat-API löschen:**
   ```
   Lösche das Projekt "TestProjekt"
   ```

2. **Direkt in Supabase:**
   - Im Table Editor die Zeilen manuell löschen

## Bekannte Einschränkungen

1. **RLS (Row Level Security):**
   - `t_chats` und `t_chat_messages` haben aktive RLS-Policies
   - Diese Tabellen sind NICHT in `INSERT_ALLOWED_TABLES` enthalten

2. **Foreign Key Constraints:**
   - Beim Erstellen von `t_morningplan_staff` muss `plan_id` und `employee_id` existieren
   - Beim Erstellen von `t_material_prices` muss `material_id` existieren

3. **Unique Constraints:**
   - `project_code` muss eindeutig sein
   - `employee_code` muss eindeutig sein
   - `material_id` muss eindeutig sein
   - `vehicle_id` muss eindeutig sein

## Fehlerbehebung

### "Service role key not configured"
- Stelle sicher, dass `SUPABASE_SERVICE_ROLE_KEY` in der `.env` Datei gesetzt ist
- Starte den Server neu nach Änderungen an der `.env` Datei

### "Invalid table name"
- Überprüfe, ob die Tabelle in `INSERT_ALLOWED_TABLES` enthalten ist
- Siehe `lib/constants.ts` für die Liste der erlaubten Tabellen

### "Foreign key constraint violation"
- Stelle sicher, dass referenzierte Einträge existieren
- Beispiel: Beim Erstellen von `t_morningplan_staff` müssen `plan_id` und `employee_id` existieren

## Nächste Schritte

Nach erfolgreichen Tests kannst du:

1. Weitere Tabellen zu `INSERT_ALLOWED_TABLES` hinzufügen (falls nötig)
2. Zusätzliche Validierungen in `lib/validation.ts` hinzufügen
3. Audit-Logs in `lib/audit-log.ts` überprüfen
4. Die Funktionalität in der Produktionsumgebung testen
