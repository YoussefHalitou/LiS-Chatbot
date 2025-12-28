import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import type { ChatCompletionTool } from 'openai/resources/chat/completions'
import {
  queryTable,
  getTableNames,
  getTableStructure,
  queryTableWithJoin,
  insertRow,
  updateRow,
  deleteRow
} from '@/lib/supabase-query'
import { INSERT_ALLOWED_TABLES } from '@/lib/constants'
import { rateLimitMiddleware, getClientIdentifier } from '@/lib/rate-limit'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

if (!process.env.OPENAI_API_KEY) {
  throw new Error('OPENAI_API_KEY is not set')
}

/**
 * System prompt that instructs the AI on how to handle database queries
 */
const SYSTEM_PROMPT = `You are the "LiS Operations Assistant", an expert assistant for the company "Land in Sicht".

Your role is to act as a friendly, competent internal helper for projects, employees, planning (MorningPlan), inspections, vehicles, materials and time tracking, based on a PostgreSQL database.

The user usually writes in German, sometimes informally.

Always answer in clear, natural **German**, unless the user explicitly asks for another language.

You have access to a PostgreSQL database with tables AND pre-built VIEWS for complex queries.

**IMPORTANT: Always prefer VIEWS over manual JOINs for complex data!**

KEY VIEWS (use these for common queries):

- **public.v_morningplan_full** ⭐ MOST IMPORTANT  
  → Complete morning plan view with ALL JOINs already done  
  → Columns: plan_id, plan_date, start_time, service_type, notes, project_code, project_name, project_ort, vehicle_nickname, vehicle_status, **staff_list** (employee names!)  
  → USE THIS for: "Projekte mit Mitarbeitern", "Einsätze", "Wer ist eingeplant", etc.  
  → Example: queryTable('v_morningplan_full', {plan_date: '2025-12-10'})

- **public.v_project_full**  
  → Complete project view with all related data

- **public.v_employee_kpi**  
  → Employee KPIs and statistics

- **public.v_project_profit**  
  → Project profitability calculations

- **public.v_inspection_detail_complete**  
  → Complete inspection details with all related data

- **public.v_costs_by_phase**  
  → Cost breakdowns by project phase

- **public.v_time_pairs_enriched**  
  → Enriched time tracking data

- **public.v_employee_costs**  
  → Employee cost calculations

- **public.v_material_value**  
  → Material inventory values

BASE TABLES (for simple queries):

- public.t_projects  
  → Projekte: project_id, project_code, name, ort, dienstleistungen, status, project_date, project_time

- public.t_employees  
  → Mitarbeiter: employee_id, name, role, contract_type, hourly_rate, is_active

- public.t_morningplan  
  → Tagesplanung: plan_id, plan_date, project_id, vehicle_id, start_time, service_type

- public.t_morningplan_staff  
  → Mitarbeiter-Zuteilung: plan_id, employee_id, role, individual_start_time

- public.t_vehicles  
  → Fahrzeuge: vehicle_id, nickname, unit, status, is_deleted

- public.t_materials / public.t_material_prices  
  → Materialien + Preise (EK/VK)

- public.t_services / public.t_service_prices  
  → Dienstleistungen + Preise

- public.t_inspections / public.t_inspection_items  
  → Besichtigungen + Details

- public.t_time_pairs  
  → Zeiterfassung pro Projekt

--------------------------------------------------
GENERAL BEHAVIOUR
--------------------------------------------------

1. Always be freundlich, gelassen und praxisnah.
   The user may say things like "Hey, hörst du mich?", "Bitte bitte", "Okay, ich warte" – interpret this as casual conversation. 
   - For "Hörst du mich?": Respond like a voice assistant would, e.g.
     "Ja, ich verstehe dich – ich arbeite im Hintergrund mit deiner Datenbank. Stell mir einfach eine Frage, z.B. zu Projekten, Mitarbeitern oder Einsätzen."

2. When the user asks things like:
   - "Was für Informationen hast du denn im Allgemeinen?"
   - "Nennen wir mal n paar Beispiele bitte."
   - "Ich brauche Daten über die Mitarbeiter."
   
   DO NOT just say "I need a specific question" or ask again and again.
   Instead:
   - Proactively describe what you can do with the data.
   - Give 3–7 konkrete Beispiel-Fragen, die du beantworten kannst, z.B.:
     - „Wie viele aktive Mitarbeiter haben wir?"
     - „Welche Mitarbeiter sind intern/extern?"
     - „Zeig mir alle Einsätze von heute mit Fahrzeug und Team."
     - „Welche Besichtigungen sind nächste Woche geplant?"
   - Wenn der Nutzer danach immer noch vage ist, schlage du eine sinnvolle Auswertung aktiv vor und führe sie aus.

3. You are allowed to:
   - Describe the schema and its possibilities **ohne** eine SQL-Query auszuführen (z.B. bei Meta-Fragen „Was kannst du?").
   - Run simple default queries selbst, wenn die Frage grob ist, z.B.:
     "Ich brauche Daten über die Mitarbeiter."
     → Du darfst eine Abfrage wie  
       SELECT name, contract_type, is_active, hourly_rate FROM public.t_employees ORDER BY name LIMIT 20;  
       durchführen und das Ergebnis zusammenfassen.

4. Never enter an endless loop of:
   - "I need a specific question"  
   If the user bleibt vage, du gehst einen Schritt auf ihn zu:
   - Biete Beispiele an
   - Schlage eine Erstauswertung vor („Ich zeige dir mal alle aktiven Mitarbeiter…")
   - Und mache das dann.

--------------------------------------------------
SQL USAGE RULES
--------------------------------------------------

Your primary technical task is to:
- Interpret a business question.
- Map it to the right tables and columns.
- Write one or more safe SQL **SELECT** queries.
- Use their results to give a verständliche Antwort in German.

Rules:

1. **Default mode is READ-ONLY (SELECT).**
   - Allowed: SELECT, WITH, JOIN, WHERE, GROUP BY, ORDER BY, LIMIT.
   - You may CREATE, UPDATE, or DELETE data only if the user explicitly asks and clearly confirms.

2. **Tools:**
   - Use **insertRow** to create new rows.
   - Use **updateRow** to modify existing rows.
   - Use **deleteRow** to delete rows.
   - To remove a single field value, use **updateRow** and set the field to null (never delete the whole row).

3. **Confirmation:**
   - When the user confirms with "ja", "ok", "bitte", or similar, immediately call the corresponding tool.
   - Do NOT ask again after confirmation.
   - Do NOT output SQL.

4. **Safety:**
   - Only operate on allowed tables.
   - Never ALTER schema.
   - Be precise, deterministic, and concise.

5. **CRITICAL WORKFLOWS:**
   - **INSERT - ABSOLUTE REQUIREMENT**: 
     * **YOU MUST CALL insertRow TOOL IMMEDIATELY - DO NOT JUST SAY YOU WILL DO IT!**
     * When user says "neues projekt" or "projekt hinzufügen" and provides ANY information (even just a name like "ZZZ"), you MUST:
       1. IMMEDIATELY call the insertRow tool - do NOT just say you will create it, ACTUALLY CALL THE TOOL!
       2. Look through ALL previous messages in the conversation to find ALL information the user has provided (name, ort, etc.)
       3. Call insertRow with tableName='t_projects' and values containing ALL available information combined
       4. Use sensible defaults for missing optional fields (ort can be null, status='geplant', project_code=auto-generate)
       5. NEVER ask for more information - if you have at least a name, that's enough!
       6. ALWAYS set confirm: true - the user has already provided the information
     * **CRITICAL**: You MUST actually call the insertRow tool function - do NOT just respond with text saying you will create it!
     * **EXAMPLE**: If user says "neues projekt named ZZZ", you MUST call: insertRow(tableName='t_projects', values={name: 'ZZZ', ort: null}, confirm=true)
     * **EXAMPLE**: If user says "neues projekt named ZZZ" and then later says "Köln", you MUST combine both: call insertRow with {name: "ZZZ", ort: "Köln", confirm: true}
     * **EXAMPLE**: If user says "neues projekt named ZZZ" and nothing else, call insertRow with {name: "ZZZ", ort: null, confirm: true} - ort can be null!
     * For missing optional fields, use sensible defaults:
       - For t_employees: is_active=true (default), role=null (if not specified), hourly_rate=0 (if not specified)
       - For t_projects: status='geplant' (default), ort=null (if not specified - it's optional!), project_code=auto-generate if not provided (e.g., PRJ-YYYYMMDD-XXXXX)
     * **CRITICAL**: ort (location) is OPTIONAL for t_projects - you can set it to null if not provided. Only name is required!
     * **CRITICAL**: When user provides project information in multiple messages, COMBINE all information from the conversation history before calling insertRow.
     * **CRITICAL**: DO NOT just say "Ich erstelle das Projekt" - you MUST actually call the insertRow tool function!
     * **CRITICAL FOR EMPLOYEES**: When user says "füge worker/mitarbeiter [Name] [Stundensatz] [intern/extern]", extract:
       - name: the name mentioned
       - hourly_rate: the number mentioned (e.g., "35" means hourly_rate: 35)
       - contract_type: "Intern" if user says "intern", "Extern" if user says "extern" (capitalize first letter!)
       - is_active: true (default)
       - role: null (default)
     * **EXAMPLE**: "füge worker Youssef 35 intern" → insertRow with {name: "Youssef", hourly_rate: 35, contract_type: "Intern", is_active: true}
     * DO NOT show JSON or ask again - just execute the insert with what you have.
   - **UPDATE**: 
     * When user says "umbenennen", "ändern", "update", "setze", "aktualisiere", "rename", "change", "modify" or similar, you MUST:
       1. Identify the row to update using unique identifiers (project_code, employee_id, name, etc.)
       2. Extract the new values from the user's message
       3. IMMEDIATELY call updateRow tool with filters and values
     * **EXAMPLE**: If user says "projekt zzz umbenennen in aaaa", call updateRow with:
       - tableName: 't_projects'
       - filters: {name: 'ZZZ'} (to find the project)
       - values: {name: 'AAAA'} (new name)
     * **EXAMPLE**: If user says "ändere projekt ZZZ ort zu Köln", call updateRow with:
       - tableName: 't_projects'
       - filters: {name: 'ZZZ'}
       - values: {ort: 'Köln'}
     * **CRITICAL**: Use the name field to find projects when user mentions a project name - filters: {name: "ProjectName"}
     * **CRITICAL**: Do NOT create a new row - use updateRow to modify existing data!
   - **DELETE**: When user asks to delete, show what will be deleted and ask for confirmation. When confirmed, IMMEDIATELY call deleteRow with filters.
   - **DELETE FIELD**: When user asks to remove a field value (e.g., "lösche die Straße"), use updateRow with the field set to null.

2. Respect the schema:
   - Join using the defined foreign keys, e.g.:
     - t_morningplan.project_id → t_projects.project_id
     - t_morningplan_staff.plan_id → t_morningplan.plan_id
     - t_morningplan_staff.employee_id → t_employees.employee_id
     - t_inspections.project_id → t_projects.project_id
     - t_inspection_items.inspection_id → t_inspections.inspection_id
     - t_vehicle_rates.vehicle_id → t_vehicles.vehicle_id
     - t_material_prices.material_id → t_materials.material_id
     - t_time_pairs.project_id → t_projects.project_id
     - t_project_note_media.project_id → t_projects.project_id

3. Interpreting business terms:
  - "Interne Mitarbeiter" → nutze Felder wie contract_type und is_active:
    - Versuche z.B. contract_type IN ('intern', 'Intern', 'Fest') oder filtern nach is_active = true.
    - Wenn unklar, sag kurz dazu, welche Annahme du verwendet hast.
  - "Aktive Mitarbeiter" → is_active = true.
  - **"Heute" / "Welchen Tag haben wir":**
    - Nutze die bereitgestellte Systemzeit (siehe unten), um Datum/Uhrzeit direkt zu nennen.
    - Keine Datumsrate oder Annäherung nötig: verwende die aktuelle Zeitangabe als Quelle.
  - "Diese Woche" / "diese Kalenderwoche" → **immer** Wochenspanne Montag–Sonntag auf denselben Datumsfeldern (Berlin-Zeit) und nur Datensätze innerhalb dieses Bereichs zurückgeben.
  - "Letzte X Tage/Wochen" → Zeitintervalle mit date ranges, vom aktuellen Datum aus berechnet.
  - **"Nächster Einsatz" / "zukünftige Aufträge" / "noch nicht erledigt"** → IMMER filtere nach Datum >= heute (aktuelles Datum). Verwende z.B. {plan_date: {type: 'gte', value: 'YYYY-MM-DD'}} mit dem heutigen Datum.
  - **"Vergangene" / "vergangen" / "erledigt"** → Filtere nach Datum < heute.
  - **CRITICAL**: Wenn der Nutzer nach "zukünftigen", "nächsten" oder "noch nicht erledigten" Projekten/Einsätzen fragt, MUSS das Datum >= heute sein. Prüfe IMMER, ob das Datum in der Zukunft liegt, bevor du es als "zukünftig" bezeichnest.

4. If a table might be empty or the filter returns nothing:
   - Sag klar: „Es wurden keine passenden Datensätze gefunden."
   - Und schlag ggf. alternative Filter vor (z.B. anderes Datum, Status etc.).

5. If you get a SQL error:
   - Do not show the raw error.
   - Try to correct the query (e.g. wrong column name, missing cast).
   - If still not fixable, sag z.B.:
     „Ich konnte die Abfrage gerade nicht fehlerfrei ausführen. Wir können die Frage etwas anders formulieren, z.B. so: …"

6. **CRITICAL: Data Consistency Rules**
   - **NEVER give multiple different answers to the same question.**
     - If the user asks "mit wem?" (with whom), give ONE correct answer based on the data.
     - Do NOT change your answer when the user says "sicher?" (sure?) unless you made an actual error.
   - **ALWAYS JOIN to get actual names, not IDs:**
     - When showing employees in projects: JOIN t_morningplan_staff with t_employees to get employee names.
     - NEVER show employee_id UUIDs to the user. Always resolve them to names.
   - **When user asks for "details [Name]":**
     - Filter by the 'name' column in t_projects WHERE name LIKE '%[Name]%'
     - Do NOT accidentally return a different project
   - **Current date awareness:**
     - Du kennst das aktuelle Datum und die aktuelle Uhrzeit aus der Systeminformation (siehe weiter unten)
     - Nutze diese Zeitangaben direkt für Aussagen zu „heute", "jetzt" oder "welcher Tag ist heute"
     - Berechne auch relative Angaben wie „gestern", „morgen", „übermorgen", "letzte Woche" oder „nächste Woche" auf Basis dieser Systemzeit
     - Wenn ein Zeitraum gemeint ist (z.B. "diese Woche"), leite ihn von diesem aktuellen Datum ab
     - Nutze **Europa/Berlin** als Referenzzeitzone für relative Datumsangaben und nenne Datum/Uhrzeit explizit, falls hilfreich
     - **Be honest about ambiguity:**
      - If multiple projects match (e.g., multiple "Umzug" on same date), say so and ask which one.
      - Do NOT guess or pick randomly.

7. **CRITICAL: Always Use Pre-Built Views:**
   - For "Projekte mit Mitarbeitern", "Welche Mitarbeiter sind eingeplant", "Einsätze":
     **ALWAYS query v_morningplan_full** - it has everything pre-joined!
   - **This view contains:**
     * project_name, project_code, project_ort
     * vehicle_nickname, vehicle_status
     * **staff_list** (employee names, already formatted!)
   - **Usage examples:**
     * "Projekte am 10.12.2025 mit Mitarbeitern" → queryTable('v_morningplan_full', {plan_date: '2025-12-10'})
     * "Mitarbeiter für Projekt Müller" → Use filters on project_name
     * "Alle Einsätze heute" → queryTable('v_morningplan_full') with date filter
   - **DO NOT use getProjectsWithStaff() - it's deprecated**
   - **DO NOT manually JOIN tables - use the views!**
   - **NEVER show UUIDs - the views already have names!**

--------------------------------------------------
ANSWER STYLE
--------------------------------------------------

When answering:

1. Always in **German**, freundlich und praxisnah.

2. Structure answers roughly like:
   - 1–3 Sätze direkte Antwort auf die Frage.
   - Danach eine kleine Auflistung oder Tabelle (in Textform) mit den wichtigsten Feldern:
     - z.B. bei Mitarbeitern: Name, Rolle, contract_type, hourly_rate
     - bei MorningPlan: Datum, Projekt, Fahrzeug, Mitarbeiter
     - bei Projekten: project_code, name, ort, status, project_date

3. If the question was vague, explain kurz, welche Annahmen du getroffen hast:
   - „Ich habe hier nur aktive Mitarbeiter berücksichtigt."
   - „Ich habe die letzten 30 Tage verwendet, weil kein Zeitraum angegeben wurde."

4. **CONSISTENCY IS CRITICAL:**
   - If the user challenges your answer with "sicher?" (sure?), "wirklich?" (really?), or similar:
     - DO NOT change your answer unless you actually made an error.
     - If you're confident: "Ja, das ist korrekt basierend auf den Daten."
     - If you're unsure: "Lass mich nochmal prüfen..." and then verify with a fresh query.
   - NEVER give contradictory answers to the same question in one conversation.
   - If you realize you made an error, say so: "Entschuldige, ich habe einen Fehler gemacht. Die korrekte Antwort ist..."

5. For conversational openers like:
   - "Hey, hörst du mich?"
   - "Verstehst du mich?"
   
   Answer human-like first, then gently steer:
   - „Ja, ich verstehe dich 🙂 Ich arbeite mit deinen Daten in der Datenbank.  
      Du kannst mich z.B. fragen:  
      – Wie viele aktive Mitarbeiter haben wir?  
      – Welche Einsätze stehen heute an?  
      – Welche Besichtigungen sind diese Woche geplant?"

--------------------------------------------------
WHAT YOU CAN ANSWER (EXAMPLES)
--------------------------------------------------

Be ready to answer questions like:

- Mitarbeiter:
  - „Wie viele aktive Mitarbeiter haben wir und wie heißen sie?"
  - „Welche Mitarbeiter haben den höchsten Stundensatz?"
  - „Zeig mir alle Mitarbeiter mit Vertragsstunden und Stundensätzen."

- Projekte:
  - „Welche Projekte sind diese Woche geplant?"
  - „Zeig mir alle offenen Projekte in [Ort]."

- MorningPlan:
  - „Welche Einsätze sind heute geplant, mit Fahrzeug und Mitarbeitern?"
  - „Mit welchem Fahrzeug fahren wir morgen zu Projekt X?"

- Besichtigung:
  - „Welche Besichtigungen sind nächste Woche geplant?"
  - „Zeig mir alle Besichtigungen für Kunde Müller."

- Fahrzeuge:
  - „Welche Fahrzeuge sind heute als 'bereit' markiert?"
  - „Wie sind die Tagesraten (total_price_per_unit) je Fahrzeug?"

- Materialien & Services:
  - „Welche aktiven Materialien haben wir und wie sind EK/VK-Preise?"
  - „Zeig mir alle Entsorgungsleistungen mit ihren Preisen."

If a user asks very vaguely (e.g. „Ich brauche Daten über die Mitarbeiter"), you:
- Antwortest NICHT mit „Ich brauche eine spezifische Frage."
- Sondern:
  - „Okay, hier ist ein Überblick über die Mitarbeiter, die aktuell im System sind: …"
  - Führst eine sinnvolle Standardabfrage aus (z.B. aktive Mitarbeiter).
  - Und bietest im Anschluss an: „Wenn du willst, kann ich das nach Rolle, Vertragstyp oder Stundensatz filtern."

--------------------------------------------------
Your main goal:
Act as an internal analytics & operations assistant for Land in Sicht:
- verstehe auch unpräzise oder gesprochene Fragen,
- gehe aktiv einen Schritt auf den Nutzer zu,
- nutze die Datenbank sinnvoll,
- antworte klar, freundlich und fachlich korrekt in German.`

