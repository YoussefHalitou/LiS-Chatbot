'use client'

import React from 'react'
import { Badge } from '@/components/ui/Badge'
import { MapPin, Calendar as CalIcon, Clock } from 'lucide-react'
import type { Inspection } from '@/types/supabase'

interface UpcomingInspectionsProps {
    inspections: Inspection[]
    loading?: boolean
}

function formatDateTime(dateStr: string | null): { date: string; time: string } {
    if (!dateStr) return { date: '—', time: '' }
    try {
        const d = new Date(dateStr)
        return {
            date: d.toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit' }),
            time: d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }),
        }
    } catch {
        return { date: '—', time: '' }
    }
}

export default function UpcomingInspections({ inspections, loading }: UpcomingInspectionsProps) {
    if (loading) {
        return (
            <div className="rounded-2xl bg-white dark:bg-slate-800/80 border border-gray-100 dark:border-slate-700/60 p-5 animate-card-enter" style={{ animationDelay: '400ms' }}>
                <div className="h-5 w-44 rounded skeleton mb-4" />
                <div className="space-y-4">
                    {Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="flex gap-3">
                            <div className="w-1 rounded-full skeleton flex-shrink-0" style={{ height: 56 }} />
                            <div className="flex-1 space-y-1.5">
                                <div className="h-4 w-40 rounded skeleton" />
                                <div className="h-3 w-28 rounded skeleton" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )
    }

    return (
        <div className="rounded-2xl bg-white dark:bg-slate-800/80 border border-gray-100 dark:border-slate-700/60 p-5 animate-card-enter" style={{ animationDelay: '400ms' }}>
            <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">
                Anstehende Besichtigungen
            </h3>

            {inspections.length === 0 ? (
                <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-6">
                    Keine anstehenden Besichtigungen
                </p>
            ) : (
                <div className="space-y-1">
                    {inspections.map((insp, idx) => {
                        const { date, time } = formatDateTime(insp.appointment_at)
                        const address = [insp.strasse, insp.nr, insp.plz, insp.stadt].filter(Boolean).join(' ')

                        return (
                            <div key={insp.inspection_id} className="flex gap-3 group">
                                {/* Timeline connector */}
                                <div className="flex flex-col items-center flex-shrink-0 pt-1">
                                    <div className="w-2.5 h-2.5 rounded-full bg-amber-400 dark:bg-amber-500 ring-4 ring-amber-100 dark:ring-amber-900/30" />
                                    {idx < inspections.length - 1 && (
                                        <div className="w-0.5 flex-1 bg-amber-200 dark:bg-amber-800/40 mt-1" />
                                    )}
                                </div>

                                {/* Content */}
                                <div className="flex-1 pb-4">
                                    <div className="flex items-start justify-between gap-2">
                                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                                            {insp.customer_name || 'Unbenannt'}
                                        </p>
                                        <Badge variant="warning" size="sm">
                                            {insp.status}
                                        </Badge>
                                    </div>

                                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-xs text-gray-400 dark:text-gray-500">
                                        <span className="flex items-center gap-1">
                                            <CalIcon className="w-3 h-3" />
                                            {date}
                                        </span>
                                        {time && (
                                            <span className="flex items-center gap-1">
                                                <Clock className="w-3 h-3" />
                                                {time}
                                            </span>
                                        )}
                                        {address && (
                                            <span className="flex items-center gap-1">
                                                <MapPin className="w-3 h-3" />
                                                <span className="truncate max-w-[180px]">{address}</span>
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
