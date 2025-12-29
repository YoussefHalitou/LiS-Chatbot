# Verbesserungsvorschläge für den LiS Chatbot

**Datum:** 2025-12-30  
**Status:** Priorisierte Verbesserungen basierend auf aktuellen Problemen

---

## 🔴 HOCH-PRIORITÄT (Sofort umsetzbar)

### 1. **Verbesserte Mitarbeiter-Suche**
**Problem:** Bot findet Mitarbeiter nicht, wenn sie nicht in den ersten 10 Ergebnissen sind.

**Lösung:**
- Implementiere eine intelligente Mitarbeiter-Suche mit Fuzzy-Matching
- Verwende `ilike` statt `eq` für Namenssuche (case-insensitive, teilweise Übereinstimmung)
- Erhöhe Limit auf 50-100 für Mitarbeiter-Suchen
- Implementiere Fallback: Wenn nicht gefunden, suche mit `ilike` Pattern

**Code-Beispiel:**
```typescript
// In queryTable für t_employees:
// Statt: {name: "Achim"} 
// Verwende: {name: {type: "ilike", value: "%Achim%"}}
```

**Vorteile:**
- Findet Mitarbeiter auch bei Tippfehlern
- Funktioniert auch wenn Name nicht exakt übereinstimmt
- Höhere Erfolgsrate bei Mitarbeiter-Zuordnung

---

### 2. **Bessere Kontext-Erkennung für Projekte**
**Problem:** Bot verwechselt Projekte mit ähnlichen Namen oder ignoriert Datum.

**Lösung:**
- Verbessere `inferProjectIdentifier` um Datum + Name zu kombinieren
- Speichere letzten Kontext (Projekt + Datum) in Conversation State
- Wenn User Projekt korrigiert, sofort Kontext wechseln

**Code-Beispiel:**
```typescript
// Erweitere inferProjectIdentifier:
const projectContext = {
  projectName: extractedName,
  projectDate: extractedDate, // WICHTIG: Auch Datum extrahieren!
  projectId: null, // Wird später gefunden
}
```

**Vorteile:**
- Keine Verwechslung von Projekten
- Bessere Genauigkeit bei Updates
- User muss weniger korrigieren

---

### 3. **Intelligente Query-Filterung**
**Problem:** Bot zeigt zu viele Ergebnisse oder falsche Daten.

**Lösung:**
- Automatische Datums-Filterung basierend auf User-Intent
- "heute" → automatisch heute's Datum filtern
- "morgen" → automatisch morgen's Datum filtern
- "diese Woche" → automatisch Woche filtern

**Vorteile:**
- Weniger irrelevante Ergebnisse
- Schnellere Antworten
- Bessere User Experience

---

### 4. **Bessere Fehlermeldungen bei Mitarbeiter-Zuordnung**
**Problem:** "Missing values for insertRow" ist nicht hilfreich.

**Lösung:**
- Detaillierte Fehlermeldungen:
  - "Mitarbeiter 'Achim' nicht gefunden" → Liste ähnlicher Namen
  - "Plan für Projekt 'Besichtigung' am 30.12. nicht gefunden" → Zeige verfügbare Pläne
  - "Mitarbeiter bereits zugeordnet" → Bestätigung statt Fehler

**Code-Beispiel:**
```typescript
if (insertResult.error?.includes('duplicate') || insertResult.error?.includes('unique')) {
  return "Der Mitarbeiter ist bereits diesem Projekt zugeordnet."
}
```

**Vorteile:**
- User versteht sofort, was schiefgelaufen ist
- Weniger Frustration
- Schnellere Problemlösung

---

## 🟡 MITTEL-PRIORITÄT (Nächste Iteration)

### 5. **Query-Result Caching**
**Beschreibung:** Cache häufig abgerufene Daten (Mitarbeiterliste, aktive Projekte).

**Implementierung:**
```typescript
// lib/cache.ts
const queryCache = new Map<string, { data: any; timestamp: number }>()
const CACHE_TTL = 5 * 60 * 1000 // 5 Minuten

export async function cachedQueryTable(
  tableName: string,
  filters: Record<string, any>,
  ttl: number = CACHE_TTL
) {
  const cacheKey = `${tableName}:${JSON.stringify(filters)}`
  const cached = queryCache.get(cacheKey)
  
  if (cached && Date.now() - cached.timestamp < ttl) {
    return cached.data
  }
  
  const result = await queryTable(tableName, filters)
  queryCache.set(cacheKey, { data: result, timestamp: Date.now() })
  return result
}
```

**Vorteile:**
- Schnellere Antwortzeiten
- Geringere Datenbanklast
- Niedrigere API-Kosten

---

### 6. **Optimistic UI Updates**
**Beschreibung:** Zeige sofort Feedback, bevor Operation abgeschlossen ist.

**Beispiel:**
- User: "Füge Achim hinzu"
- UI zeigt sofort: "Achim wird hinzugefügt..."
- Bei Erfolg: "Achim wurde hinzugefügt ✓"
- Bei Fehler: Rollback + Fehlermeldung

