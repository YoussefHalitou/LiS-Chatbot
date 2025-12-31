#!/bin/bash
# Script zum Starten des Next.js Development Servers mit Node.js 18

# Wechsle ins Projekt-Verzeichnis
cd "$(dirname "$0")"

# Aktiviere Node.js 18 (falls nvm installiert ist)
if [ -s "$HOME/.nvm/nvm.sh" ]; then
  source "$HOME/.nvm/nvm.sh"
  nvm use 18
fi

# Prüfe Node.js Version
NODE_VERSION=$(node --version)
echo "Node.js Version: $NODE_VERSION"

# Prüfe ob Node.js 18+ ist
if [[ ! "$NODE_VERSION" =~ ^v(18|19|20|21|22) ]]; then
  echo "⚠️  Warnung: Node.js 18+ wird empfohlen"
  echo "   Aktuelle Version: $NODE_VERSION"
  echo "   Erforderlich: >= v18.17.0"
  echo ""
  echo "Mit nvm: nvm install 18 && nvm use 18"
  echo ""
  read -p "Trotzdem fortfahren? (j/n) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[JjYy]$ ]]; then
    exit 1
  fi
fi

# Stoppe alte Server-Prozesse
pkill -f "next dev" 2>/dev/null
sleep 1

# Starte den Server
echo ""
echo "🚀 Starte Next.js Development Server..."
echo "📍 URL: http://localhost:3000"
echo ""
npm run dev

