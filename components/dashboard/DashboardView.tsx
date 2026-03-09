'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { RefreshCw } from 'lucide-react'
import KpiCards from './KpiCards'
import ProjectsOverview from './ProjectsOverview'
import UpcomingInspections from './UpcomingInspections'
import TodaySchedule from './TodaySchedule'
import QuickActions from './QuickActions'
import type { Project, Inspection, MorningPlanFull } from '@/types/supabase'

interface DashboardData {
    kpis: {
        activeProjects: number
        activeEmployees: number
        upcomingInspections: number
        weeklyHours: number
    }
    recentProjects: Project[]
    upcomingInspections: Inspection[]
    todaySchedule: MorningPlanFull[]
    generatedAt?: string
}

interface DashboardViewProps {
    onNavigateToChat: () => void
}

function getGreeting(): string {
    const hour = new Date().getHours()
    if (hour < 12) return 'Guten Morgen'
    if (hour < 18) return 'Guten Tag'
    return 'Guten Abend'
}

function formatTodayDate(): string {
    return new Date().toLocaleDateString('de-DE', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    })
}

export default function DashboardView({ onNavigateToChat }: DashboardViewProps) {
    const [data, setData] = useState<DashboardData | null>(null)
    const [loading, setLoading] = useState(true)
    const [refreshing, setRefreshing] = useState(false)

    const fetchDashboard = useCallback(async (isRefresh = false) => {
        if (isRefresh) setRefreshing(true)
        else setLoading(true)

        try {
            const res = await fetch('/api/dashboard')
            if (!res.ok) throw new Error(`HTTP ${res.status}`)
            const json: DashboardData = await res.json()
            setData(json)
        } catch (err) {
            console.error('[Dashboard] Fetch error:', err)
            // Set empty data so the UI renders with zero-states
            setData({
                kpis: { activeProjects: 0, activeEmployees: 0, upcomingInspections: 0, weeklyHours: 0 },
                recentProjects: [],
                upcomingInspections: [],
                todaySchedule: [],
            })
        } finally {
            setLoading(false)
            setRefreshing(false)
        }
    }, [])

    useEffect(() => {
        fetchDashboard()
    }, [fetchDashboard])

    const kpis = data?.kpis ?? { activeProjects: 0, activeEmployees: 0, upcomingInspections: 0, weeklyHours: 0 }
    const recentProjects = (data?.recentProjects ?? []) as Project[]
    const inspections = (data?.upcomingInspections ?? []) as Inspection[]
    const schedule = (data?.todaySchedule ?? []) as MorningPlanFull[]

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-slate-900 transition-colors duration-200">
            {/* Header */}
            <header className="sticky top-0 z-30 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-gray-100 dark:border-slate-800">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 sm:py-5">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                                {getGreeting()} 👋
                            </h1>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                                {formatTodayDate()}
                            </p>
                        </div>
                        <button
                            onClick={() => fetchDashboard(true)}
                            disabled={refreshing}
                            className="p-2.5 rounded-xl bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors duration-200 disabled:opacity-50"
                            aria-label="Dashboard aktualisieren"
                        >
                            <RefreshCw
                                className={`w-4.5 h-4.5 text-gray-500 dark:text-gray-400 ${refreshing ? 'animate-spin' : ''}`}
                            />
                        </button>
                    </div>
                </div>
            </header>

            {/* Content */}
            <main className="max-w-6xl mx-auto px-4 sm:px-6 py-5 sm:py-6 space-y-5 sm:space-y-6 pb-24">
                {/* Quick Actions */}
                <QuickActions onNavigateToChat={onNavigateToChat} />

                {/* KPI Cards */}
                <KpiCards data={kpis} loading={loading} />

                {/* Two-column grid for lists */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-6">
                    {/* Left column */}
                    <div className="space-y-5 sm:space-y-6">
                        <ProjectsOverview projects={recentProjects} loading={loading} />
                        <TodaySchedule schedule={schedule} loading={loading} />
                    </div>

                    {/* Right column */}
                    <div>
                        <UpcomingInspections inspections={inspections} loading={loading} />
                    </div>
                </div>

                {/* Last updated */}
                {data?.generatedAt && (
                    <p className="text-center text-xs text-gray-400 dark:text-gray-600 pt-2">
                        Aktualisiert: {new Date(data.generatedAt).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                )}
            </main>
        </div>
    )
}
