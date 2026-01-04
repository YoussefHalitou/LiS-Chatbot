# .env.local Troubleshooting

## Aktueller Fehler

**Fehlermeldung**: `Invalid supabaseUrl: Must be a valid HTTP or HTTPS URL.`

## Lösung

### 1. Überprüfe die .env.local Datei

Stelle sicher, dass `NEXT_PUBLIC_SUPABASE_URL` korrekt formatiert ist:

**✅ Korrekt:**
```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
```

**❌ Falsch:**
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_URL="https://xxxxx.supabase.co"
NEXT_PUBLIC_SUPABASE_URL = https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co/
```

### 2. Häufige Fehler

- ❌ Platzhalter-Werte noch drin: `your_supabase_project_url`
- ❌ Anführungszeichen um den Wert: `"https://..."`
- ❌ Leerzeichen um `=`: `KEY = value`
- ❌ Trailing Slash: `https://xxx.supabase.co/`
- ❌ Falsches Format: `supabase.co` (fehlt https://)

### 3. Überprüfung

Nach dem Ändern der .env.local Datei:

1. **Server stoppen**: `pkill -f "next dev"`
2. **.next Ordner löschen** (optional, für sauberen Neustart):
   ```bash
   rm -rf .next
   ```
3. **Server neu starten**: `npm run dev`

### 4. Test

```bash
curl http://localhost:3000/api/health
```

Sollte jetzt funktionieren ohne den Supabase URL Fehler.

