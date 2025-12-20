# LiS Chatbot

Ein vollständiger Chatbot mit Text- und Sprach-Ein-/Ausgabe, verbunden mit Supabase und OpenAI.

## Features

- 💬 Text-Chat mit OpenAI GPT-4o
- 🎤 Sprach-Eingabe (Speech-to-Text) mit Deepgram
- 🔊 Sprach-Ausgabe (Text-to-Speech) mit ElevenLabs
- 🗄️ Supabase Datenbank-Integration
- 📱 Mobile-optimiertes Design

## Technologie-Stack

- **Next.js 14** - React Framework
- **TypeScript** - Type Safety
- **Tailwind CSS** - Styling
- **OpenAI API** - LLM für Chat
- **Supabase** - Datenbank
- **Deepgram** - Speech-to-Text
- **ElevenLabs** - Text-to-Speech

## Lokale Entwicklung

1. **Dependencies installieren:**
   ```bash
   npm install
   ```

2. **Umgebungsvariablen einrichten:**
   Erstelle eine `.env.local` Datei mit folgenden Variablen:
   ```env
   OPENAI_API_KEY=dein_openai_key
   SUPABASE_URL=deine_supabase_url
   SUPABASE_SERVICE_ROLE_KEY=dein_service_role_key
   DEEPGRAM_API_KEY=dein_deepgram_key
   ELEVENLABS_API_KEY=dein_elevenlabs_key
   ELEVENLABS_VOICE_ID=deine_voice_id (optional, Standard: Rachel)
   INTERNAL_API_KEY=geheimer_schluessel_fuer_api_zugriff
   NEXT_PUBLIC_INTERNAL_API_KEY=gleicher_schluessel_fuer_den_client
   ```

3. **Development Server starten:**
   ```bash
   npm run dev
   ```

