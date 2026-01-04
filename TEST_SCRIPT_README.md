# Comprehensive Bot Test Script

Ein umfassendes Test-Script zum Testen aller Bot-Funktionalitäten.

## Übersicht

Das Script testet:
- ✅ **INSERT-Operationen** für alle erlaubten Tabellen (Projekte, Mitarbeiter, Materialien, Fahrzeuge, Services)
- ✅ **UPDATE-Operationen** (Status ändern, Werte aktualisieren)
- ✅ **DELETE-Operationen** (mit Bestätigungs-Workflow)
- ✅ **Query-Operationen** (Daten abfragen)
- ✅ **Fehlerbehandlung** (ungültige Tabellen, Filter, Werte)

## Voraussetzungen

1. **Node.js** v20+ installiert
2. **Server läuft** auf `http://localhost:3000` (oder setze `API_URL` Umgebungsvariable)
3. **Umgebungsvariablen** konfiguriert (`.env.local` mit Supabase und OpenAI Keys)

## Installation

```bash
# Dependencies installieren (falls noch nicht geschehen)
npm install

# TypeScript und tsx installieren (falls noch nicht vorhanden)
npm install --save-dev typescript tsx @types/node
```

## Verwendung

### Basis-Verwendung

```bash
# Mit npx tsx (empfohlen)
npx tsx test-bot-comprehensive.ts

# Oder mit ts-node
npx ts-node test-bot-comprehensive.ts

# Oder mit node (nach Kompilierung)
npx tsc test-bot-comprehensive.ts
node test-bot-comprehensive.js
```

### Mit Custom API URL

```bash
API_URL=http://localhost:3001/api/chat npx tsx test-bot-comprehensive.ts
```

### Mit Timeout-Anpassung

```bash
# Im Script: TEST_TIMEOUT = 60000 (60 Sekunden)
# Oder direkt im Code ändern
```

## Test-Ablauf

Das Script führt Tests in folgender Reihenfolge aus:

1. **INSERT Tests**
   - Erstellt Test-Einträge für Projekte, Mitarbeiter, Materialien, Fahrzeuge, Services
   - Speichert IDs für spätere Tests

2. **UPDATE Tests**
   - Ändert Status von Projekten
   - Aktualisiert Stundensätze von Mitarbeitern
   - Ändert Material-Namen

3. **Query Tests**
   - Testet Abfragen für Projekte, Mitarbeiter, Materialien

4. **DELETE Tests**
   - Testet Lösch-Workflow mit Bestätigung
   - Löscht alle erstellten Test-Einträge

5. **Error Handling Tests**
   - Testet ungültige Tabellen
   - Testet ungültige Filter
   - Testet fehlende Werte

## Ausgabe

### Console Output

Das Script gibt während der Ausführung detaillierte Informationen aus:

```
🚀 Starting Comprehensive Bot Tests

API URL: http://localhost:3000/api/chat

============================================================
📋 INSERT Operations
============================================================

[001] Testing: INSERT Project...
✅ PASS (1234ms)

[002] Testing: INSERT Employee...
✅ PASS (987ms)
...
```

### Test Summary

Am Ende wird eine Zusammenfassung ausgegeben:

```
============================================================
📊 TEST SUMMARY
============================================================

Total Tests: 25
✅ Passed: 23
❌ Failed: 2
⏭️  Skipped: 0
⏱️  Total Duration: 45678ms
📈 Success Rate: 92.0%

❌ Failed Tests:
  - UPDATE Employee Hourly Rate: No updateRow tool call found
  - DELETE Service: No deleteRow tool call found
```

### JSON Report

Das Script erstellt automatisch einen JSON-Report:

```
test-results-2026-01-04T04-30-00-000Z.json
```

Der Report enthält:
- Timestamp
- Zusammenfassung (Total, Passed, Failed, Skipped)
- Detaillierte Ergebnisse für jeden Test
- Test-Daten (IDs der erstellten Einträge)

## Test-Ergebnisse interpretieren

### ✅ PASS
- Test wurde erfolgreich durchgeführt
- Erwartetes Verhalten wurde beobachtet

### ❌ FAIL
- Test ist fehlgeschlagen
- Mögliche Ursachen:
  - API nicht erreichbar
  - Bot-Antwort entspricht nicht den Erwartungen
  - Tool-Calls fehlen oder sind falsch
  - Timeout

