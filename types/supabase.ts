/**
 * Supabase database types.
 *
 * Generated from the schema documented in the system prompt.
 * These types replace `any` in database-related code and provide
 * compile-time safety for table queries, inserts, and updates.
 */

// ─── Core tables ────────────────────────────────────────────────

export interface Project {
    project_id: string // uuid PK
    project_code: string // text, unique
    name: string
    customer_name: string | null
    customer_email: string | null
    customer_phone: string | null
    strasse: string | null
    nr: string | null
    plz: string | null
    stadt: string | null
    notes: string | null
    status: string // default: 'In Planung'
    dienstleistungen: string | null
    project_date: string | null // date
    project_time: string | null // time
    offer_type: string | null
    project_start_date: string | null // date
    project_end_date: string | null // date
    besichtigung: boolean | null
    created_at: string // timestamptz
    updated_at: string // timestamptz
}

export interface Employee {
    employee_id: string // uuid PK
    employee_code: string // text, unique
    name: string
    email: string | null
    phone: string | null
    role: string | null
    contract_type: string | null
    weekly_hours_contract: number | null // numeric
    hourly_rate: number | null // numeric
    notes: string | null
    is_active: boolean // default: true
    created_at: string
    updated_at: string
}

export interface AppUser {
    user_id: string // uuid PK
    email: string // text, unique
    role: 'Admin' | 'Secretary' | 'Planner' | 'Supervisor' | 'Worker'
    user_type: 'office' | 'field'
    is_active: boolean // default: true
    created_at: string
    updated_at: string
}

// ─── Morning plan ───────────────────────────────────────────────

export interface MorningPlan {
    plan_id: string // uuid PK
    plan_date: string // date
    project_id: string | null // uuid FK → t_projects
    vehicle_id: string | null // text FK → t_vehicles
    start_time: string | null // time
    service_type: string | null
    notes: string | null
    angebotsart: string | null
    created_at: string
    updated_at: string
}

export interface MorningPlanStaff {
    id: number // bigint PK
    plan_id: string // uuid FK → t_morningplan
    employee_id: string // uuid FK → t_employees
    role: string | null
    individual_start_time: string | null // time
    member_notes: string | null
    sort_order: number // int
}

// ─── Vehicles ───────────────────────────────────────────────────

export interface Vehicle {
    vehicle_id: string // text PK
    nickname: string | null
    unit: string // default: 'Tag'
    status: string // default: 'bereit'
    inhalt: string | null
    notes: string | null
    is_deleted: boolean | null
    created_at: string
    updated_at: string
}

export interface VehicleRate {
    vehicle_id: string // text PK, FK → t_vehicles
    cost_per_unit: number | null // numeric
    gas_cost_per_unit: number | null // numeric
    price_per_unit: number | null // numeric
    gas_price_per_unit: number | null // numeric
    currency: string | null
    updated_by: string | null // uuid
    updated_at: string | null
    total_cost_per_unit: number | null // generated: cost + gas cost
    total_price_per_unit: number | null // generated: price + gas price
}

export interface VehicleInventory {
    id: number // serial int PK
    vehicle_id: string // text FK → t_vehicles
    inventory_date: string | null // date
    contents: string | null
    reported_by: string | null // uuid
    created_at: string | null
}

export interface VehicleDailyStatus {
    id: number // int PK
    vehicle_name: string | null
    status: string | null
    informationen: string | null
    plan_date: string | null // date
    vehicle_id: string | null // text FK → t_vehicles
    created_at: string
    updated_at: string
}

// ─── Materials ──────────────────────────────────────────────────

export interface Material {
    material_id: string // text PK
    name: string
    unit: string | null
    category: string | null
    vat_rate: number // numeric, default: 19.00
    is_active: boolean // default: true
    default_quantity: number | null // numeric
    created_at: string
    updated_at: string
}

export interface MaterialPrice {
    material_id: string // text PK, FK → t_materials
    cost_per_unit: number | null // numeric
    price_per_unit: number | null // numeric
    currency: string // default: 'EUR'
    updated_by: string | null // uuid
    updated_at: string | null
}

export interface MaterialPriceHistory {
    hist_id: string // uuid PK
    material_id: string // text FK → t_materials
    old_price: number | null // numeric
    new_price: number | null // numeric
    changed_at: string | null
    changed_by: string | null // uuid
}

// ─── Services ───────────────────────────────────────────────────

export interface Service {
    service_id: string // text PK
    name: string
    default_unit: string | null
    category: string | null
    is_active: boolean // default: true
    created_at: string
    updated_at: string
}

export interface ServicePrice {
    price_id: string // text PK
    service_id: string // text FK → t_services
    supplier: string | null
    unit: string | null
    cost_per_unit: number | null // numeric
    customer_price_per_unit: number | null // numeric
}

// ─── Inspections ────────────────────────────────────────────────

