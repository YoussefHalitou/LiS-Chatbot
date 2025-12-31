# Tests mit .env.local

## Status

✅ `.env.local` ist ausgefüllt
✅ Server läuft mit Umgebungsvariablen aus `.env.local`

## Server-Status

- **URL**: http://localhost:3000
- **Health Check**: http://localhost:3000/api/health

## Tests durchführen

### 1. Health Check
```bash
curl http://localhost:3000/api/health
```

**Erwartet**: Status "healthy" oder "degraded" (je nachdem welche optionalen Services konfiguriert sind)

### 2. Browser-Test
Öffne http://localhost:3000 im Browser

### 3. Funktionale Tests

- [ ] **Authentifizierung**: Login/Registrierung funktioniert
- [ ] **Chat Interface**: Nachricht senden funktioniert
- [ ] **Streaming**: Antworten werden gestreamt
- [ ] **Database Queries**: Datenbank-Abfragen funktionieren
- [ ] **Voice Input**: Mikrofon-Aufnahme (falls Deepgram konfiguriert)
- [ ] **Voice Output**: Text-to-Speech (falls ElevenLabs konfiguriert)
- [ ] **Chat Management**: Neue Chats erstellen, zwischen Chats wechseln

## Bekannte Konfiguration

- ✅ OpenAI API Key konfiguriert (für Chat)
- ✅ Supabase konfiguriert (für Datenbank)
- ⚠️ Deepgram API Key (optional, für Speech-to-Text)
- ⚠️ ElevenLabs API Key (optional, für Text-to-Speech)

## Troubleshooting

### Server nicht erreichbar
```bash
# Prüfe ob Server läuft
ps aux | grep "next dev"

# Starte Server neu
npm run dev
```

### API Keys werden nicht geladen
- Stelle sicher, dass `.env.local` im Projekt-Root liegt
- Starte den Server neu nach Änderungen in `.env.local`
- Prüfe, dass keine Leerzeichen um die `=` Zeichen sind

### Fehler bei Supabase
- Prüfe, dass `NEXT_PUBLIC_SUPABASE_URL` mit `https://` beginnt
- Prüfe, dass die Keys korrekt kopiert wurden (keine zusätzlichen Zeichen)