4. **Öffne** [http://localhost:3000](http://localhost:3000)

## Deployment auf Vercel

### Option 1: Via Vercel CLI (Empfohlen)

1. **Vercel CLI installieren** (falls noch nicht installiert):
   ```bash
   npm install -g vercel
   ```

2. **Login:**
   ```bash
   vercel login
   ```

3. **Deploy:**
   ```bash
   vercel
   ```

4. **Umgebungsvariablen setzen:**
   Gehe zu [Vercel Dashboard](https://vercel.com/dashboard) → Dein Projekt → Settings → Environment Variables
   
   Füge alle Variablen aus `.env.local` hinzu:
   - `OPENAI_API_KEY`
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `DEEPGRAM_API_KEY`
   - `ELEVENLABS_API_KEY`
   - `ELEVENLABS_VOICE_ID` (optional)

5. **Production Deploy:**
   ```bash
   vercel --prod
   ```

### Option 2: Via GitHub Integration

1. **Code zu GitHub pushen:**
   ```bash
   git add .
   git commit -m "Ready for deployment"
   git push origin main
   ```

2. **Vercel Dashboard:**
   - Gehe zu [vercel.com](https://vercel.com)
   - Klicke auf "New Project"
   - Verbinde dein GitHub Repository
   - Vercel erkennt automatisch Next.js

3. **Umgebungsvariablen setzen:**
   - Im Vercel Dashboard → Settings → Environment Variables
   - Füge alle Variablen hinzu (siehe oben)

4. **Deploy:**
   - Vercel deployed automatisch bei jedem Push zu `main`

### Sicher mit API Keys umgehen

- **Keine Secrets commiten:** Die Datei `.env.local` ist bereits im `.gitignore` aufgeführt. Trage dort lokal deine echten Schlüssel ein, aber pushe die Datei niemals. Für geteilte Beispiele verwende nur Platzhalterwerte.
- **Vercel-Dashboards nutzen:** Hinterlege produktive Keys ausschließlich im Vercel-UI unter *Settings → Environment Variables*. So bleiben sie aus dem Code-Repository und Build-Logs heraus.
- **Rotation einplanen:** Erzeuge bei Bedarf neue OpenAI-Schlüssel und ersetze den alten Wert in `.env.local` bzw. im Vercel-Dashboard. Lösche anschließend den alten Schlüssel im OpenAI-Account, falls er kompromittiert sein könnte.
- **Zugriff einschränken:** Gib Teammitgliedern nur die notwendigen Rollen im OpenAI- und Vercel-Workspace. Teilst du Builds mit anderen, nutze separate Projekt-Keys statt deinen persönlichen Hauptschlüssel.

## Wichtige Hinweise

- **HTTPS erforderlich:** Die Mikrofon-API funktioniert nur über HTTPS (oder localhost). Daher ist Hosting auf Vercel empfohlen.
- **API Keys:** Stelle sicher, dass alle API Keys in Vercel gesetzt sind. Für alle API-Routen (`/api/chat`, `/api/stt`, `/api/tts`) muss der Header `x-api-key` mit `INTERNAL_API_KEY` gesendet werden. Damit der Client diesen Header senden kann, muss derselbe Wert zusätzlich als `NEXT_PUBLIC_INTERNAL_API_KEY` bereitgestellt werden.
- **Ratenbegrenzung:** Die API-Routen begrenzen Anfragen pro Minute (z.B. `/api/chat` 30 Anfragen/Minute, `/api/stt` 20 Anfragen/Minute, `/api/tts` 30 Anfragen/Minute) basierend auf der Quell-IP. Bei Überschreitung wird ein 429-Fehler mit `Retry-After` Header zurückgegeben.
- **Health Check:** `GET /api/health` liefert den aktuellen Status der benötigten Umgebungsvariablen (ohne Werte offenzulegen), inkl. des Client-Keys `NEXT_PUBLIC_INTERNAL_API_KEY`, und gibt bei fehlenden Variablen HTTP 503 zurück. Optionale Werte wie `ELEVENLABS_VOICE_ID` werden ebenfalls als vorhanden/nicht vorhanden ausgewiesen. Nutze den Endpunkt für Monitoring oder Deployment-Validierung.
- **Supabase:** Verwende den Service Role Key für Admin-Zugriff auf die Datenbank.

## Schnelltests (lokal)

Nutze diese Befehle, um die Absicherungen schnell zu prüfen:

1. **Linting:**
   ```bash
   npm run lint
   ```
2. **Health-Check:**
   ```bash
   curl -i http://localhost:3000/api/health
   ```
   - Erwartet: `200 OK` wenn alle benötigten Variablen gesetzt sind, sonst `503 Service Unavailable` mit `ready: false` im JSON.
3. **Autorisierung der API-Routen:**
   ```bash
   curl -i -H "x-api-key: $INTERNAL_API_KEY" \
     -H "Content-Type: application/json" \
     -d '{"messages":[{"role":"user","content":"Hallo"}]}' \
     http://localhost:3000/api/chat
   ```
   - Erwartet: Ohne gültigen Schlüssel `401 Unauthorized`; mit korrektem Schlüssel `200 OK` oder ein gültiger Fehlercode der Upstream-Provider. Analog kannst du `/api/stt` (POST mit Audio) und `/api/tts` (POST mit `text`) testen.
4. **Ratenbegrenzung sichtbar machen:** Wiederhole den Aufruf einer Route schnell n-mal; bei Überschreitung erscheint `429 Too Many Requests` mit `Retry-After` und `X-RateLimit-*` Headern.

## Kann ich es jetzt nutzen?

Ja, wenn folgende Voraussetzungen erfüllt sind:

- **Umgebungsvariablen gesetzt:** Alle Pflicht-Keys (OpenAI, Supabase, Deepgram, ElevenLabs, `INTERNAL_API_KEY` und `NEXT_PUBLIC_INTERNAL_API_KEY`) müssen vorhanden sein; prüfe mit `GET /api/health`.
- **Authentifizierte Aufrufe:** Jeder Client-Request an `/api/chat`, `/api/stt` und `/api/tts` muss den Header `x-api-key: $INTERNAL_API_KEY` senden. Der Client nutzt dafür automatisch `NEXT_PUBLIC_INTERNAL_API_KEY`.
- **Grenzen beachten:** Chat begrenzt Nachrichtenanzahl/-länge; STT erlaubt nur unterstützte Audio-MIME-Typen und Größen; TTS limitiert Textlänge. Bei Überschreitung kommen 400er- oder 429-Antworten mit Hinweisen.

Bekannte Einschränkungen, die du einplanen solltest:

- **Supabase-RLS fehlt noch:** Der Service-Role-Key wird weiterhin serverseitig genutzt; setze das System nicht dem Internet aus, bevor RLS/Least-Privilege umgesetzt ist.
- **Keine Inhaltsmoderation:** Eingaben werden nicht auf toxische/PII-Inhalte geprüft; betreibe nur in kontrollierten Umgebungen.
- **Kein Streaming/Observability:** Antworten werden nicht gestreamt und es fehlen Telemetriedaten für Kosten/Fehler. Rechne mit längeren Antwortzeiten und begrenzter Einsicht.

## Wie es weitergeht (Empfohlene nächsten Schritte)

1. **Supabase absichern**
   - Aktiviere Row-Level Security für alle Tabellen und greife aus der Anwendung nur noch über RLS-geschützte Views/Policies zu.
   - Ersetze den Service-Role-Key im Runtime-Pfad durch einen User-bezogenen Token, damit Anfragen die richtigen Policies erben.

2. **Inhalts-Moderation hinzufügen**
   - Führe vor jedem OpenAI-Aufruf eine Moderationsprüfung durch (z.B. OpenAI Moderation API) und blocke oder entschärfe toxische/PII-haltige Eingaben.
   - Ergänze UI-Hinweise, die bei Blockierungen eine verständliche Begründung liefern.

3. **Streaming & Kontext-Optimierung umsetzen**
   - Schalte Token-Streaming für Chat-Antworten ein und schreibe den Client auf inkrementelles Rendering um.
   - Kürze den System-Prompt/Verlauf (z.B. nur letzte N-Nachrichten) oder fasse ältere Einträge zusammen, um Tokenkosten zu senken.

4. **Beobachtbarkeit und Kostenkontrolle**
   - Sammle strukturierte Server-Logs (Latenzen, Fehlerraten, Token-Usage) und setze Warnungen/Alerts auf Ausreißer.
   - Ergänze einfache Concurrency-Limits pro Route, damit parallele Anfragen nicht unkontrolliert eskalieren.

5. **Regressionen früh erkennen**
   - Führe `npm run lint` und `npm run build` lokal aus, bevor du neue Deployments anstößt.
   - Ergänze zeitnah automatisierte Tests (Unit + E2E) für Auth-Zwang, Ratenbegrenzung, Moderation und Streaming-Rendering.

## Browser-Unterstützung

- ✅ Chrome (Desktop & Mobile)
- ✅ Firefox (Desktop & Mobile)
- ✅ Safari (iOS 14.3+, macOS Safari 11+)
- ⚠️ Safari auf macOS benötigt HTTPS für Mikrofon-Zugriff

## Lizenz

Private Projekt