export interface Inspection {
    inspection_id: string // uuid PK
    project_id: string | null // uuid FK → t_projects
    customer_name: string | null
    customer_email: string | null
    customer_phone: string | null
    strasse: string | null
    nr: string | null
    plz: string | null
    stadt: string | null
    appointment_at: string | null // timestamptz
    status: string // default: 'Geplant'
    notes: string | null
    ziel_strasse: string | null
    ziel_nr: string | null
    ziel_plz: string | null
    ziel_stadt: string | null
    etage: string | null
    hvz: string | null
    created_at: string
    updated_at: string
}

export interface InspectionItem {
    id: number // bigint PK
    inspection_id: string // uuid FK → t_inspections
    room: string | null
    notes: string | null
    volume_m3: number | null // numeric
    persons: number | null // int
    hours: number | null // numeric
    sum_hours: number | null // generated: persons * hours
    entsorgungskosten: number | null // numeric
    created_at: string | null
}

export interface InspectionRoomItem {
    id: number // int PK
    inspection_id: string // uuid FK → t_inspections
    room_id: number | null // int, ref t_inspection_items.id
    item_name: string | null
    quantity: number // int, default: 1
    montage_option: string // default: 'Keine'
    notes: string | null
    created_at: string
    updated_at: string
}

export interface InspectionPhoto {
    id: number // bigint PK
    inspection_id: string // uuid FK → t_inspections
    url: string | null
    caption: string | null
    created_at: string | null
}

export interface InspectionSignature {
    id: number // bigint PK
    inspection_id: string // uuid FK → t_inspections
    signer_name: string | null
    signed_at: string | null // timestamptz
    signature_data: string | null
}

export interface InspectionCalcItem {
    id: string // uuid PK
    inspection_id: string // uuid FK → t_inspections
    source_item_id: number | null // bigint FK → t_inspection_items
    kind: string | null // 'material' | 'service' | 'labour'
    position_label: string | null
    qty: number // numeric, default: 1
    unit: string | null
    unit_price: number // numeric, default: 0
    line_total: number | null // generated: qty * unit_price
    sort_order: number | null // int
    created_at: string | null
}

export interface InspectionDiscount {
    id: string // uuid PK
    inspection_id: string // uuid FK → t_inspections
    mode: string | null
    value: number | null // numeric
    description: string | null
    created_at: string | null
}

// ─── Time tracking ──────────────────────────────────────────────

export interface TimePair {
    id: number // int PK
    pair_id: string | null // text, unique extern
    project_id: string | null // uuid FK → t_projects
    datum: string | null // date
    mitarbeiter: string | null // text snapshot name
    lis_von: string | null // time
    lis_bis: string | null // time
    kunde_von: string | null // time
    kunde_bis: string | null // time
    pause_min: number // int, default: 0
    ges_lis_h: number | null // generated
    ges_kd_h: number | null // generated
    employee_id: string | null // uuid FK → t_employees
    created_at: string
    updated_at: string
}

// ─── Financial ──────────────────────────────────────────────────

export interface ProjectCostExtra {
    cost_id: string // uuid PK
    project_id: string | null // uuid FK → t_projects
    cost_type: string | null
    description: string | null
    cost: number | null // numeric
    phase: string | null
    created_at: string | null
}

export interface DisposalCost {
    id: string // uuid PK
    project_id: string | null // uuid FK → t_projects
    waste_type: string | null
    used_unit: number | null // numeric
    cost_per_unit: number | null // numeric
    total_cost: number | null // generated: used_unit * cost_per_unit
    phase: string | null
    created_at: string | null
}

export interface ProjectDiscount {
    id: string // uuid PK
    project_id: string | null // uuid FK → t_projects
    target: string | null
    mode: string | null // 'flat' | 'percent'
    value: number | null // numeric
    description: string | null
    created_at: string | null
}

export interface ProjectVehicleCost {
    id: string // uuid PK
    project_id: string | null // uuid FK → t_projects
    vehicle_id: string | null // text FK → t_vehicles
    cost_per_unit: number | null
    price_per_unit: number | null
    quantity: number | null
    phase: string | null
    created_at: string | null
}

export interface ProjectMaterialUsage {
    id: string // uuid PK
    project_id: string | null // uuid FK → t_projects
    material_id: string | null // text FK → t_materials
    quantity: number // numeric, default: 1
    phase: string // default: 'Nachkalkulation'
    created_at: string | null
}

// ─── Abnahme / Handover ─────────────────────────────────────────

export interface Abnahme {
    abnahme_id: string // uuid PK
    project_id: string | null // uuid FK → t_projects
    plan_id: string | null // uuid FK → t_morningplan
    datum: string | null // date
    created_at: string
    updated_at: string
    // Many additional fields (billing, onsite times, boolean flags,
    // material counters, moving-supply counters) omitted for brevity.
    // Add as needed when querying/inserting this table.
    [key: string]: unknown
}

// ─── Employee history ───────────────────────────────────────────

