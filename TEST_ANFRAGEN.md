# Testanfragen für LiS Chatbot

Diese Liste enthält verschiedene Testanfragen, um die Funktionalität des Chatbots zu überprüfen.

## 1. Formatierungstests (Datum/Zeit)

### Datum-Formatierung
- "Wann wurde das Fahrzeug L4U am 18. Dezember 2025 eingesetzt?"
- "Zeige mir alle Projekte vom 18. Dezember 2025"
- "Welche Einsätze gab es am 10. Dezember 2025?"
- "Wann wurde das Projekt 'Demmer' erstellt?"

**Erwartetes Verhalten:**
- Datum sollte korrekt formatiert sein: "18. Dezember 2025" (mit Leerzeichen!)
- KEINE Formatierung wie "18. Dezember2025" oder "18.Dezember 2025"

### Zeit-Formatierung
- "Wann begann der Einsatz um 08:00 Uhr?"
- "Zeige mir Projekte, die um 08:00 Uhr starten"

**Erwartetes Verhalten:**
- Zeitangaben sollten korrekt formatiert sein: "um 08:00 Uhr" (mit Leerzeichen!)
- KEINE Formatierung wie "um08:00" oder "um 08:00Uhr"

---

## 2. Tests für "Zuletzt erstelltes Projekt"

- "Wann wurde das zuletzt erstellte Projekt erstellt?"
- "Welches ist das neueste Projekt?"
- "Zeige mir das letzte Projekt"
- "Wann war das letzte Projekt?"

**Erwartetes Verhalten:**
- Sollte das Projekt mit dem NEUESTEN `created_at` Timestamp zurückgeben
- NICHT einfach das erste Ergebnis aus der Datenbank
- Sollte alle Projekte abfragen und dann das neueste identifizieren

---

## 3. Absatz- und Formatierungsregeln

### Mehrere Einträge (sollten als Tabelle formatiert sein)
- "Liste alle Fahrzeuge auf"
- "Zeige mir alle Projekte"
- "Welche Mitarbeiter haben wir?"

**Erwartetes Verhalten:**
- Antworten mit 2+ Einträgen sollten als Markdown-Tabelle formatiert sein
- Tabellen sollten durch Absatzumbrüche (\n\n) vom Text getrennt sein

### Einzelne Einträge (sollten als Liste formatiert sein)
- "Zeige mir Details zum Projekt 'Demmer'"
- "Welche Informationen gibt es zu L4U?"

**Erwartetes Verhalten:**
- Einzelne Einträge sollten als strukturierte Markdown-Liste formatiert sein
- Mitarbeiter-Listen sollten als Unter-Listen formatiert sein (nicht kommagetrennt)

### Absatzstruktur
- "Welche Einsätze gab es am 10. Dezember? Liste auch die Mitarbeiter auf."

**Erwartetes Verhalten:**
- Klare Absatzumbrüche zwischen verschiedenen Themen
- Einleitungssatz, dann Absatzumbruch, dann Tabelle/Liste
- Mitarbeiter als Unter-Listen, nicht als kommagetrennte Liste

---

## 4. Fahrzeug-bezogene Anfragen

- "Welche Fahrzeuge sind bereit?"
- "Wann wurde das Fahrzeug L4U eingesetzt?"
- "Zeige mir alle Einsätze von L Star"
- "Liste die Einsätze von L Khalid auf"
- "Welche Einsätze gab es mit dem Fahrzeug L4N?"

**Erwartetes Verhalten:**
- Korrekte Datumsformatierung
- Klare Struktur mit Absätzen
- Tabellen für mehrere Einsätze

---

## 5. Projekt-bezogene Anfragen

- "Welche Projekte wurden am 18. Dezember 2025 erstellt?"
- "Zeige mir alle Projekte mit Erstellungsdatum"
- "Wann wurde das Projekt 'Röder' erstellt?"
- "Welche Projekte gibt es in Düsseldorf?"

**Erwartetes Verhalten:**
- Korrekte Datumsformatierung
- Tabellen für mehrere Projekte
- Klare Absatzstruktur

---

## 6. Mitarbeiter-bezogene Anfragen

- "Welche Mitarbeiter sind in den Projekten eingesetzt?"
- "Wer arbeitet am Projekt 'Demmer'?"
- "Welche Mitarbeiter waren am 10. Dezember 2025 eingesetzt?"

