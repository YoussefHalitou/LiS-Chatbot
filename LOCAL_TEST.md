# Lokale Tests - Anleitung

## Server starten

```bash
npm run dev
```

Der Server läuft dann auf: http://localhost:3000

## Test-Checkliste

### 1. Health Check ✅
```bash
curl http://localhost:3000/api/health
```
**Erwartet**: Status "healthy" mit allen Services OK

### 2. Chat API Test ✅
```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"Hallo"}],"chatId":null}'
```
**Erwartet**: Streaming Response (Server-Sent Events)

### 3. Browser Tests

Öffne http://localhost:3000 im Browser und teste:

- [ ] **Authentifizierung**: Login/Registrierung funktioniert
- [ ] **Chat Interface**: Nachricht senden funktioniert
- [ ] **Streaming**: Antworten werden gestreamt
- [ ] **Voice Input**: Mikrofon-Aufnahme (falls Browser-Support)
- [ ] **Voice Output**: Text-to-Speech (falls aktiviert)
- [ ] **Chat Management**: Neue Chats erstellen, zwischen Chats wechseln
- [ ] **Error Handling**: Fehler werden korrekt angezeigt

### 4. Funktionale Tests

Teste verschiedene Anfragen:

- [ ] "Hallo" - Grundlegende Begrüßung
- [ ] "Liste alle Projekte auf" - Datenbank-Abfrage
- [ ] "Wann wurde das zuletzt erstellte Projekt erstellt?" - Formatierungstest
- [ ] "Zeige mir alle Mitarbeiter" - Tabellen-Formatierung

### 5. Formatierungs-Tests

Überprüfe:
- [ ] Datums-Formatierung: "18. Dezember 2025" (mit Leerzeichen)
- [ ] Zeit-Formatierung: "um 08:00 Uhr" (mit Leerzeichen)
- [ ] Tabellen werden korrekt formatiert
- [ ] Listen werden korrekt formatiert
- [ ] Absätze werden korrekt verwendet

### 6. Performance-Tests

- [ ] Antwortzeit < 5 Sekunden für einfache Anfragen
- [ ] Streaming startet schnell (< 1 Sekunde)
- [ ] Keine Memory Leaks bei längeren Sessions

## Bekannte Issues

- Security-Vulnerabilities in Dev-Dependencies (nicht kritisch für Production)
- Node.js Version sollte >= 18.17.0 sein für Next.js 14.2.35

## Troubleshooting

### Port bereits belegt
```bash
# Anderen Port verwenden
PORT=3001 npm run dev
```

### Dependencies nicht installiert
```bash
npm install
```

### Build-Fehler
```bash
# Cache löschen
rm -rf .next
npm run build
```

