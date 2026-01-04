#!/bin/bash
# Quick Test Script - Führt schnelle Tests durch
# Usage: ./test-bot-quick.sh

echo "🚀 Quick Bot Test"
echo "=================="
echo ""

# Prüfe ob Server läuft
if ! curl -s http://localhost:3000/api/health > /dev/null 2>&1; then
    echo "❌ Server läuft nicht auf http://localhost:3000"
    echo "   Starte den Server mit: npm run dev"
    exit 1
fi

echo "✅ Server läuft"
echo ""

# Führe Tests aus
echo "📋 Führe Tests aus..."
echo ""

# Test 1: INSERT Project
echo "[1/5] Test INSERT Project..."
RESPONSE=$(curl -s -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"Erstelle ein neues Projekt: Name ist QuickTest, Stadt ist Berlin"}]}')

if echo "$RESPONSE" | grep -q "insertRow"; then
    echo "   ✅ INSERT Project funktioniert"
else
    echo "   ❌ INSERT Project fehlgeschlagen"
fi

# Test 2: QUERY Projects
echo "[2/5] Test QUERY Projects..."
RESPONSE=$(curl -s -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"Zeige mir alle Projekte"}]}')

if echo "$RESPONSE" | grep -q "queryTable"; then
    echo "   ✅ QUERY Projects funktioniert"
else
    echo "   ❌ QUERY Projects fehlgeschlagen"
fi

# Test 3: UPDATE Project
echo "[3/5] Test UPDATE Project..."
RESPONSE=$(curl -s -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"Ändere den Status von Projekt QuickTest auf In Bearbeitung"}]}')

if echo "$RESPONSE" | grep -q "updateRow"; then
    echo "   ✅ UPDATE Project funktioniert"
else
    echo "   ❌ UPDATE Project fehlgeschlagen"
fi

# Test 4: DELETE Project
echo "[4/5] Test DELETE Project..."
RESPONSE=$(curl -s -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"Lösche das Projekt QuickTest"}]}')

if echo "$RESPONSE" | grep -q "queryTable"; then
    echo "   ✅ DELETE Project Workflow funktioniert (fragt nach Bestätigung)"
else
    echo "   ❌ DELETE Project fehlgeschlagen"
fi

# Test 5: Error Handling
echo "[5/5] Test Error Handling..."
RESPONSE=$(curl -s -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"Erstelle einen Eintrag in der Tabelle invalid_table"}]}')

if echo "$RESPONSE" | grep -q "error\|Error"; then
    echo "   ✅ Error Handling funktioniert"
else
    echo "   ⚠️  Error Handling: Kein klarer Fehler erkannt"
fi

echo ""
echo "✅ Quick Tests abgeschlossen!"
echo ""
echo "💡 Für umfassende Tests führe aus:"
echo "   npm run test:bot"
echo "   oder"
echo "   npx tsx test-bot-comprehensive.ts"