**Vorteile:**
- Schnelleres Feedback
- Bessere User Experience
- Gefühl von Responsivität

---

### 7. **Bessere Tool-Ergebnis-Interpretation**
**Problem:** Bot zeigt manchmal noch JSON, obwohl Regeln vorhanden sind.

**Lösung:**
- Post-Processing: Entferne JSON-Blöcke aus Bot-Antworten
- Validierung: Prüfe Antwort vor Anzeige auf JSON-Patterns
- Fallback: Wenn JSON erkannt, formatiere automatisch

**Code-Beispiel:**
```typescript
// In handleToolCalls oder nach Bot-Antwort:
function sanitizeBotResponse(content: string): string {
  // Entferne JSON-Blöcke
  const jsonPattern = /\{[\s\S]*"data"[\s\S]*\}/g
  return content.replace(jsonPattern, '[Daten wurden verarbeitet]')
}
```

---

### 8. **Context Memory Verbesserung**
**Problem:** Bot vergisst manchmal Kontext zwischen Nachrichten.

**Lösung:**
- Speichere letzten Projekt-Kontext (Name + Datum)
- Speichere letzte Aktion (z.B. "Mitarbeiter hinzufügen")
- Verwende Kontext für nächste Nachricht automatisch

**Vorteile:**
- Weniger Nachfragen
- Natürlichere Konversation
- Bessere User Experience

---

## 🟢 NIEDRIG-PRIORITÄT (Nice-to-have)

### 9. **Batch-Operationen**
**Beschreibung:** Mehrere Mitarbeiter auf einmal hinzufügen.

**Beispiel:**
- User: "Füge Achim, Ali und Björn zu Projekt X hinzu"
- Bot führt alle 3 Operationen in einer Transaktion aus

**Vorteile:**
- Schneller für User
- Atomare Operationen
- Weniger API-Calls

---

### 10. **Erweiterte Suche**
**Beschreibung:** Suche nach Teilen von Namen, Projektcodes, etc.

**Beispiel:**
- "Suche nach Projekten mit 'Umzug'"
- "Zeige alle Mitarbeiter mit 'A' im Namen"

**Vorteile:**
- Flexiblere Suche
- Bessere Findbarkeit
- Weniger exakte Eingaben nötig

---

### 11. **Chat-Verlauf Export**
**Beschreibung:** Exportiere Chat-Verlauf als PDF/JSON/TXT.

**Vorteile:**
- Dokumentation
- Backup
- Weitergabe

---

### 12. **Dark Mode**
**Beschreibung:** Dark Mode Support für bessere Lesbarkeit.

**Vorteile:**
- Bessere UX
- Moderne Optik
- Weniger Augenbelastung

---

## 📊 Priorisierungsmatrix

### Phase 1 (Diese Woche):
1. ✅ Verbesserte Mitarbeiter-Suche (Fuzzy-Matching)
2. ✅ Bessere Kontext-Erkennung (Projekt + Datum)
3. ✅ Intelligente Query-Filterung
4. ✅ Bessere Fehlermeldungen

### Phase 2 (Nächste Woche):
5. Query-Result Caching
6. Optimistic UI Updates
7. Tool-Ergebnis-Sanitization

### Phase 3 (Nächster Monat):
8. Context Memory Verbesserung
9. Batch-Operationen
10. Erweiterte Suche

### Phase 4 (Langfristig):
11. Chat-Verlauf Export
12. Dark Mode
13. Weitere UX-Verbesserungen

---

## 🎯 Empfohlene Reihenfolge

**Sofort umsetzen (höchste Impact):**
1. Verbesserte Mitarbeiter-Suche mit Fuzzy-Matching
2. Bessere Fehlermeldungen bei Mitarbeiter-Zuordnung
3. Intelligente Query-Filterung (Datum-basiert)

**Dann:**
4. Query-Result Caching
5. Optimistic UI Updates
6. Context Memory Verbesserung

**Später:**
7. Batch-Operationen
8. Erweiterte Suche
9. Export-Features

---

## 💡 Quick Wins (Schnell umsetzbar, hoher Impact)

1. **Fuzzy-Matching für Mitarbeiter-Suche** (1-2 Stunden)
   - Ändere `{name: "Achim"}` zu `{name: {type: "ilike", value: "%Achim%"}}`
   - Sofortige Verbesserung der Erfolgsrate

2. **Bessere Fehlermeldungen** (1 Stunde)
   - Erweitere `formatErrorMessage` um spezifische Fälle
   - Sofort besseres User-Feedback

3. **Automatische Datums-Filterung** (2 Stunden)
   - Erweitere `applyDateRangeFilters` um mehr Kontexte
   - Weniger irrelevante Ergebnisse

---

**Hinweis:** Diese Vorschläge basieren auf den aktuellen Problemen im Chatbot. Priorisiere basierend auf deinen spezifischen Anforderungen.