### ⏭️ SKIP
- Test wurde übersprungen
- Normalerweise, weil Test-Daten fehlen (z.B. UPDATE ohne vorherigen INSERT)

## Anpassungen

### Timeout ändern

```typescript
const TEST_TIMEOUT = 60000 // 60 Sekunden
```

### Weitere Tests hinzufügen

```typescript
private async testCustomOperation(): Promise<void> {
  await this.test('Custom Test', async () => {
    const response = await this.sendMessage('Deine Test-Nachricht')
    // Test-Logik hier
    return 'success'
  })
}
```

### Test-Daten anpassen

Die Test-Daten werden automatisch generiert mit Timestamps:

```typescript
const projectName = `TestProject_${Date.now()}`
```

## Troubleshooting

### "API URL not reachable"
- Stelle sicher, dass der Server läuft: `npm run dev`
- Prüfe die `API_URL` Umgebungsvariable

### "Test timeout"
- Erhöhe `TEST_TIMEOUT` im Script
- Prüfe, ob der Server langsam antwortet

### "No tool call found"
- Der Bot hat möglicherweise nicht das erwartete Tool aufgerufen
- Prüfe die Bot-Antworten im JSON-Report
- Möglicherweise muss der Prompt angepasst werden

### "Insert failed"
- Prüfe Supabase-Verbindung
- Prüfe Umgebungsvariablen (`.env.local`)
- Prüfe, ob die Tabelle in `INSERT_ALLOWED_TABLES` ist

## Beispiel-Output

```
🚀 Starting Comprehensive Bot Tests

API URL: http://localhost:3000/api/chat

============================================================
📋 INSERT Operations
============================================================

[001] Testing: INSERT Project...
✅ PASS (1234ms)

[002] Testing: INSERT Employee...
✅ PASS (987ms)

[003] Testing: INSERT Material...
✅ PASS (1123ms)

[004] Testing: INSERT Vehicle...
✅ PASS (1456ms)

[005] Testing: INSERT Service...
✅ PASS (1345ms)

============================================================
📋 UPDATE Operations
============================================================

[006] Testing: UPDATE Project Status...
✅ PASS (2345ms)

[007] Testing: UPDATE Employee Hourly Rate...
✅ PASS (1987ms)

[008] Testing: UPDATE Material...
✅ PASS (1765ms)

============================================================
📋 Query Operations
============================================================

[009] Testing: QUERY Projects...
✅ PASS (1234ms)

[010] Testing: QUERY Employees...
✅ PASS (1123ms)

[011] Testing: QUERY Materials...
✅ PASS (1098ms)

============================================================
📋 DELETE Operations
============================================================

[012] Testing: DELETE Project...
✅ PASS (3456ms)

[013] Testing: DELETE Employee...
✅ PASS (2987ms)

[014] Testing: DELETE Material...
✅ PASS (2765ms)

[015] Testing: DELETE Vehicle...
✅ PASS (3123ms)

[016] Testing: DELETE Service...
✅ PASS (2987ms)

============================================================
📋 Error Handling
============================================================

[017] Testing: Error: Invalid Table...
✅ PASS (987ms)

[018] Testing: Error: Invalid Filters...
✅ PASS (1123ms)

[019] Testing: Error: Missing Values...
✅ PASS (1098ms)

============================================================
📊 TEST SUMMARY
============================================================

Total Tests: 19
✅ Passed: 19
❌ Failed: 0
⏭️  Skipped: 0
⏱️  Total Duration: 45678ms
📈 Success Rate: 100.0%

💾 Results saved to: test-results-2026-01-04T04-30-00-000Z.json
```

## Integration in CI/CD

Das Script kann in CI/CD-Pipelines integriert werden:

```yaml
# .github/workflows/test.yml
name: Bot Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '20'
      - run: npm install
      - run: npm run dev &
      - run: sleep 10
      - run: npx tsx test-bot-comprehensive.ts
      - run: |
          if [ $? -ne 0 ]; then
            echo "Tests failed!"
            exit 1
          fi
```

## Weitere Informationen

- Siehe `TEST_INSERT_ERGEBNISSE.md` für detaillierte INSERT-Tests
- Siehe `TEST_UPDATE_DELETE_ERGEBNISSE.md` für UPDATE/DELETE-Tests
- Siehe `BOT_TABELLEN_UEBERSICHT.md` für Tabellen-Übersicht