export interface EmployeeRateHistory {
    hist_id: number // bigint PK
    employee_id: string // uuid FK → t_employees
    old_hourly_rate: number | null // numeric
    new_hourly_rate: number | null // numeric
    changed_at: string | null
    changed_by: string | null // uuid
}

// ─── Worker ratings ─────────────────────────────────────────────

export interface WorkerRating {
    rating_id: string // text PK
    project_id: string | null // uuid FK → t_projects
    plan_id: string | null // uuid FK → t_morningplan
    employee_id: string | null // text (not FK)
    employee_name: string | null
    datum: string | null // date
    rating: number | null // int, 1-10
    notes: string | null
    created_at: string
    updated_at: string
}

// ─── Media / notes ──────────────────────────────────────────────

export interface ProjectNoteMedia {
    id: string // uuid PK
    project_id: string | null // uuid FK → t_projects
    field_key: string | null
    mode: string | null
    text_value: string | null
    image_base64: string | null // legacy
    created_at: string | null
}

// ─── CRM ────────────────────────────────────────────────────────

export interface Contact {
    id: number // int PK
    lexware_id: string | null // unique
    name: string | null
    anrede: string | null
    notes: string | null
    version: number | null // int
    created_date: string | null // date
    updated_date: string | null // date
    synced_at: string | null
    organization_id: string | null
    kundennummer: string | null
    lieferantennummer: string | null
    firma: string | null
    strasse: string | null
    nr: string | null
    plz: string | null
    stadt: string | null
    email: string | null
    phone: string | null
    archived: boolean | null
}

// ─── Chat persistence ───────────────────────────────────────────

export interface DbChat {
    id: string // uuid PK
    user_id: string // uuid FK → auth.users.id
    title: string // default: 'Neuer Chat'
    message_count: number | null // int
    is_shared: boolean | null
    shared_with_user_ids: string[] | null // uuid[]
    created_at: string
    updated_at: string
}

export interface DbChatMessage {
    id: string // uuid PK
    chat_id: string // uuid FK → t_chats
    role: 'user' | 'assistant' | 'tool'
    content: string | null
    timestamp: string | null // timestamptz
    tool_calls: unknown | null // jsonb
    tool_call_id: string | null
    created_at: string | null
}

// ─── Views (read-only) ─────────────────────────────────────────

export interface MorningPlanFull {
    plan_id: string
    plan_date: string
    start_time: string | null
    service_type: string | null
    notes: string | null
    project_code: string | null
    project_name: string | null
    project_ort: string | null
    vehicle_nickname: string | null
    vehicle_status: string | null
    staff_list: string | null
}

export interface ProjectFull {
    project_id: string
    project_code: string
    name: string
    stadt: string | null
    status: string | null
    project_date: string | null
    dienstleistungen: string | null
    customer_name: string | null
    // Additional computed/joined fields
    [key: string]: unknown
}

export interface EmployeeKpi {
    employee_id: string
    name: string
    total_hours: number | null
    total_projects: number | null
    [key: string]: unknown
}

export interface ProjectProfit {
    project_id: string
    name: string
    total_revenue: number | null
    total_cost: number | null
    gross_margin: number | null
    [key: string]: unknown
}

// ─── Table name → Row type mapping ─────────────────────────────

export interface TableTypeMap {
    t_projects: Project
    t_employees: Employee
    t_users: AppUser
    t_morningplan: MorningPlan
    t_morningplan_staff: MorningPlanStaff
    t_vehicles: Vehicle
    t_vehicle_rates: VehicleRate
    t_vehicle_inventory: VehicleInventory
    t_vehicle_daily_status: VehicleDailyStatus
    t_materials: Material
    t_material_prices: MaterialPrice
    t_material_price_history: MaterialPriceHistory
    t_services: Service
    t_service_prices: ServicePrice
    t_inspections: Inspection
    t_inspection_items: InspectionItem
    t_inspection_room_items: InspectionRoomItem
    t_inspection_photos: InspectionPhoto
    t_inspection_signatures: InspectionSignature
    t_inspection_calc_items: InspectionCalcItem
    t_inspection_discounts: InspectionDiscount
    t_time_pairs: TimePair
    t_project_costs_extra: ProjectCostExtra
    t_disposal_costs: DisposalCost
    t_project_discounts: ProjectDiscount
    t_project_vehicle_costs: ProjectVehicleCost
    t_project_material_usage: ProjectMaterialUsage
    t_abnahmen: Abnahme
    t_employee_rate_history: EmployeeRateHistory
    t_worker_ratings: WorkerRating
    t_project_note_media: ProjectNoteMedia
    contacts: Contact
    t_chats: DbChat
    t_chat_messages: DbChatMessage
    v_morningplan_full: MorningPlanFull
    v_project_full: ProjectFull
    v_employee_kpi: EmployeeKpi
    v_project_profit: ProjectProfit
}

/** Name of any queryable table or view */
export type TableName = keyof TableTypeMap
