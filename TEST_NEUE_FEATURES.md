# Testfälle für neue Features

**Datum:** 2025-12-30  
**Features:** Intelligente Statistiken, Batch-Operationen, Context Memory

---

## 🧪 Testfälle

### 1. Intelligente Statistiken

#### Test 1.1: Einfache Zählung
**Eingabe:** "Wie viele Mitarbeiter sind diese Woche eingeplant?"

**Erwartetes Verhalten:**
- Bot verwendet `getStatistics` Tool
- Zeigt Anzahl der eingeplanten Mitarbeiter für diese Woche
- Format: Klare Zahl oder Tabelle

#### Test 1.2: Gruppierte Statistiken
**Eingabe:** "Welches Projekt hat die meisten Mitarbeiter?"

**Erwartetes Verhalten:**
- Bot verwendet `getStatistics` mit `groupBy: 'project_name'`
- Zeigt Tabelle mit Projekten und Anzahl Mitarbeiter
- Sortiert nach Anzahl (höchste zuerst)

#### Test 1.3: Auslastung pro Mitarbeiter
**Eingabe:** "Zeige Auslastung pro Mitarbeiter diese Woche"

**Erwartetes Verhalten:**
- Bot verwendet `getStatistics` mit `groupBy: 'employee_name'`
- Zeigt Tabelle: Mitarbeiter | Anzahl Einsätze
- Filtert nach dieser Woche

#### Test 1.4: Projekt-Statistiken
**Eingabe:** "Wie viele Projekte gibt es diesen Monat?"

**Erwartetes Verhalten:**
- Bot verwendet `getStatistics` auf `t_projects`
- Filtert nach aktuellem Monat
- Zeigt Anzahl

---

### 2. Batch-Operationen

#### Test 2.1: Mehrere Mitarbeiter hinzufügen
**Eingabe:** "Füge Achim, Ali und Björn zu Projekt Alpha hinzu"

**Erwartetes Verhalten:**
- Bot erkennt 3 Mitarbeiter-Namen
- Führt 3x `insertRow` aus (einmal pro Mitarbeiter)
- Zeigt Zusammenfassung: "Ich habe 3 Mitarbeiter hinzugefügt: Achim, Ali, Björn"

#### Test 2.2: Teilweise erfolgreiche Batch-Operation
**Eingabe:** "Füge Achim, Ali und NichtExistierend zu Projekt Alpha hinzu"

**Erwartetes Verhalten:**
- Bot versucht alle 3 Mitarbeiter hinzuzufügen
- Zeigt: "2 von 3 Mitarbeitern hinzugefügt (Achim, Ali - NichtExistierend nicht gefunden)"

#### Test 2.3: Batch mit Kommas und "und"
**Eingabe:** "Füge Achim, Ali, Björn und Den zu Projekt Beta hinzu"

**Erwartetes Verhalten:**
- Bot erkennt alle 4 Namen (Komma + "und")
- Führt 4x `insertRow` aus
- Zeigt Zusammenfassung mit allen 4 Namen

---

### 3. Context Memory

#### Test 3.1: Projekt-Kontext beibehalten
**Schritt 1:** "Erstelle Projekt Besichtigung für 30. Dezember"  
**Schritt 2:** "füge Mitarbeiter hinzu"

**Erwartetes Verhalten:**
- Schritt 1: Projekt wird erstellt
- Schritt 2: Bot verwendet automatisch "Besichtigung" vom 30. Dezember
- Bot fragt NICHT nach Projekt-Name

#### Test 3.2: Kontext mit Datum
**Schritt 1:** "Zeige Projekte für Besichtigung am 30. Dezember"  
**Schritt 2:** "füge Achim hinzu"

**Erwartetes Verhalten:**
- Schritt 1: Projekte werden angezeigt
- Schritt 2: Bot verwendet automatisch "Besichtigung" + "30. Dezember"
- Bot fügt Achim zum richtigen Projekt hinzu

#### Test 3.3: Kontext-Update bei neuem Projekt
**Schritt 1:** "Erstelle Projekt Alpha für heute"  
**Schritt 2:** "Erstelle Projekt Beta für morgen"  
**Schritt 3:** "füge Mitarbeiter hinzu"

**Erwartetes Verhalten:**
- Schritt 3: Bot verwendet "Beta" (letztes Projekt), nicht "Alpha"

#### Test 3.4: Explizite Erwähnung überschreibt Kontext
**Schritt 1:** "Erstelle Projekt Alpha für heute"  
**Schritt 2:** "füge Mitarbeiter zu Projekt Beta hinzu"

**Erwartetes Verhalten:**
- Schritt 2: Bot verwendet "Beta" (explizit erwähnt), nicht "Alpha" (Kontext)
- Kontext wird auf "Beta" aktualisiert

---

## 🔍 Was zu prüfen ist

### Für Statistiken:
- ✅ Bot verwendet `getStatistics` Tool (nicht `queryTable`)
- ✅ Ergebnisse sind als Tabellen oder Listen formatiert
- ✅ Keine rohen JSON-Ausgaben
- ✅ Korrekte Aggregationen (COUNT, SUM, AVG, etc.)

### Für Batch-Operationen:
- ✅ Bot erkennt mehrere Items (Komma, "und", "&")
- ✅ Bot führt mehrere Tool-Calls aus (einmal pro Item)
- ✅ Zusammenfassung nach allen Operationen
- ✅ Fehlerbehandlung für einzelne fehlgeschlagene Items

### Für Context Memory:
- ✅ Bot verwendet letztes Projekt automatisch
- ✅ Kontext wird aus Nachrichten extrahiert
- ✅ Kontext wird im System-Prompt angezeigt
- ✅ Explizite Erwähnung überschreibt Kontext

---

## 📝 Test-Protokoll

Führe die Tests in der oben genannten Reihenfolge durch und dokumentiere:

1. **Funktioniert es?** (Ja/Nein)
2. **Fehlermeldungen?** (Wenn ja, welche?)
3. **Unerwartetes Verhalten?** (Beschreibung)
4. **Verbesserungsvorschläge?**

---

## 🚀 Schnelltest

**Minimaler Test (alle Features):**
1. "Wie viele Mitarbeiter sind diese Woche eingeplant?" → Statistiken
2. "Füge Achim und Ali zu Projekt Alpha hinzu" → Batch
3. "Erstelle Projekt Test für heute" → Context
4. "füge Mitarbeiter hinzu" → Context verwendet "Test"

