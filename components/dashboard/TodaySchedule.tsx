'use client'

import React from 'react'
import { Clock, Truck, Users as UsersIcon } from 'lucide-react'
import type { MorningPlanFull } from '@/types/supabase'

interface TodayScheduleProps {
    schedule: MorningPlanFull[]
    loading?: boolean
}

export default function TodaySchedule({ schedule, loading }: TodayScheduleProps) {
    if (loading) {
        return (
            <div className="rounded-2xl bg-white dark:bg-slate-800/80 border border-gray-100 dark:border-slate-700/60 p-5 animate-card-enter" style={{ animationDelay: '480ms' }}>
                <div className="h-5 w-32 rounded skeleton mb-4" />
                <div className="space-y-3">
                    {Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="p-3 rounded-xl bg-gray-50 dark:bg-slate-700/30">
                            <div className="h-4 w-40 rounded skeleton mb-2" />
                            <div className="h-3 w-24 rounded skeleton" />
                        </div>
                    ))}
                </div>
            </div>
        )
    }

    return (
        <div className="rounded-2xl bg-white dark:bg-slate-800/80 border border-gray-100 dark:border-slate-700/60 p-5 animate-card-enter" style={{ animationDelay: '480ms' }}>
            <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">
                Heutiger Plan
            </h3>

            {schedule.length === 0 ? (
                <div className="text-center py-6">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gray-100 dark:bg-slate-700/50 mb-3">
                        <Clock className="w-6 h-6 text-gray-400 dark:text-gray-500" />
                    </div>
                    <p className="text-sm text-gray-400 dark:text-gray-500">
                        Keine Einsätze heute geplant
                    </p>
                </div>
            ) : (
                <div className="space-y-2.5">
                    {schedule.map((entry, idx) => (
                        <div
                            key={entry.plan_id || idx}
                            className="p-3 rounded-xl bg-gray-50 dark:bg-slate-700/30 hover:bg-gray-100 dark:hover:bg-slate-700/50 transition-colors duration-200"
                        >
                            <div className="flex items-start justify-between gap-2">
                                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                    {entry.project_name || entry.project_code || 'Kein Projekt'}
                                </p>
                                {entry.start_time && (
                                    <span className="flex-shrink-0 inline-flex items-center gap-1 text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-2 py-0.5 rounded-lg">
                                        <Clock className="w-3 h-3" />
                                        {entry.start_time.slice(0, 5)}
                                    </span>
                                )}
                            </div>

                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-xs text-gray-400 dark:text-gray-500">
                                {entry.vehicle_nickname && (
                                    <span className="flex items-center gap-1">
                                        <Truck className="w-3 h-3" />
                                        {entry.vehicle_nickname}
                                    </span>
                                )}
                                {entry.project_ort && (
                                    <span className="truncate max-w-[160px]">{entry.project_ort}</span>
                                )}
                                {entry.staff_list && (
                                    <span className="flex items-center gap-1">
                                        <UsersIcon className="w-3 h-3" />
                                        <span className="truncate max-w-[180px]">{entry.staff_list}</span>
                                    </span>
                                )}
                            </div>

                            {entry.service_type && (
                                <p className="mt-1.5 text-xs text-gray-400 dark:text-gray-500 italic truncate">
                                    {entry.service_type}
                                </p>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