interface Message {
  role: 'system' | 'user' | 'assistant' | 'function' | 'tool'
  content: string
  name?: string
  tool_calls?: any[]
  tool_call_id?: string
}

interface ChatRequest {
  messages: Message[]
}

type DateRange = {
  start: string
  end: string
}

const DATE_RANGE_TABLE_FIELDS: Record<string, string> = {
  v_morningplan_full: 'plan_date',
  t_morningplan: 'plan_date',
  v_project_full: 'project_date',
  t_projects: 'project_date',
}

// INSERT_ALLOWED_TABLES is now imported from @/lib/constants

const PROJECT_FILTER_FIELDS: Record<
  string,
  { name?: string; code?: string; id?: string }
> = {
  v_morningplan_full: { name: 'project_name', code: 'project_code', id: 'project_id' },
  v_project_full: { name: 'project_name', code: 'project_code', id: 'project_id' },
  t_projects: { name: 'name', code: 'project_code', id: 'project_id' },
  t_morningplan: { id: 'project_id' },
}

const includesAny = (text: string, values: string[]) =>
  values.some((value) => text.includes(value))

const formatIsoDate = (date: Date) => date.toISOString().slice(0, 10)

const normalizeText = (text: string) =>
  text
    .toLowerCase()
    .replace(/[.,!?/\\]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

const isConfirmationMessage = (text: string) => {
  const normalized = normalizeText(text)
  if (!normalized) {
    return false
  }

  return includesAny(normalized, [
    'ja',
    'jap',
    'jo',
    'yes',
    'ok',
    'okay',
    'klar',
    'bitte',
    'mach',
    'machs',
    'machs bitte',
    'bitte eintragen',
    'ja bitte',
    'ja füge',
    'füge das',
    'füge hinzu',
    'einfügen',
    'erstellen',
    'anlegen',
    'hinzufügen',
  ])
}

const normalizeInsertPayload = (payload: Record<string, any>) => {
  if (payload.tableName && payload.values && typeof payload.values === 'object') {
    return {
      tableName: payload.tableName,
      values: payload.values,
    }
  }

  return {
    tableName: payload.tableName,
    values: payload,
  }
}

const extractInsertPayload = (content: string) => {
  // Try explicit INSERT_PAYLOAD markers first
  const codeBlockMatch = content.match(/```json\s*INSERT_PAYLOAD\s*([\s\S]*?)```/i)
  const inlineMatch = content.match(/INSERT_PAYLOAD:\s*({[\s\S]*?})/i)
  const rawJson = codeBlockMatch?.[1] ?? inlineMatch?.[1]

  if (rawJson) {
    try {
      const payload = JSON.parse(rawJson.trim())
      if (!payload || typeof payload !== 'object') {
        return null
      }
      return normalizeInsertPayload(payload)
    } catch (error) {
      console.error('Failed to parse INSERT_PAYLOAD JSON:', error)
      return null
    }
  }

  // Try to find JSON objects that look like insert payloads
  // Look for objects with tableName or common table field names
  const candidates: string[] = []
  let depth = 0
  let startIndex = -1
  for (let i = 0; i < content.length; i++) {
    const char = content[i]
    if (char === '{') {
      if (depth === 0) {
        startIndex = i
      }
      depth += 1
    } else if (char === '}') {
      depth -= 1
      if (depth === 0 && startIndex !== -1) {
        candidates.push(content.slice(startIndex, i + 1))
        startIndex = -1
      }
    }
  }

  // Try to find the most likely insert payload
  // Prefer objects that have tableName or common project fields
  for (const candidate of candidates) {
    try {
      const payload = JSON.parse(candidate.trim())
      if (payload && typeof payload === 'object') {
        // Check if this looks like an insert payload
        const hasTableName = 'tableName' in payload
        const hasProjectFields = 'project_code' in payload || 'name' in payload || 'project_date' in payload
        const hasValues = 'values' in payload
        
        if (hasTableName || (hasProjectFields && !hasValues)) {
          return normalizeInsertPayload(payload)
        }
        
        // If it has values object, it might be the payload structure
        if (hasValues && typeof payload.values === 'object') {
          return normalizeInsertPayload(payload)
        }
        
        // Last resort: if it looks like project data, try it
        if (hasProjectFields) {
          return normalizeInsertPayload(payload)
        }
      }
    } catch (error) {
      continue
    }
  }

  return null
}

const inferInsertTable = (text: string) => {
  const match = text.match(/\bt_[a-z0-9_]+\b/i)
  if (!match) {
    return null
  }

  const table = match[0]
  return INSERT_ALLOWED_TABLES.has(table) ? table : null
}

const inferProjectName = (userText: string) => {
  const normalized = normalizeText(userText)
  if (!normalized) return null

  const stopWords = new Set([
    'heute',
    'morgen',
    'gestern',
    'woche',
    'monat',
    'jetzt',
    'now',
    'diese',
    'dieser',
    'dieses',
    'nächste',
    'naechste',
    'nächsten',
    'naechsten',
    'letzte',
    'letzten',
    'letzter',
    'aktuelle',
    'aktuellen',
    'aktuell',
    'kommende',
    'kommenden',
  ])

  if (normalized.includes('projekt ')) {
    const afterProject = normalized.split('projekt ')[1]
    if (!afterProject) return null
    const tokens = afterProject.split(' ')
    const collected: string[] = []
    for (const token of tokens) {
      if (stopWords.has(token) || ['am', 'im', 'in', 'für', 'mit', 'vom', 'von', 'der', 'die', 'das'].includes(token)) {
        break
      }
      collected.push(token)
    }
    return collected.length ? collected.join(' ') : null
  }

  const tokens = normalized.split(' ').filter(Boolean)
  if (tokens.length <= 2 && tokens.every((token) => !stopWords.has(token))) {
    return tokens.join(' ')
  }

  return null
}

const inferProjectIdentifier = (userText: string) => {
  const normalized = normalizeText(userText)
  if (!normalized) return null

  const uuidMatch = normalized.match(
    /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/i
  )
  const codeMatch = normalized.match(/\bprj-[0-9]{8}-[a-z0-9]{4,}\b/i)

  const name = inferProjectName(normalized)

  if (!uuidMatch && !codeMatch && !name) {
    return null
  }

  return {
    projectId: uuidMatch ? uuidMatch[0] : null,
    projectCode: codeMatch ? codeMatch[0].toUpperCase() : null,
    projectName: name,
  }
}

const inferDateRange = ({
  userText,
  weekStart,
  weekEnd,
  berlinDateUtc,
}: {
  userText: string
  weekStart: Date
  weekEnd: Date
  berlinDateUtc: Date
}): DateRange | null => {
  const text = userText.toLowerCase()
  const hasWeek = text.includes('woche') || text.includes('week')
  const hasMonth = text.includes('monat') || text.includes('month')

  if (!hasWeek && !hasMonth) {
    return null
  }

  if (hasMonth) {
    const year = berlinDateUtc.getUTCFullYear()
    const month = berlinDateUtc.getUTCMonth()
    const currentStart = new Date(Date.UTC(year, month, 1))
    const currentEnd = new Date(Date.UTC(year, month + 1, 0))
    const nextStart = new Date(Date.UTC(year, month + 1, 1))
    const nextEnd = new Date(Date.UTC(year, month + 2, 0))
    const previousStart = new Date(Date.UTC(year, month - 1, 1))
    const previousEnd = new Date(Date.UTC(year, month, 0))

    if (includesAny(text, ['nächsten monat', 'naechsten monat', 'kommenden monat'])) {
      return { start: formatIsoDate(nextStart), end: formatIsoDate(nextEnd) }
    }

    if (includesAny(text, ['letzten monat', 'vorigen monat', 'vergangenen monat'])) {
      return { start: formatIsoDate(previousStart), end: formatIsoDate(previousEnd) }
    }

    if (includesAny(text, ['diesen monat', 'aktuellen monat', 'aktuell', 'jetzt', 'now'])) {
      return { start: formatIsoDate(currentStart), end: formatIsoDate(currentEnd) }
    }
  }

  if (hasWeek) {
    const currentStart = weekStart
    const currentEnd = weekEnd
    const previousStart = new Date(weekStart)
    previousStart.setUTCDate(previousStart.getUTCDate() - 7)
    const previousEnd = new Date(weekEnd)
    previousEnd.setUTCDate(previousEnd.getUTCDate() - 7)
    const nextStart = new Date(weekStart)
    nextStart.setUTCDate(nextStart.getUTCDate() + 7)
    const nextEnd = new Date(weekEnd)
    nextEnd.setUTCDate(nextEnd.getUTCDate() + 7)

    if (includesAny(text, ['nächste woche', 'naechste woche', 'kommende woche'])) {
      return { start: formatIsoDate(nextStart), end: formatIsoDate(nextEnd) }
    }

    if (includesAny(text, ['letzte woche', 'vorige woche', 'vergangene woche'])) {
      return { start: formatIsoDate(previousStart), end: formatIsoDate(previousEnd) }
    }

    if (includesAny(text, ['diese woche', 'aktuelle woche', 'kalenderwoche', 'jetzt', 'now'])) {
      return { start: formatIsoDate(currentStart), end: formatIsoDate(currentEnd) }
    }
  }

  return null
}

const applyDateRangeFilters = (
  tableName: string,
  filters: Record<string, any>,
  dateRange: DateRange | null,
  userText?: string
) => {
  const dateField = DATE_RANGE_TABLE_FIELDS[tableName]
  if (!dateField) {
    return filters
  }

  // Check if user is asking for future dates
  const lowerText = (userText || '').toLowerCase()
  const isFutureQuery = lowerText.includes('zukünftig') || 
                        lowerText.includes('nächste') || 
                        lowerText.includes('nächster') ||
                        lowerText.includes('noch nicht erledigt') ||
                        lowerText.includes('kommend') ||
                        (lowerText.includes('einsatz') && (lowerText.includes('nächste') || lowerText.includes('zukünftig')))

  if (isFutureQuery && !dateRange) {
    // Add automatic future date filter
    const today = new Date()
    const berlinIsoDate = new Intl.DateTimeFormat('sv-SE', {
      timeZone: 'Europe/Berlin',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(today)
    
    return {
      ...filters,
      [dateField]: {
        type: 'gte',
        value: berlinIsoDate,
      },
    }
  }

  if (dateRange) {
    return {
      ...filters,
      [dateField]: {
        type: 'between',
        value: [dateRange.start, dateRange.end],
      },
    }
  }

  return filters
}

const applyProjectFilters = (
  tableName: string,
  filters: Record<string, any>,
  projectIdentifiers: { projectId: string | null; projectCode: string | null; projectName: string | null } | null
) => {
  if (!projectIdentifiers) {
    return filters
  }

  const fields = PROJECT_FILTER_FIELDS[tableName]
  if (!fields) {
    return filters
  }

  let nextFilters = { ...filters }

  if (projectIdentifiers.projectId && fields.id && !nextFilters[fields.id]) {
    nextFilters = {
      ...nextFilters,
      [fields.id]: { type: 'eq', value: projectIdentifiers.projectId },
    }
  }

  if (projectIdentifiers.projectCode && fields.code && !nextFilters[fields.code]) {
    nextFilters = {
      ...nextFilters,
      [fields.code]: { type: 'eq', value: projectIdentifiers.projectCode },
    }
  }

  if (projectIdentifiers.projectName && fields.name && !nextFilters[fields.name]) {
    nextFilters = {
      ...nextFilters,
      [fields.name]: { type: 'ilike', value: projectIdentifiers.projectName },
    }
  }

  return nextFilters
}

export async function POST(req: NextRequest) {
  // Apply rate limiting
  const rateLimitResult = rateLimitMiddleware(req, '/api/chat')
  if (!rateLimitResult.allowed) {
    return rateLimitResult.response!
  }

  try {
    const body: ChatRequest = await req.json()
    const { messages } = body

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: 'Messages array is required' },
        { status: 400 }
      )
    }

    const lastUserMessage =
      [...messages].reverse().find((message) => message.role === 'user')?.content || ''
    const lastAssistantMessage =
      [...messages].reverse().find((message) => message.role === 'assistant')?.content || ''

    // Check for recent insertRow, updateRow, or deleteRow tool calls in message history
    const recentInsertToolCall = [...messages]
      .reverse()
      .find((message) => {
        if (message.role !== 'assistant' || !message.tool_calls) return false
        return message.tool_calls.some(
          (tc: any) => tc.function?.name === 'insertRow'
        )
      })

    const recentUpdateToolCall = [...messages]
      .reverse()
      .find((message) => {
        if (message.role !== 'assistant' || !message.tool_calls) return false
        return message.tool_calls.some(
          (tc: any) => tc.function?.name === 'updateRow'
        )
      })

    const recentDeleteToolCall = [...messages]
      .reverse()
      .find((message) => {
        if (message.role !== 'assistant' || !message.tool_calls) return false
        return message.tool_calls.some(
          (tc: any) => tc.function?.name === 'deleteRow'
        )
      })

    if (isConfirmationMessage(lastUserMessage)) {
      // Priority: delete > update > insert
      // First, check for delete confirmation
      if (recentDeleteToolCall?.tool_calls) {
        const deleteToolCall = recentDeleteToolCall.tool_calls.find(
          (tc: any) => tc.function?.name === 'deleteRow'
        )
        if (deleteToolCall) {
          try {
            const functionArgs = JSON.parse(deleteToolCall.function.arguments || '{}')
            if (functionArgs.tableName && functionArgs.filters) {
              if (!INSERT_ALLOWED_TABLES.has(functionArgs.tableName)) {
                return NextResponse.json(
                  {
                    message: {
                      role: 'assistant',
                      content: `Löschung nicht möglich: Tabelle "${functionArgs.tableName}" ist nicht erlaubt.`,
                    },
                  },
                  { headers: NO_CACHE_HEADERS }
                )
              }

              console.log('Re-executing delete from tool call:', { 
                table: functionArgs.tableName, 
                filters: functionArgs.filters 
              })
              const clientId = getClientIdentifier(req)
              const deleteResult = await deleteRow(functionArgs.tableName, functionArgs.filters, {
                ipAddress: clientId,
                requireSingleRow: true,
              })

              if (deleteResult.error) {
                console.error('Delete error:', deleteResult.error)
                return NextResponse.json(
                  {
                    message: {
                      role: 'assistant',
                      content: `Der Eintrag konnte nicht gelöscht werden: ${deleteResult.error}`,
                    },
                  },
                  { headers: NO_CACHE_HEADERS }
                )
              }

              const deletedCount = deleteResult.data?.deleted_count || 0
              return NextResponse.json(
                {
                  message: {
                    role: 'assistant',
                    content: deletedCount > 0 
                      ? `Der Eintrag wurde erfolgreich gelöscht. ${deletedCount} Zeile(n) wurden entfernt.`
                      : 'Keine Zeilen wurden gelöscht. Möglicherweise existiert der Eintrag nicht mehr.',
                  },
                },
                { headers: NO_CACHE_HEADERS }
              )
            }
          } catch (error) {
            console.error('Error parsing delete tool call arguments:', error)
          }
        }
      }

      // Then, check for update confirmation
      if (recentUpdateToolCall?.tool_calls) {
        const updateToolCall = recentUpdateToolCall.tool_calls.find(
          (tc: any) => tc.function?.name === 'updateRow'
        )
        if (updateToolCall) {
          try {
            const functionArgs = JSON.parse(updateToolCall.function.arguments || '{}')
            if (functionArgs.tableName && functionArgs.filters && functionArgs.values) {
              if (!INSERT_ALLOWED_TABLES.has(functionArgs.tableName)) {
                return NextResponse.json(
                  {
                    message: {
                      role: 'assistant',
                      content: `Update nicht möglich: Tabelle "${functionArgs.tableName}" ist nicht erlaubt.`,
                    },
                  },
                  { headers: NO_CACHE_HEADERS }
                )
              }

              console.log('Re-executing update from tool call:', { 
                table: functionArgs.tableName, 
                filters: functionArgs.filters,
                values: functionArgs.values 
              })
              const clientId = getClientIdentifier(req)
              const updateResult = await updateRow(
                functionArgs.tableName, 
                functionArgs.filters, 
                functionArgs.values,
                {
                  requireSingleRow: true,
                }
              )

              if (updateResult.error) {
                console.error('Update error:', updateResult.error)
                return NextResponse.json(
                  {
                    message: {
                      role: 'assistant',
                      content: `Der Eintrag konnte nicht aktualisiert werden: ${updateResult.error}`,
                    },
                  },
                  { headers: NO_CACHE_HEADERS }
                )
              }

              return NextResponse.json(
                {
                  message: {
                    role: 'assistant',
                    content: 'Der Eintrag wurde erfolgreich aktualisiert.',
                  },
                },
                { headers: NO_CACHE_HEADERS }
              )
            }
          } catch (error) {
            console.error('Error parsing update tool call arguments:', error)
          }
        }
      }

      // Finally, try to use a recent insert tool call if available
      if (recentInsertToolCall?.tool_calls) {
        const insertToolCall = recentInsertToolCall.tool_calls.find(
          (tc: any) => tc.function?.name === 'insertRow'
        )
        if (insertToolCall) {
          try {
            const functionArgs = JSON.parse(insertToolCall.function.arguments || '{}')
            if (functionArgs.tableName && functionArgs.values) {
              // Re-execute the insert with confirm: true
              if (!INSERT_ALLOWED_TABLES.has(functionArgs.tableName)) {
                return NextResponse.json(
                  {
                    message: {
                      role: 'assistant',
                      content: `Eintrag nicht möglich: Tabelle "${functionArgs.tableName}" ist nicht erlaubt.`,
                    },
                  },
                  { headers: NO_CACHE_HEADERS }
                )
              }

              console.log('Re-executing insert from tool call:', { 
                table: functionArgs.tableName, 
                values: functionArgs.values 
              })
              const clientId = getClientIdentifier(req)
              const insertResult = await insertRow(functionArgs.tableName, functionArgs.values, {
                ipAddress: clientId,
              })

              if (insertResult.error) {
                console.error('Insert error:', insertResult.error)
                return NextResponse.json(
                  {
                    message: {
                      role: 'assistant',
                      content: `Der Eintrag konnte nicht erstellt werden: ${insertResult.error}`,
                    },
                  },
                  { headers: NO_CACHE_HEADERS }
                )
              }

              return NextResponse.json(
                {
                  message: {
                    role: 'assistant',
                    content: 'Der Eintrag wurde erfolgreich erstellt. Soll ich dir die Details anzeigen?',
                  },
                },
                { headers: NO_CACHE_HEADERS }
              )
            }
          } catch (error) {
            console.error('Error parsing tool call arguments:', error)
          }
        }
      }

      // Fallback to extracting from assistant message text
      if (lastAssistantMessage) {
        const insertPayload = extractInsertPayload(lastAssistantMessage)
        const inferredTable =
          insertPayload?.tableName ||
          inferInsertTable(lastAssistantMessage) ||
          inferInsertTable(lastUserMessage)

        // Handle case where payload has values nested
        let insertValues = insertPayload?.values
        
        // If payload itself looks like values (has project fields but no tableName/values wrapper)
        if (!insertValues && insertPayload && !insertPayload.tableName) {
          // Check if the payload itself is the values object
          if ('project_code' in insertPayload || 'name' in insertPayload) {
            insertValues = insertPayload
          }
        }
        
        // If we have a table but no values, try to extract from the payload
        if (inferredTable && !insertValues && insertPayload) {
          // If payload has the values directly (not nested)
          if (!insertPayload.tableName && !insertPayload.values) {
            insertValues = insertPayload
          }
        }

        if (inferredTable && insertValues) {
          if (!INSERT_ALLOWED_TABLES.has(inferredTable)) {
            return NextResponse.json(
              {
                message: {
                  role: 'assistant',
                  content: `Eintrag nicht möglich: Tabelle "${inferredTable}" ist nicht erlaubt.`,
                },
              },
              { headers: NO_CACHE_HEADERS }
            )
          }

          console.log('Attempting insert:', { table: inferredTable, values: insertValues })
          const clientId = getClientIdentifier(req)
          const insertResult = await insertRow(inferredTable, insertValues, {
            ipAddress: clientId,
          })

          if (insertResult.error) {
            console.error('Insert error:', insertResult.error)
            return NextResponse.json(
              {
                message: {
                  role: 'assistant',
                  content: `Der Eintrag konnte nicht erstellt werden: ${insertResult.error}`,
                },
              },
              { headers: NO_CACHE_HEADERS }
            )
          }

          return NextResponse.json(
            {
              message: {
                role: 'assistant',
                content: 'Der Eintrag wurde erfolgreich erstellt. Soll ich dir die Details anzeigen?',
              },
            },
            { headers: NO_CACHE_HEADERS }
          )
        }
        
        // If we have payload but missing table or values, provide helpful error
        if (insertPayload || inferredTable) {
          console.log('Insert attempt failed:', { 
            hasPayload: !!insertPayload, 
            hasTable: !!inferredTable, 
            hasValues: !!insertValues,
            payload: insertPayload 
          })
          return NextResponse.json(
            {
              message: {
                role: 'assistant',
                content:
                  'Ich habe eine Bestätigung erhalten, aber konnte die Eintragsdaten nicht vollständig erkennen. Bitte versuche es erneut oder gib die Details explizit an.',
              },
            },
            { headers: NO_CACHE_HEADERS }
          )
        }
      }
    }

    const now = new Date()
    const berlinTime = new Intl.DateTimeFormat('de-DE', {
      timeZone: 'Europe/Berlin',
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).format(now)

    const berlinIsoDateForCalc = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Europe/Berlin',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(now)

    const [year, month, day] = berlinIsoDateForCalc.split('-').map(Number)
    const berlinDateUtc = new Date(Date.UTC(year, month - 1, day))
    const dayOfWeek = berlinDateUtc.getUTCDay()
    const daysSinceMonday = (dayOfWeek + 6) % 7

    const weekStart = new Date(berlinDateUtc)
    weekStart.setUTCDate(berlinDateUtc.getUTCDate() - daysSinceMonday)

    const weekEnd = new Date(weekStart)
    weekEnd.setUTCDate(weekStart.getUTCDate() + 6)

    const berlinWeekRange = `${formatIsoDate(weekStart)} bis ${formatIsoDate(weekEnd)}`

    const berlinIsoDate = new Intl.DateTimeFormat('sv-SE', {
      timeZone: 'Europe/Berlin',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(now)

    const berlinIsoDateTime = new Intl.DateTimeFormat('sv-SE', {
      timeZone: 'Europe/Berlin',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }).format(now)

    const berlinIsoDateTimeWithOffset = new Intl.DateTimeFormat('sv-SE', {
      timeZone: 'Europe/Berlin',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZoneName: 'shortOffset',
      hour12: false,
    }).format(now)

    const systemPromptWithTime = `${SYSTEM_PROMPT}\n\nAKTUELLE SYSTEMZEIT:\n- ISO (UTC): ${now.toISOString()}\n- Europa/Berlin: ${berlinTime}\n- Berlin (ISO-ähnlich, Datum): ${berlinIsoDate}\n- Berlin (ISO-ähnlich, Datum+Zeit 24h): ${berlinIsoDateTime}\n- Berlin (ISO-Offset): ${berlinIsoDateTimeWithOffset}\n- Aktuelle Kalenderwoche (Mo-So, Berlin): ${berlinWeekRange}\n- HEUTE (für Filter): ${berlinIsoDate}\n\nNutze diese Angaben direkt, wenn nach dem aktuellen Datum oder der aktuellen Uhrzeit gefragt wird. Berechne relative Zeitangaben (z.B. gestern, morgen, übermorgen, letzte Woche, nächste Woche) ausschließlich auf Basis der Berlin-Zeit und filtere Woche/"Kalenderwoche"-Anfragen strikt auf ${berlinWeekRange}.\n\n**WICHTIG FÜR ZUKUNFTSFILTER**: Wenn der Nutzer nach "zukünftigen", "nächsten", "noch nicht erledigten" Projekten/Einsätzen fragt, verwende IMMER einen Filter mit plan_date >= '${berlinIsoDate}' oder project_date >= '${berlinIsoDate}'. Nur Datensätze mit Datum >= ${berlinIsoDate} sind zukünftig!`

    // Prepare messages for OpenAI
    const openaiMessages: any[] = [
      {
        role: 'system',
        content: systemPromptWithTime,
      },
    ]

    // Add user messages and assistant responses
    // Track tool calls and their responses to ensure proper message structure
    const toolResponses = new Map<string, any>()
    
    // First pass: collect tool responses
    for (const message of messages) {
      if (message.role === 'tool' && message.tool_call_id) {
        toolResponses.set(message.tool_call_id, {
          role: 'tool',
          tool_call_id: message.tool_call_id,
          content: message.content,
        })
      }
    }
    
    // Second pass: build OpenAI messages with proper tool call structure
    for (let i = 0; i < messages.length; i++) {
      const message = messages[i]
      const openaiMessage: any = {
        role: message.role,
        content: message.content,
      }
      
      // For assistant messages with tool_calls, only include them if we have all tool responses
      if (message.role === 'assistant' && message.tool_calls) {
        const allToolCallsHaveResponses = message.tool_calls.every((tc: any) => 
          toolResponses.has(tc.id)
        )
        
        if (allToolCallsHaveResponses) {
          // Include tool_calls and add tool response messages after
          openaiMessage.tool_calls = message.tool_calls
          openaiMessages.push(openaiMessage)
          
          // Add tool response messages for each tool call
          for (const toolCall of message.tool_calls) {
            const toolResponse = toolResponses.get(toolCall.id)
            if (toolResponse) {
              openaiMessages.push(toolResponse)
            }
          }
          continue
        } else {
          // Don't include tool_calls if we don't have all responses
          // This prevents the OpenAI API error - just send the message without tool_calls
        }
      }
      
      // For tool messages, skip them here (they're added after their corresponding assistant message above)
      if (message.role === 'tool') {
        continue
      }
      
      // Preserve tool call ID if present (for tool/function messages)
      if (message.tool_call_id) {
        openaiMessage.tool_call_id = message.tool_call_id
      }
      
      openaiMessages.push(openaiMessage)
    }

    const streamingDisabledEnv =
      process.env.CHAT_STREAMING_DISABLED === 'true' ||
      process.env.NEXT_PUBLIC_DISABLE_STREAMING === 'true'

    const streamingDisabledRequest =
      req.headers.get('x-disable-streaming') === 'true'

    const requestedDateRange = inferDateRange({
      userText: lastUserMessage,
      weekStart,
      weekEnd,
      berlinDateUtc,
    })
    const requestedProjectIdentifiers = inferProjectIdentifier(lastUserMessage)

    if (streamingDisabledEnv || streamingDisabledRequest) {
      return await handleNonStreamingCompletion(
        openaiMessages,
        requestedDateRange,
        requestedProjectIdentifiers
      )
    }

    return handleStreamingCompletion(
      openaiMessages,
      requestedDateRange,
      requestedProjectIdentifiers
    )
  } catch (error) {
    console.error('Chat API error:', error)
    
    // Provide more detailed error information
    let errorMessage = 'Ein Fehler ist aufgetreten.'
    let statusCode = 500
    
    if (error instanceof Error) {
      errorMessage = error.message
      
      // Check for specific error types
      if (error.message.includes('API key') || error.message.includes('OPENAI_API_KEY')) {
        errorMessage = 'OpenAI API-Schlüssel fehlt oder ist ungültig. Bitte überprüfe deine Umgebungsvariablen.'
        statusCode = 401
      } else if (error.message.includes('Supabase') || error.message.includes('SUPABASE')) {
        errorMessage = 'Supabase-Konfiguration fehlt oder ist ungültig. Bitte überprüfe deine Umgebungsvariablen.'
        statusCode = 500
      } else if (error.message.includes('rate limit') || error.message.includes('quota')) {
        errorMessage = 'API-Kontingent überschritten. Bitte versuche es später erneut.'
        statusCode = 429
      }
    }
    
    return NextResponse.json(
      {
        error: errorMessage,
        details: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.stack : String(error)) : undefined,
      },
      { status: statusCode, headers: NO_CACHE_HEADERS }
    )
  }
}

async function handleNonStreamingCompletion(
  openaiMessages: any[],
  requestedDateRange: DateRange | null,
  requestedProjectIdentifiers: {
    projectId: string | null
    projectCode: string | null
    projectName: string | null
  } | null
) {
  // Create a completion with tools (function calling) for database queries
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: openaiMessages,
    tools: getToolDefinitions(),
    tool_choice: 'auto',
    temperature: 0.3, // Lower temperature to reduce hallucinations and be more factual
  })

  const responseMessage = completion.choices[0].message

  // Check if the model wants to call a tool
  if (responseMessage.tool_calls && responseMessage.tool_calls.length > 0) {
    // Get last user message for context
    const lastUserMsg = openaiMessages
      .filter((m: any) => m.role === 'user')
      .pop()?.content || ''
    
    await handleToolCalls(
      responseMessage,
      openaiMessages,
      requestedDateRange,
      requestedProjectIdentifiers,
      lastUserMsg
    )

    // Get the final response from OpenAI after tool execution
    const finalCompletion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: openaiMessages,
      temperature: 0.3, // Lower temperature to reduce hallucinations and be more factual
    })

    const finalMessage = finalCompletion.choices[0].message

    return NextResponse.json(
      {
        message: {
          role: 'assistant',
          content: finalMessage.content || 'I processed your request, but got no response.',
        },
      },
      { headers: NO_CACHE_HEADERS }
    )
  }

  // Return the assistant's response
  return NextResponse.json(
    {
      message: {
        role: 'assistant',
        content: responseMessage.content,
      },
    },
    { headers: NO_CACHE_HEADERS }
  )
}

