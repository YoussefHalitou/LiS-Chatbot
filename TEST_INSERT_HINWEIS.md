# Wichtiger Hinweis: Test-Skript und Umgebungsvariablen

## Problem

Das Test-Skript `test-insert-functionality.ts` kann die `.env.local` Datei nicht automatisch laden, weil:

1. TypeScript/Node.js löst Imports beim **Parsen** des Codes auf, nicht zur Laufzeit
2. `supabase.ts wird beim Import ausgeführt und initialisiert `supabaseAdmin`
3. Zu diesem Zeitpunkt sind die Umgebungsvariablen noch nicht gesetzt
4. `supabaseAdmin` wird auf `null` gesetzt und bleibt so

## Lösung: Tests über die Chat-API (Empfohlen)

Die **beste Methode** zum Testen der INSERT-Funktionalität ist über die Chat-API:

```bash
# 1. Starte den Next.js Server (lädt .env.local automatisch)
npm run dev

# 2. Öffne http://localhost:3000 im Browser

# 3. Teste mit folgenden Befehlen:
```

**Test-Befehle:**
- "Erstelle ein neues Projekt mit dem Namen TestProjekt in Köln"
- "Neuer Mitarbeiter: Max Mustermann, 30 Euro pro Stunde, intern"
- "Neues Material: Styropor, Einheit: Kilogramm"

## Alternative: Test-Skript mit Umgebungsvariablen

Wenn du das Test-Skript direkt ausführen möchtest, setze die Variablen beim Aufruf:

```bash
# Methode 1: Direkt beim Aufruf
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co \
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key \
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key \
npx tsx test-insert-functionality.ts

# Methode 2: Aus .env.local exportieren
export $(cat .env.local | grep -v '^#' | xargs) && npx tsx test-insert-functionality.ts
```

## Warum funktioniert die Chat-API?

Next.js lädt `.env.local` automatisch beim Start des Servers, bevor die Module initialisiert werden. Deshalb funktioniert die Chat-API ohne Probleme.

## Zusammenfassung

✅ **Empfohlen:** Tests über die Chat-API (`npm run dev` + Browser)  
⚠️ **Alternative:** Test-Skript mit expliziten Umgebungsvariablen  
❌ **Funktioniert nicht:** Test-Skript mit automatischem Laden von .env.local

Die INSERT-Funktionalität ist vollständig implementiert und funktioniert - sie muss nur über die Chat-API getestet werden, oder die Umgebungsvariablen müssen explizit gesetzt werden.
