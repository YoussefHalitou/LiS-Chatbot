# Quick Start Guide

## Server starten

**Wichtig**: Verwende Node.js 18 oder höher!

```bash
# 1. Ins Projekt-Verzeichnis wechseln
cd /Users/youssef/.cursor/worktrees/LiS-Chatbot-codex-add-openai-streaming-support-and-fallback/hgj

# 2. Node.js 18 aktivieren (falls nvm installiert ist)
source ~/.nvm/nvm.sh
nvm use 18

# 3. Server starten
npm run dev
```

## Verzeichnis-Struktur

Das Projekt liegt in:
```
/Users/youssef/.cursor/worktrees/LiS-Chatbot-codex-add-openai-streaming-support-and-fallback/hgj
```

**NICHT** in:
```
/Users/youssef/Downloads/LiS-Chatbot-codex-add-openai-streaming-support-and-fallback
```

## .env.local

Stelle sicher, dass `.env.local` im Projekt-Verzeichnis (`hgj/`) liegt und echte Werte enthält (keine Platzhalter).

## Troubleshooting

### Node.js Version zu alt
```bash
# Mit nvm
nvm use 18

# Prüfe Version
node --version  # Sollte v18.x.x oder höher sein
```

### Server läuft nicht
```bash
# Alte Prozesse stoppen
pkill -f "next dev"

# Cache löschen (optional)
rm -rf .next

# Neu starten
npm run dev
```

## Server-URL

- **Development**: http://localhost:3000
- **Health Check**: http://localhost:3000/api/health

