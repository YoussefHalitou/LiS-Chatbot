import { NextResponse } from 'next/server'
import { queryTable, getStatistics } from '@/lib/supabase-query'

/**
 * GET /api/dashboard
 *
 * Returns consolidated dashboard data:
 * - KPI counters (projects, employees, inspections, weekly hours)
 * - Recent projects (last 5)
 * - Upcoming inspections (next 5 with status 'Geplant')
 * - Today's morning plan schedule
 */
export async function GET() {
    try {
        const today = new Date().toISOString().split('T')[0] // YYYY-MM-DD

        // Calculate start of current week (Monday)
        const now = new Date()
        const dayOfWeek = now.getDay() // 0=Sun … 6=Sat
        const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
        const weekStart = new Date(now)
        weekStart.setDate(now.getDate() + mondayOffset)
        const weekStartStr = weekStart.toISOString().split('T')[0]

        // Fire all queries in parallel
        const [
            activeProjectsRes,
            activeEmployeesRes,
            upcomingInspectionsCountRes,
            weeklyHoursRes,
            recentProjectsRes,
            upcomingInspectionsRes,
            todayScheduleRes,
        ] = await Promise.all([
            // KPI 1: Active projects (status ≠ 'Abgeschlossen')
            getStatistics('t_projects', {
                aggregation: 'count',
                filters: { status: { type: 'neq', value: 'Abgeschlossen' } },
            }),

            // KPI 2: Active employees
            getStatistics('t_employees', {
                aggregation: 'count',
                filters: { is_active: true },
            }),

            // KPI 3: Upcoming inspections (status = 'Geplant')
            getStatistics('t_inspections', {
                aggregation: 'count',
                filters: { status: 'Geplant' },
            }),

            // KPI 4: Total hours this week
            getStatistics('t_time_pairs', {
                aggregation: 'sum',
                column: 'ges_lis_h',
                filters: {
                    datum: { type: 'gte', value: weekStartStr },
                },
            }),

            // Recent projects
            queryTable('t_projects', {}, 5),

            // Upcoming inspections
            queryTable(
                't_inspections',
                {
                    status: 'Geplant',
                    appointment_at: { type: 'gte', value: today },
                },
                5
            ),

            // Today's schedule
            queryTable('v_morningplan_full', { plan_date: today }, 20),
        ])

        // Extract values safely
        const extractCount = (res: { data?: unknown; error?: unknown }): number => {
            if (res.error || !res.data) return 0
            if (typeof res.data === 'number') return res.data
            if (Array.isArray(res.data) && res.data.length > 0) {
                const first = res.data[0] as Record<string, unknown>
                const val = first.count ?? first.sum ?? first.value ?? 0
                return Number(val) || 0
            }
            return 0
        }

        const kpis = {
            activeProjects: extractCount(activeProjectsRes),
            activeEmployees: extractCount(activeEmployeesRes),
            upcomingInspections: extractCount(upcomingInspectionsCountRes),
            weeklyHours: Math.round(extractCount(weeklyHoursRes) * 10) / 10,
        }

        // Sort recent projects by created_at desc (client side fallback)
        const recentProjects = Array.isArray(recentProjectsRes.data)
            ? [...(recentProjectsRes.data as unknown as Record<string, unknown>[])].sort(
                (a, b) =>
                    new Date(String(b.created_at ?? '')).getTime() -
                    new Date(String(a.created_at ?? '')).getTime()
            )
            : []

        // Sort upcoming inspections by appointment_at asc
        const upcomingInspections = Array.isArray(upcomingInspectionsRes.data)
            ? [...(upcomingInspectionsRes.data as unknown as Record<string, unknown>[])].sort(
                (a, b) =>
                    new Date(String(a.appointment_at ?? '')).getTime() -
                    new Date(String(b.appointment_at ?? '')).getTime()
            )
            : []

        const todaySchedule = Array.isArray(todayScheduleRes.data)
            ? todayScheduleRes.data
            : []

        return NextResponse.json({
            kpis,
            recentProjects,
            upcomingInspections,
            todaySchedule,
            generatedAt: new Date().toISOString(),
        })
    } catch (error) {
        console.error('[Dashboard API] Error:', error)
        return NextResponse.json(
            {
                kpis: { activeProjects: 0, activeEmployees: 0, upcomingInspections: 0, weeklyHours: 0 },
                recentProjects: [],
                upcomingInspections: [],
                todaySchedule: [],
                error: error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 200 } // Still 200 — the dashboard renders with zero-state
        )
    }
}
