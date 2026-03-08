/**
 * Tool (function-calling) definitions for the chat API.
 *
 * Defines the OpenAI tools schema for queryTable, queryTableWithJoin,
 * getTableNames, getTableStructure, getStatistics, insertRow,
 * updateRow, and deleteRow.
 */

import type { ChatCompletionTool } from 'openai/resources/chat/completions'

export function getToolDefinitions(): ChatCompletionTool[] {
  return [
    {
      type: 'function',
      function: {
        name: 'queryTable',
        description:
          'Query a table in the Supabase database with optional filters. Use this for simple queries on a single table. For future dates, use filters like {plan_date: {type: "gte", value: "YYYY-MM-DD"}} with today\'s date. **CRITICAL**: Always use appropriate LIMIT (default 10-20 for most queries, 5-10 for "heute" queries). NEVER return hundreds of rows - always filter by the user\'s specific question (date, project name, etc.). **IMPORTANT FOR EMPLOYEE SEARCHES**: When querying t_employees with a name filter, you can use simple {name: "EmployeeName"} - the system automatically converts it to fuzzy matching (ilike) for better results. Use limit: 50 for employee searches to ensure you find them even if they\'re not in the first 10 results.',
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
              description: 'Maximum number of results to return. **CRITICAL**: Use small limits (5-20) for most queries. For "heute" queries use 5-10. For general queries use 10-20. Only use 100 if user explicitly asks for "all" or "alle". Default: 20 for most queries, 10 for date-specific queries.',
              default: 20,
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
              description: 'Maximum number of results to return. **CRITICAL**: Use small limits (5-20) for most queries. For "heute" queries use 5-10. For general queries use 10-20. Only use 100 if user explicitly asks for "all" or "alle". Default: 20 for most queries, 10 for date-specific queries.',
              default: 20,
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
        name: 'getStatistics',
        description:
          'Get statistics and aggregations from a table. Use this when the user asks for counts, sums, averages, or grouped statistics. Examples: "Wie viele Mitarbeiter sind diese Woche eingeplant?", "Welches Projekt hat die meisten Mitarbeiter?", "Zeige Auslastung pro Mitarbeiter", "Wie viele Projekte gibt es diesen Monat?". Supports COUNT, SUM, AVG, MIN, MAX with optional GROUP BY. **CRITICAL**: When user asks for statistics, ALWAYS use this tool instead of queryTable. Format results as clear tables or lists with proper Markdown formatting.',
        parameters: {
          type: 'object',
          properties: {
            tableName: {
              type: 'string',
              description: 'The name of the table to get statistics from (e.g., "t_employees", "v_morningplan_full", "t_projects")',
            },
            aggregation: {
              type: 'string',
              enum: ['count', 'sum', 'avg', 'min', 'max'],
              description: 'Type of aggregation: "count" for counting rows, "sum" for summing numeric values, "avg" for average, "min" for minimum, "max" for maximum',
              default: 'count',
            },
            column: {
              type: 'string',
              description: 'Optional: Column name for sum/avg/min/max operations. Required for sum, avg, min, max. For count, can be omitted to count all rows, or provided to count non-null values in that column.',
            },
            groupBy: {
              type: 'string',
              description: 'Optional: Column name to group by. Use this to get statistics per group (e.g., groupBy: "project_name" to get count per project).',
            },
            filters: {
              type: 'object',
              description: 'Optional filters to apply before calculating statistics. Same format as queryTable filters. Use date filters for time-based statistics (e.g., "diese Woche", "diesen Monat").',
              additionalProperties: true,
            },
            limit: {
              type: 'number',
              description: 'Maximum number of groups to return when using groupBy. Default: 100',
              default: 100,
            },
          },
          required: ['tableName', 'aggregation'],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'insertRow',
        description:
          'Insert a single row into an allowed table. YOU MUST CALL THIS TOOL IMMEDIATELY - DO NOT JUST SAY YOU WILL DO IT! CRITICAL RULES: 1) When user says "neues projekt" or "projekt hinzufügen" or "neuer Eintrag projekt" or "projekt erstellen" and provides ANY information (even just a name), IMMEDIATELY CALL THIS TOOL with tableName="t_projects" and values MUST be a valid object with at least name field. 2) When user says "neu mitarbeiter" or "neuer arbeiter" or "worker" with ANY information (even just a name), IMMEDIATELY CALL THIS TOOL with tableName="t_employees" and values MUST be a valid object with at least name field. 3) When user says "neues material" or "material hinzufügen" or "material erstellen" and provides ANY information (even just a name), IMMEDIATELY CALL THIS TOOL with tableName="t_materials" and values MUST be a valid object with at least name field. The material_id will be auto-generated if not provided. 4) When user says "EK [price] VK [price]" or mentions Einkaufspreis/Verkaufspreis for a material, IMMEDIATELY CALL THIS TOOL with tableName="t_material_prices". First query t_materials to find material_id by name using queryTable, then call insertRow with values containing material_id, purchase_price (EK value), and sale_price (VK value). 5) **CRITICAL FOR ADDING EMPLOYEES TO PROJECTS - INCLUDING BATCH OPERATIONS**: When user says "füge [EmployeeName] zu [ProjectName] hinzu", "mitarbeiter hinzufügen", "weise zu" or similar, you MUST: a) **BATCH OPERATIONS**: If user mentions MULTIPLE employees (e.g., "füge Achim, Ali und Björn hinzu"), extract ALL names and process EACH separately - call insertRow MULTIPLE times (once per employee). After all operations, provide a summary. b) FIRST do queries silently (don\'t announce): query v_morningplan_full with {project_name: "[ProjectName]", plan_date: "[date if mentioned]"} to get plan_id from result[0].plan_id. If no date mentioned, use today\'s date or the most recent plan_date. c) Query t_employees with {name: "[EmployeeName]"} and limit: 50 to get employee_id from result[0].employee_id for EACH employee (use limit: 50 because employees might not be in first 10 results - if still not found, try limit: 100). d) IMMEDIATELY call insertRow for EACH employee with tableName="t_morningplan_staff", values={plan_id: "[plan_id_from_step_b]", employee_id: "[employee_id_from_step_c]", sort_order: 0}, confirm=true. **For batch operations, call insertRow MULTIPLE times - once per employee!** **DO NOT announce anything - do queries silently, then call tool immediately!** **NEVER say "Ich werde", "Moment bitte", "Einen Moment" - just DO IT!** 6) NEVER ask for more information - if you have at least a name, call the tool immediately with defaults! 7) If user provides info in multiple messages, COMBINE all info from conversation history. 8) ALWAYS set confirm: true - user already provided the info. 9) Extract info from ALL previous messages. 10) YOU MUST ACTUALLY CALL THIS TOOL FUNCTION - do NOT just respond with text saying you will create it! 11) The values parameter MUST be a valid JSON object (not null, not undefined, not empty string) with at least the required fields (name for projects/employees/materials, plan_id and employee_id for t_morningplan_staff, material_id for material_prices).',
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
              description: 'Column/value pairs for the new row. CRITICAL: Extract ALL information from the ENTIRE conversation history, not just the last message! If user said "neues projekt named ZZZ" in one message and "Köln" in another, combine them: {name: "ZZZ", stadt: "Köln"}. For t_projects: name is required, stadt is OPTIONAL (can be null - NOTE: field is "stadt", NOT "ort"!). Use defaults for missing optional fields: t_employees (is_active=true, role=null if not specified), t_projects (status="In Planung", stadt=null if not provided, project_code=auto-generate if missing). Field mapping: "name" = project name, "stadt" = city (NOT "ort"!), "dienstleistungen" = service type, "project_date" = project date (YYYY-MM-DD). Always include at least the name field for projects.',
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
          'Update existing row(s) in an allowed table. Use when user says "umbenennen", "ändern", "update", "setze", "aktualisiere", "rename", "change", "modify" or similar. CRITICAL: 1) **CONTEXT AWARENESS**: If the user mentions a specific project name AND date in the current message (e.g., "für das Projekt Besichtigung am 30. Dezember"), use BOTH name AND date in your filters. If user says "Diese Informationen waren aber für das Projekt [X] am [Datum]", immediately switch to that project and date. 2) Extract the identifier from user message (e.g., if user says "projekt zzz umbenennen", use filters: {name: "ZZZ"} to find the project). If a date is mentioned, also filter by project_date or plan_date. 3) Extract the new values (e.g., "in aaaa" means values: {name: "AAAA"}). 4) IMMEDIATELY call this tool with tableName, filters, and values. 5) For projects, use filters: {name: "ProjectName"} to find by name. If a date was mentioned, also include date filter. 6) CRITICAL FOR EMPLOYEE START TIMES: When user says "startzeit [EmployeeName] [Time]" or mentions setting an employee start time for a project, you MUST update t_morningplan_staff table with individual_start_time field. First query to find plan_id (from t_morningplan using project name AND date if mentioned) and employee_id (from t_employees using employee name), then use both as filters: filters: {plan_id: "...", employee_id: "..."} and values: {individual_start_time: "HH:MM:SS"}. 7) Do NOT create a new row - this is for UPDATING existing data! 8) NEVER update a different project just because it has a similar name - always verify both name AND date match if date was mentioned.',
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
          'Delete existing row(s) from an allowed table. Use ONLY when: 1) User explicitly asks to delete/remove data (e.g., "lösche", "entferne", "delete", "remove"), 2) User confirms the deletion, AND 3) You have the unique identifier (e.g., employee_id, project_id, plan_id) from a previous query. **CRITICAL WORKFLOW - AUTOMATIC QUERY REQUIRED**: If the user provides a NAME (e.g., "lösche SSS" or "entferne Mitarbeiter Achim"), you MUST AUTOMATICALLY call queryTable FIRST to find the unique ID. Do NOT ask the user for the ID - find it yourself! Steps: 1) Call queryTable with the name filter (e.g., {name: "SSS"} for t_employees), 2) Extract the unique ID from the result (e.g., employee_id), 3) Ask for confirmation, 4) When confirmed, call deleteRow with the ID (e.g., {employee_id: "abc-123"}). **WARNING**: Deletion is permanent! Always ask for confirmation before deleting. IMMEDIATELY call this tool when user confirms deletion. Use filters with the actual ID (e.g., {employee_id: "abc-123"}), NOT the name! Do NOT say you cannot delete - AUTOMATICALLY query first to get the ID, then delete!',
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
