# Supabase Migrations

Dieses Verzeichnis enthält SQL-Migrations für die Supabase-Datenbank.

## Migration ausführen

### Option 1: Via Supabase Dashboard (Empfohlen)

1. Gehe zu deinem Supabase-Projekt
2. Navigiere zu **SQL Editor**
3. Öffne die Datei `001_create_chat_tables.sql`
4. Kopiere den gesamten Inhalt
5. Füge ihn in den SQL Editor ein
6. Klicke auf **Run**

### Option 2: Via Supabase CLI

```bash
# Installiere Supabase CLI (falls noch nicht installiert)
npm install -g supabase

# Login
supabase login

# Linke dein lokales Projekt mit Supabase
supabase link --project-ref dein-project-ref

# Führe Migrationen aus
supabase db push
```

## Migrationen

### 001_create_chat_tables.sql

Erstellt die Tabellen für Multi-User-Chat-Support:

- **t_chats**: Speichert Chat-Metadaten pro User
- **t_chat_messages**: Speichert einzelne Nachrichten innerhalb von Chats

**Features:**
- Row Level Security (RLS) für Datenschutz
- Automatische Timestamp-Updates
- Automatische Message-Count-Updates
- Chat-Sharing zwischen Usern

**Wichtig:** Diese Migration erfordert, dass Supabase Auth aktiviert ist.

