# .env.local Setup

## Status

Die `.env.local` Datei wird benötigt, damit die App vollständig funktioniert.

## Erstellen der .env.local Datei

1. **Erstelle eine neue Datei** `.env.local` im Projekt-Root

2. **Füge folgende Variablen hinzu:**

```env
# OpenAI API Key (erforderlich für Chat)
OPENAI_API_KEY=your_openai_api_key_here

# Supabase Configuration (erforderlich)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here

# Deepgram API Key (optional, für Speech-to-Text)
DEEPGRAM_API_KEY=your_deepgram_api_key_here

# ElevenLabs API Key (optional, für Text-to-Speech)
ELEVENLABS_API_KEY=your_elevenlabs_api_key_here
ELEVENLABS_VOICE_ID=21m00Tcm4TlvDq8ikWAM
```

## Option: Vorlage verwenden

Eine `.env.local.example` Datei wurde erstellt. Du kannst sie kopieren:

```bash
cp .env.local.example .env.local
```

Dann die Werte in `.env.local` eintragen.

## Wichtig

- ✅ `.env.local` ist in `.gitignore` und wird **nicht** zu Git hinzugefügt
- ✅ Nach dem Erstellen der Datei, Server neu starten: `npm run dev`
- ✅ Next.js lädt `.env.local` automatisch beim Start

## Überprüfen

Nach dem Start des Servers, teste den Health Check:

```bash
curl http://localhost:3000/api/health
```

Wenn alle API Keys konfiguriert sind, sollten alle Services "ok" zeigen.

