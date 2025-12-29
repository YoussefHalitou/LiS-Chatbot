# Supabase Setup-Anleitung

## E-Mail-Bestätigung für Entwicklung deaktivieren

Um die E-Mail-Bestätigung für die lokale Entwicklung zu deaktivieren:

1. **Gehe zum Supabase Dashboard:**
   - Öffne [https://app.supabase.com](https://app.supabase.com)
   - Wähle dein Projekt aus

2. **Navigiere zu Authentication Settings:**
   - Klicke auf **Authentication** im linken Menü
   - Klicke auf **Settings** (oder **Providers** → **Email**)

3. **Deaktiviere E-Mail-Bestätigung:**
   - Scrolle zu **"Email Auth"** oder **"Email Provider"**
   - Finde die Option **"Enable email confirmations"** oder **"Confirm email"**
   - **Deaktiviere** diese Option (Toggle auf OFF)
   - Klicke auf **"Save"** oder **"Update"**

4. **Alternative: Über Auth Settings:**
   - Gehe zu **Authentication** → **Settings** → **Auth**
   - Suche nach **"Enable email confirmations"**
   - Setze den Toggle auf **OFF**
   - Speichere die Änderungen

## Nach dem Deaktivieren

Nach dem Deaktivieren der E-Mail-Bestätigung:
- ✅ Neue Benutzer können sich sofort nach der Registrierung anmelden
- ✅ Keine E-Mail-Bestätigung erforderlich
- ✅ `data.session` ist direkt nach `signUp()` verfügbar

## Wichtig für Production

⚠️ **Für Production sollte E-Mail-Bestätigung aktiviert bleiben**, um die Sicherheit zu gewährleisten.

Um zwischen Development und Production zu unterscheiden, kannst du:
- Eine separate Supabase-Instanz für Development verwenden
- Oder die E-Mail-Bestätigung nur für bestimmte Domains deaktivieren

