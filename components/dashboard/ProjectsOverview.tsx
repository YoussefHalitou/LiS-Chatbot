'use client'

import React from 'react'
import { Badge } from '@/components/ui/Badge'
import { MapPin, Calendar } from 'lucide-react'
import type { Project } from '@/types/supabase'

interface ProjectsOverviewProps {
    projects: Project[]
    loading?: boolean
}

const statusVariantMap: Record<string, 'success' | 'warning' | 'primary' | 'default' | 'error'> = {
    'Abgeschlossen': 'success',
    'In Bearbeitung': 'primary',
    'In Planung': 'warning',
    'Storniert': 'error',
}

function formatDate(dateStr: string | null): string {
    if (!dateStr) return '—'
    try {
        return new Date(dateStr).toLocaleDateString('de-DE', {
            day: '2-digit',
            month: '2-digit',
            year: '2-digit',
        })
    } catch {
        return '—'
    }
}

export default function ProjectsOverview({ projects, loading }: ProjectsOverviewProps) {
    if (loading) {
        return (
            <div className="rounded-2xl bg-white dark:bg-slate-800/80 border border-gray-100 dark:border-slate-700/60 p-5 animate-card-enter" style={{ animationDelay: '320ms' }}>
                <div className="h-5 w-36 rounded skeleton mb-4" />
                <div className="space-y-3">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-xl skeleton" />
                            <div className="flex-1 space-y-1.5">
                                <div className="h-4 w-32 rounded skeleton" />
                                <div className="h-3 w-20 rounded skeleton" />
                            </div>
                            <div className="h-5 w-16 rounded-full skeleton" />
                        </div>
                    ))}
                </div>
            </div>
        )
    }

    return (
        <div className="rounded-2xl bg-white dark:bg-slate-800/80 border border-gray-100 dark:border-slate-700/60 p-5 animate-card-enter" style={{ animationDelay: '320ms' }}>
            <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">
                Neueste Projekte
            </h3>

            {projects.length === 0 ? (
                <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-6">
                    Keine Projekte vorhanden
                </p>
            ) : (
                <div className="space-y-3">
                    {projects.map((p) => (
                        <div
                            key={p.project_id}
                            className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-700/40 transition-colors duration-200 cursor-default group"
                        >
                            {/* Code badge */}
                            <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
                                <span className="text-xs font-bold text-blue-600 dark:text-blue-400">
                                    {p.project_code?.slice(0, 3) || '—'}
                                </span>
                            </div>

                            {/* Info */}
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                    {p.name}
                                </p>
                                <div className="flex items-center gap-3 text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                                    {p.stadt && (
                                        <span className="flex items-center gap-1">
                                            <MapPin className="w-3 h-3" />
                                            {p.stadt}
                                        </span>
                                    )}
                                    {p.created_at && (
                                        <span className="flex items-center gap-1">
                                            <Calendar className="w-3 h-3" />
                                            {formatDate(p.created_at)}
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Status */}
                            <Badge
                                variant={statusVariantMap[p.status] || 'default'}
                                size="sm"
                            >
                                {p.status}
                            </Badge>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