**Erwartetes Verhalten:**
- Mitarbeiter sollten als Listen formatiert sein, NICHT kommagetrennt
- Beispiel: "**Mitarbeiter:**\n  - Den\n  - Las" (RICHTIG)
- Nicht: "Mitarbeiter: Den, Las" (FALSCH)

---

## 7. Material-bezogene Anfragen

- "Welche Materialien wurden in letzter Zeit eingesetzt?"
- "Welche Materialien gibt es?"
- "Zeige mir Materialverbrauch für Dezember"

**Erwartetes Verhalten:**
- Korrekte Formatierung
- Tabellen für mehrere Einträge

---

## 8. Komplexe Abfragen

- "Liste alle Einsätze der Fahrzeuge auf"
- "Welche Projekte stehen diese Woche an?"
- "Welche Fahrzeuge wurden diese Woche eingesetzt?"

**Erwartetes Verhalten:**
- Klare Struktur mit Absätzen
- Tabellen für mehrere Einträge
- Korrekte Datumsformatierung

---

## 9. Fehlerbehandlung

- "Zeige mir Projekte vom 99. Dezember 2025"
- "Welche Fahrzeuge gibt es mit dem Namen XYZ123?"
- "Zeige mir Materialien, die nicht existieren"

**Erwartetes Verhalten:**
- Freundliche Fehlermeldungen auf Deutsch
- Vorschläge für alternative Anfragen
- Keine rohen JSON-Fehlermeldungen

---

## 10. Spezielle Formatierungstests

### Datum mit Uhrzeit
- "Wann wurde das Projekt 'Nippon Steel' erstellt und um welche Uhrzeit?"
- "Zeige mir Projekte, die am 10. Dezember 2025 um 08:00 Uhr starten"

**Erwartetes Verhalten:**
- Format: "am 10. Dezember 2025 um 08:00 Uhr" (mit Leerzeichen überall!)
- Nicht: "am10. Dezember2025 um08:00"

### Listen in Tabellen
- "Liste alle Projekte mit Namen, Ort und Datum auf"

**Erwartetes Verhalten:**
- Tabellen sollten korrekt formatiert sein
- Absatzumbruch (\n\n) vor der Tabelle

---

## Test-Checkliste

### Formatierung
- [ ] Datum: "18. Dezember 2025" (mit Leerzeichen zwischen Dezember und Jahr)
- [ ] Zeit: "um 08:00 Uhr" (mit Leerzeichen zwischen "um" und Zeit)
- [ ] Tabellen haben Absatzumbrüche (\n\n) vor der Tabelle
- [ ] Mitarbeiter als Listen, nicht kommagetrennt
- [ ] Klare Absatzstruktur bei mehreren Themen

### Funktionalität
- [ ] "Zuletzt erstelltes Projekt" findet tatsächlich das neueste (nach created_at sortiert)
- [ ] Tool Calls werden korrekt ausgeführt
- [ ] Antworten sind auf Deutsch
- [ ] Keine rohen JSON-Ausgaben
- [ ] Fehlermeldungen sind freundlich und hilfreich

### Datenqualität
- [ ] Korrekte Daten werden zurückgegeben
- [ ] Filter funktionieren korrekt
- [ ] Datumsbereiche werden korrekt interpretiert

---

## Beispiel-Testablauf

1. **Formatierungstest:**
   ```
   "Wann wurde das Fahrzeug L4U am 18. Dezember 2025 eingesetzt?"
   ```
   → Prüfe: "18. Dezember 2025" (nicht "18. Dezember2025")

2. **Zuletzt erstelltes Projekt:**
   ```
   "Wann wurde das zuletzt erstellte Projekt erstellt?"
   ```
   → Prüfe: Antwort sollte das Projekt mit dem neuesten created_at sein

3. **Tabellenformatierung:**
   ```
   "Liste alle Fahrzeuge auf"
   ```
   → Prüfe: Antwort sollte eine Markdown-Tabelle sein (mit \n\n davor)

4. **Listenformatierung:**
   ```
   "Welche Mitarbeiter arbeiten am Projekt 'Demmer'?"
   ```
   → Prüfe: Mitarbeiter als Liste (- Den\n  - Las), nicht kommagetrennt

5. **Absatzstruktur:**
   ```
   "Zeige mir alle Einsätze von L Star"
   ```
   → Prüfe: Klare Absatzumbrüche, strukturierte Antwort