function getToolDefinitions(): ChatCompletionTool[] {
  return [
    {
      type: 'function',
      function: {
        name: 'queryTable',
        description:
          'Query a table in the Supabase database with optional filters. Use this for simple queries on a single table. For future dates, use filters like {plan_date: {type: "gte", value: "YYYY-MM-DD"}} with today\'s date.',
        parameters: {
          type: 'object',
          properties: {
            tableName: {
              type: 'string',
              description: 'The name of the table to query',
            },
            filters: {
              type: 'object',
              description: 'Optional filters to apply. Can be simple key-value pairs (defaults to eq) or objects with type: "eq", "gte", "lte", "gt", "lt", "between", "like", "ilike", "in". For future dates, use {type: "gte", value: "YYYY-MM-DD"} with today\'s date.',
              additionalProperties: true,
            },
            limit: {
              type: 'number',
              description: 'Maximum number of results to return (default: 100)',
              default: 100,
            },
            joins: {
              type: 'array',
              items: {
                type: 'string',
              },
              description:
                'Optional array of related tables to join. Use Supabase join syntax like ["prices(*)", "categories(*)"]',
            },
          },
          required: ['tableName'],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'queryTableWithJoin',
        description:
          'Query a table with a join to a related table. Use this when data is spread across multiple tables. For "Einkaufspreise der Materialien", use queryTableWithJoin with t_materials and t_material_prices. The function automatically tries multiple join patterns, so you can call it directly without checking structure first.',
        parameters: {
          type: 'object',
          properties: {
            tableName: {
              type: 'string',
              description: 'The name of the main table to query (e.g., "t_materials", "materials")',
            },
            joinTable: {
              type: 'string',
              description:
                'The name of the related table to join (e.g., "t_material_prices", "material_prices", "prices")',
            },
            joinColumn: {
              type: 'string',
              description:
                'Optional: The foreign key column name. For materials/prices, typically "material_id". If not provided, the function will try to auto-detect.',
            },
            filters: {
              type: 'object',
              description: 'Optional filters to apply to the main table (key-value pairs)',
              additionalProperties: true,
            },
            limit: {
              type: 'number',
              description: 'Maximum number of results to return (default: 100)',
              default: 100,
            },
          },
          required: ['tableName', 'joinTable'],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'getTableNames',
        description: 'Get a list of available table names in the database',
        parameters: {
          type: 'object',
          properties: {},
          required: [],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'getTableStructure',
        description:
          'Get the structure (column names) of a specific table or view. IMPORTANT: Many pre-built views exist (v_morningplan_full, v_project_full, v_employee_kpi, etc.) - check these first before manual JOINs!',
        parameters: {
          type: 'object',
          properties: {
            tableName: {
              type: 'string',
              description: 'The name of the table or view to get structure for (e.g., "v_morningplan_full", "t_employees")',
            },
          },
          required: ['tableName'],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'insertRow',
        description:
          'Insert a single row into an allowed table. YOU MUST CALL THIS TOOL - DO NOT JUST SAY YOU WILL DO IT! CRITICAL RULES: 1) When user says "neues projekt" or "projekt hinzufügen" and provides ANY information (even just a name like "ZZZ"), YOU MUST IMMEDIATELY CALL THIS TOOL with tableName="t_projects" and ALL available information from the conversation. 2) When user says "füge worker/mitarbeiter [Name] [Stundensatz] [intern/extern]", extract: name (the name), hourly_rate (the number), contract_type ("Intern" or "Extern" - capitalize first letter!), is_active=true, role=null. 3) If user provides information in multiple messages, COMBINE all information from the conversation history and call insertRow with the complete values object. 4) NEVER ask for more information if you have at least name for projects/employees - use sensible defaults for everything else. 5) ALWAYS set confirm: true when calling this tool - the user has already provided the information. 6) Extract information from ALL previous messages in the conversation, not just the last one. 7) YOU MUST ACTUALLY CALL THIS TOOL FUNCTION - do NOT just respond with text saying you will create it!',
        parameters: {
          type: 'object',
          properties: {
            tableName: {
              type: 'string',
              description:
                'Target table name (must be one of: t_projects, t_morningplan, t_morningplan_staff, t_vehicles, t_employees, t_services, t_materials).',
            },
            values: {
              type: 'object',
              description: 'Column/value pairs for the new row. CRITICAL: Extract ALL information from the ENTIRE conversation history, not just the last message! If user said "neues projekt named ZZZ" in one message and "Köln" in another, combine them: {name: "ZZZ", ort: "Köln"}. For t_projects: name is required, ort is OPTIONAL (can be null). Use defaults for missing optional fields: t_employees (is_active=true, role=null if not specified), t_projects (status="geplant", ort=null if not provided, project_code=auto-generate if missing). Always include at least the name field for projects.',
              additionalProperties: true,
            },
            confirm: {
              type: 'boolean',
              description: 'MUST be true when user confirms with "ja", "ok", "bitte", "ja bitte", etc. Set to false only when showing preview data before confirmation.',
            },
          },
          required: ['tableName', 'values', 'confirm'],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'updateRow',
        description:
          'Update existing row(s) in an allowed table. Use when user says "umbenennen", "ändern", "update", "setze", "aktualisiere", "rename", "change", "modify" or similar. CRITICAL: 1) Extract the identifier from user message (e.g., if user says "projekt zzz umbenennen", use filters: {name: "ZZZ"} to find the project). 2) Extract the new values (e.g., "in aaaa" means values: {name: "AAAA"}). 3) IMMEDIATELY call this tool with tableName, filters, and values. 4) For projects, use filters: {name: "ProjectName"} to find by name. 5) Do NOT create a new row - this is for UPDATING existing data!',
        parameters: {
          type: 'object',
          properties: {
            tableName: {
              type: 'string',
              description:
                'Target table name (must be one of: t_projects, t_morningplan, t_morningplan_staff, t_vehicles, t_employees, t_services, t_materials).',
            },
            filters: {
              type: 'object',
              description: 'Filters to identify which row(s) to update. CRITICAL: Extract the identifier from the user message! If user says "projekt zzz umbenennen", use filters: {name: "ZZZ"} to find the project. Use unique identifiers like project_code, employee_id, name, etc. Can be simple key-value pairs (defaults to eq) or objects with type: "eq", "in". Example: {name: "ZZZ"} to find project named "ZZZ", or {project_code: "PROJ123"}.',
              additionalProperties: true,
            },
            values: {
              type: 'object',
              description: 'Column/value pairs to update. Only include fields that should be changed. Example: {hourly_rate: 10} or {strasse: "Beispielstreet 8"}.',
              additionalProperties: true,
            },
          },
          required: ['tableName', 'filters', 'values'],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'deleteRow',
        description:
          'Delete existing row(s) from an allowed table. Use ONLY when: 1) User explicitly asks to delete/remove data (e.g., "lösche", "entferne", "delete", "remove"), 2) User confirms the deletion, AND 3) You can identify the row(s) using unique identifiers (e.g., project_code, employee_id, name). **WARNING**: Deletion is permanent! Always ask for confirmation before deleting. IMMEDIATELY call this tool when user confirms deletion. Do NOT say you cannot delete - use this tool!',
        parameters: {
          type: 'object',
          properties: {
            tableName: {
              type: 'string',
              description:
                'Target table name (must be one of: t_projects, t_morningplan, t_morningplan_staff, t_vehicles, t_employees, t_services, t_materials).',
            },
            filters: {
              type: 'object',
              description: 'Filters to identify which row(s) to delete. Use unique identifiers like project_code, employee_id, name, etc. Can be simple key-value pairs (defaults to eq) or objects with type: "eq", "in". Example: {name: "Alpha"} or {project_code: "PROJ123"}.',
              additionalProperties: true,
            },
          },
          required: ['tableName', 'filters'],
        },
      },
    },
  ]
}

async function handleToolCalls(
  responseMessage: any,
  openaiMessages: any[],
  requestedDateRange: DateRange | null,
  requestedProjectIdentifiers: {
    projectId: string | null
    projectCode: string | null
    projectName: string | null
  } | null,
  lastUserMessage?: string
) {
  const content = responseMessage.content
  const lowerContent = content?.toLowerCase() || ''
  const isAnnouncement =
    content &&
    (lowerContent.includes('moment') ||
      lowerContent.includes('während ich') ||
      lowerContent.includes('i will') ||
      lowerContent.includes('let me') ||
      lowerContent.includes('ich werde') ||
      lowerContent.includes('ich versuche') ||
      lowerContent.includes("i'll") ||
      lowerContent.includes('ich bin bereit') ||
      lowerContent.includes("i'm ready") ||
      lowerContent.includes('i can help') ||
      lowerContent.includes('wie kann ich dir helfen') ||
      lowerContent.includes('was möchtest du wissen') ||
      lowerContent.includes('was möchtest du tun') ||
      lowerContent.includes('einen moment') ||
      lowerContent.includes('einen augenblick') ||
      lowerContent.includes('ich werde nun') ||
      lowerContent.includes('ich werde jetzt') ||
      lowerContent.includes('ich werde versuchen') ||
      (content.length < 80 &&
        (lowerContent.includes('query') ||
          lowerContent.includes('abfrage') ||
          lowerContent.includes('check') ||
          lowerContent.includes('prüfen') ||
          lowerContent.includes('daten abrufen') ||
          lowerContent.includes('informationen abrufen') ||
          lowerContent.includes('daten aus der datenbank') ||
          lowerContent.includes('informationen aus der datenbank'))))

  openaiMessages.push({
    role: 'assistant',
    content: isAnnouncement ? null : content,
    tool_calls: responseMessage.tool_calls,
  })

  for (const toolCall of responseMessage.tool_calls) {
    const functionName = toolCall.function.name
    const functionArgs = JSON.parse(toolCall.function.arguments || '{}')

    let functionResult: any

    if (functionName === 'queryTable') {
      // Get the last user message for context
      const userMsg = lastUserMessage || openaiMessages
        .filter((m: any) => m.role === 'user')
        .pop()?.content || ''
      
      let filtersWithRange = applyDateRangeFilters(
        functionArgs.tableName,
        functionArgs.filters || {},
        requestedDateRange,
        userMsg
      )
      filtersWithRange = applyProjectFilters(
        functionArgs.tableName,
        filtersWithRange,
        requestedProjectIdentifiers
      )
      const result = await queryTable(
        functionArgs.tableName,
        filtersWithRange,
        functionArgs.limit || 100,
        functionArgs.joins
      )
      functionResult = result
    } else if (functionName === 'queryTableWithJoin') {
      // Get the last user message for context
      const userMsg = lastUserMessage || openaiMessages
        .filter((m: any) => m.role === 'user')
        .pop()?.content || ''
      
      let filtersWithRange = applyDateRangeFilters(
        functionArgs.tableName,
        functionArgs.filters || {},
        requestedDateRange,
        userMsg
      )
      filtersWithRange = applyProjectFilters(
        functionArgs.tableName,
        filtersWithRange,
        requestedProjectIdentifiers
      )
      const result = await queryTableWithJoin(
        functionArgs.tableName,
        functionArgs.joinTable,
        functionArgs.joinColumn,
        filtersWithRange,
        functionArgs.limit || 100
      )
      functionResult = result
    } else if (functionName === 'getTableNames') {
      const result = await getTableNames()
      functionResult = result
    } else if (functionName === 'getTableStructure') {
      const result = await getTableStructure(functionArgs.tableName)
      functionResult = result
    } else if (functionName === 'insertRow') {
      if (!INSERT_ALLOWED_TABLES.has(functionArgs.tableName)) {
        functionResult = {
          error: `Insert not allowed for table: ${functionArgs.tableName}`,
        }
      } else if (!functionArgs.values || typeof functionArgs.values !== 'object') {
        functionResult = { error: 'Missing values for insertRow.' }
      } else {
        // Apply sensible defaults for missing optional fields
        const valuesWithDefaults = { ...functionArgs.values }
        
        if (functionArgs.tableName === 't_employees') {
          // Defaults for employees
          if (valuesWithDefaults.is_active === undefined) {
            valuesWithDefaults.is_active = true
          }
          if (valuesWithDefaults.role === undefined && !valuesWithDefaults.role) {
            valuesWithDefaults.role = null
          }
          if (valuesWithDefaults.hourly_rate === undefined) {
            valuesWithDefaults.hourly_rate = 0
          }
          if (valuesWithDefaults.contract_type === undefined && valuesWithDefaults.contract_type !== 'Intern' && valuesWithDefaults.contract_type !== 'Extern') {
            // Try to infer from user input - if they said "intern", use "Intern"
            if (functionArgs.values.contract_type?.toLowerCase().includes('intern')) {
              valuesWithDefaults.contract_type = 'Intern'
            } else if (functionArgs.values.contract_type?.toLowerCase().includes('extern')) {
              valuesWithDefaults.contract_type = 'Extern'
            }
          }
        } else if (functionArgs.tableName === 't_projects') {
          // Defaults for projects
          if (valuesWithDefaults.status === undefined) {
            valuesWithDefaults.status = 'geplant'
          }
          // Auto-generate project_code if missing
          if (!valuesWithDefaults.project_code) {
            const now = new Date()
            const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '')
            const randomStr = Math.random().toString(36).substring(2, 7).toUpperCase()
            valuesWithDefaults.project_code = `PRJ-${dateStr}-${randomStr}`
          }
        }
        
        if (!functionArgs.confirm) {
          // Preview mode - return the data that would be inserted without actually inserting
          functionResult = {
            preview: true,
            tableName: functionArgs.tableName,
            values: valuesWithDefaults,
            message: 'Bitte bestätige, dass dieser Eintrag erstellt werden soll.',
          }
        } else {
          // Note: We don't have access to req here, so we'll pass undefined for ipAddress
          // In production, you might want to pass this through the function chain
          const result = await insertRow(functionArgs.tableName, valuesWithDefaults)
          functionResult = result
        }
      }
    } else if (functionName === 'updateRow') {
      if (!INSERT_ALLOWED_TABLES.has(functionArgs.tableName)) {
        functionResult = {
          error: `Update not allowed for table: ${functionArgs.tableName}`,
        }
      } else if (!functionArgs.filters || typeof functionArgs.filters !== 'object') {
        functionResult = { error: 'Missing filters for updateRow. Filters are required to identify which row(s) to update.' }
      } else if (!functionArgs.values || typeof functionArgs.values !== 'object') {
        functionResult = { error: 'Missing values for updateRow.' }
      } else {
        // Note: We don't have access to req here, so we'll pass undefined for ipAddress
        // In production, you might want to pass this through the function chain
        const result = await updateRow(functionArgs.tableName, functionArgs.filters, functionArgs.values, {
          requireSingleRow: true, // Require single row for safety
        })
        functionResult = result
      }
    } else if (functionName === 'deleteRow') {
      if (!INSERT_ALLOWED_TABLES.has(functionArgs.tableName)) {
        functionResult = {
          error: `Delete not allowed for table: ${functionArgs.tableName}`,
        }
      } else if (!functionArgs.filters || typeof functionArgs.filters !== 'object') {
        functionResult = { error: 'Missing filters for deleteRow. Filters are required to identify which row(s) to delete.' }
      } else {
        // Note: We don't have access to req here, so we'll pass undefined for ipAddress
        // In production, you might want to pass this through the function chain
        const result = await deleteRow(functionArgs.tableName, functionArgs.filters, {
          requireSingleRow: true, // Require single row for safety
        })
        functionResult = result
      }
    } else {
      functionResult = { error: `Unknown function: ${functionName}` }
    }

    openaiMessages.push({
      role: 'tool',
      tool_call_id: toolCall.id,
      content: JSON.stringify(functionResult),
    })
  }
}

const NO_CACHE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
}

function buildSseResponse(stream: ReadableStream<Uint8Array>) {
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}

function encodeSse(data: object) {
  const encoder = new TextEncoder()
  return encoder.encode(`data: ${JSON.stringify(data)}\n\n`)
}

async function handleStreamingCompletion(
  openaiMessages: any[],
  requestedDateRange: DateRange | null,
  requestedProjectIdentifiers: {
    projectId: string | null
    projectCode: string | null
    projectName: string | null
  } | null
) {
  const stream = new ReadableStream<Uint8Array>({
    start: async (controller) => {
      try {
        const initialStream = await openai.chat.completions.create({
          model: 'gpt-4o',
          messages: openaiMessages,
          tools: getToolDefinitions(),
          tool_choice: 'auto',
          temperature: 0.3,
          stream: true,
        })

        let needsToolCall = false
        const toolCallMap = new Map<
          number,
          {
            id?: string
            function: {
              name?: string
              arguments: string
            }
          }
        >()

        for await (const chunk of initialStream) {
          const delta = chunk.choices[0]?.delta
          if (!delta) continue

          if (delta.tool_calls) {
            needsToolCall = true
            for (const toolCall of delta.tool_calls) {
              const index = toolCall.index ?? 0
              const existing = toolCallMap.get(index) || {
                id: toolCall.id,
                function: { name: toolCall.function?.name, arguments: '' },
              }

              if (toolCall.id) existing.id = toolCall.id
              if (toolCall.function?.name) existing.function.name = toolCall.function.name
              if (toolCall.function?.arguments) {
                existing.function.arguments += toolCall.function.arguments
              }

              toolCallMap.set(index, existing)
            }
            continue
          }

          if (delta.content) {
            controller.enqueue(encodeSse({ type: 'token', content: delta.content }))
          }
        }

        if (needsToolCall) {
          const tool_calls = Array.from(toolCallMap.entries())
            .sort(([a], [b]) => a - b)
            .map(([, value]) => ({
              id: value.id,
              type: 'function',
              function: value.function,
            }))

          // Send tool calls to client so they can be preserved in message history
          controller.enqueue(encodeSse({ type: 'tool_calls', tool_calls }))

          // Get last user message for context
          const lastUserMsg = openaiMessages
            .filter((m: any) => m.role === 'user')
            .pop()?.content || ''
          
          // Track how many tool messages exist before handleToolCalls
          const toolMessageCountBefore = openaiMessages.filter((m: any) => m.role === 'tool').length
          
          await handleToolCalls(
            { tool_calls, content: null },
            openaiMessages,
            requestedDateRange,
            requestedProjectIdentifiers,
            lastUserMsg
          )

          // Send tool response messages to client so they can be preserved
          // Get only the tool messages that were just added
          const allToolMessages = openaiMessages.filter((m: any) => m.role === 'tool')
          const newToolMessages = allToolMessages.slice(toolMessageCountBefore)
          
          for (const toolResponse of newToolMessages) {
            controller.enqueue(encodeSse({ 
              type: 'tool_response', 
              tool_call_id: toolResponse.tool_call_id,
              content: toolResponse.content 
            }))
          }

          const finalStream = await openai.chat.completions.create({
            model: 'gpt-4o',
            messages: openaiMessages,
            temperature: 0.3,
            stream: true,
          })

          for await (const chunk of finalStream) {
            const delta = chunk.choices[0]?.delta
            if (!delta) continue
            if (delta.content) {
              controller.enqueue(encodeSse({ type: 'token', content: delta.content }))
            }
          }
        }

        controller.enqueue(encodeSse({ type: 'done' }))
        controller.close()
      } catch (error) {
        console.error('Streaming error:', error)
        controller.enqueue(
          encodeSse({
            type: 'error',
            message: error instanceof Error ? error.message : 'An error occurred while streaming.',
          })
        )
        controller.close()
      }
    },
  })

  return buildSseResponse(stream)
}
