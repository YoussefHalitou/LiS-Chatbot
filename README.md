# LiS Operations Assistant

Ein intelligenter Chatbot für Projektplanung, Mitarbeiterverwaltung und Einsatzkoordination bei Land in Sicht.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/YoussefHalitou/LiS-Chatbot)

## ✨ Features

- 💬 **Text-Chat** mit OpenAI GPT-4o - intelligente Datenbankabfragen in natürlicher Sprache
- 🎤 **Sprach-Eingabe** (Speech-to-Text) mit Deepgram
- 🔊 **Sprach-Ausgabe** (Text-to-Speech) mit ElevenLabs
- 🗄️ **Supabase Datenbank-Integration** - Projekte, Mitarbeiter, Einsatzplanung
- 🌙 **Dark/Light Mode** - systemweite Theme-Unterstützung
- 📱 **Mobile-optimiert** - responsives Design für alle Geräte
- 🔒 **Authentifizierung** - Supabase Auth mit E-Mail/Passwort

## 🛠️ Technologie-Stack

| Technologie | Verwendung |
|-------------|-----------|
| **Next.js 14** | React Framework mit App Router |
| **TypeScript** | Type-sichere Entwicklung |
| **Tailwind CSS** | Utility-first Styling |
| **OpenAI API** | GPT-4o für natürliche Sprachverarbeitung |
| **Supabase** | PostgreSQL Datenbank & Authentifizierung |
| **Deepgram** | Speech-to-Text (optional) |
| **ElevenLabs** | Text-to-Speech (optional) |

## 🚀 Schnellstart

### Voraussetzungen

- Node.js 18.17 oder höher
- npm oder yarn
- Supabase Account
- OpenAI API Key

### Installation

1. **Repository klonen:**
   ```bash
   git clone https://github.com/YoussefHalitou/LiS-Chatbot.git
   cd LiS-Chatbot
   ```

2. **Dependencies installieren:**
   ```bash
   npm install
   ```

3. **Umgebungsvariablen einrichten:**
   
   Kopiere `env.example` nach `.env.local`:
   ```bash
   cp env.example .env.local
   ```
   
   Fülle die erforderlichen Werte aus:
   ```env
   # Erforderlich
   OPENAI_API_KEY=sk-...
   NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
   
   # Empfohlen
   SUPABASE_SERVICE_ROLE_KEY=eyJ...
   
   # Optional (für Sprach-Features)
   DEEPGRAM_API_KEY=...
   ELEVENLABS_API_KEY=...
   ```

4. **Supabase einrichten:**
   - Erstelle ein neues Projekt auf [supabase.com](https://supabase.com)
   - Führe die Migration in `supabase/migrations/` aus
   - Deaktiviere E-Mail-Bestätigung für Entwicklung (Auth → Settings)

5. **Development Server starten:**
   ```bash
   npm run dev
   ```

6. **Öffne** [http://localhost:3000](http://localhost:3000)

## 📦 Deployment

### Vercel (Empfohlen)

1. **Verbinde dein Repository mit Vercel:**
   - Besuche [vercel.com/new](https://vercel.com/new)
   - Importiere das GitHub Repository
   - Vercel erkennt Next.js automatisch

2. **Umgebungsvariablen setzen:**
   - Im Vercel Dashboard → Settings → Environment Variables
   - Füge alle Variablen aus `.env.local` hinzu

3. **Deploy:**
   - Automatisch bei jedem Push zu `main`
   - Oder manuell via Vercel CLI: `vercel --prod`

### Andere Plattformen

Die App kann auf jeder Plattform deployed werden, die Next.js unterstützt:
- Netlify
- Railway
- AWS Amplify
- Self-hosted mit `npm run build && npm run start`

## 🔧 Verfügbare Scripts

```bash
npm run dev        # Development Server
npm run build      # Production Build
npm run start      # Production Server starten
npm run lint       # Linting prüfen
npm run lint:fix   # Linting automatisch fixen
npm run type-check # TypeScript Typen prüfen
npm run validate   # Lint + Type-Check
npm run clean      # Build Cache löschen
```

## 📊 Health Check

Die App bietet einen Health-Check-Endpoint:

```
GET /api/health
```

Gibt den Status aller Services zurück:
- OpenAI API
- Supabase Verbindung
- Deepgram (optional)
- ElevenLabs (optional)

## 🔒 Sicherheit

- **Rate Limiting** - Schutz vor API-Missbrauch
- **Input Validation** - SQL-Injection-Schutz
- **Security Headers** - HSTS, CSP, X-Frame-Options
- **Environment Variables** - Keine Secrets im Code

## 📱 Browser-Unterstützung

| Browser | Status | Hinweise |
|---------|--------|----------|
| Chrome (Desktop & Mobile) | ✅ | Vollständig unterstützt |
| Firefox (Desktop & Mobile) | ✅ | Vollständig unterstützt |
| Safari (iOS 14.3+) | ✅ | Vollständig unterstützt |
| Safari (macOS) | ⚠️ | HTTPS für Mikrofon erforderlich |
| Edge | ✅ | Vollständig unterstützt |

## 📄 Lizenz

Privates Projekt - © Land in Sicht

## 🤝 Support

Bei Fragen oder Problemen erstelle ein [Issue](https://github.com/YoussefHalitou/LiS-Chatbot/issues).
