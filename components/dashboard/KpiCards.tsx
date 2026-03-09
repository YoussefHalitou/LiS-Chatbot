'use client'

import React, { useEffect, useState, useRef } from 'react'
import {
    FolderKanban,
    Users,
    ClipboardCheck,
    Clock,
} from 'lucide-react'

interface KpiData {
    activeProjects: number
    activeEmployees: number
    upcomingInspections: number
    weeklyHours: number
}

interface KpiCardsProps {
    data: KpiData
    loading?: boolean
}

interface KpiCardConfig {
    key: keyof KpiData
    label: string
    icon: React.ElementType
    gradient: string
    iconBg: string
    suffix?: string
}

const kpiConfigs: KpiCardConfig[] = [
    {
        key: 'activeProjects',
        label: 'Aktive Projekte',
        icon: FolderKanban,
        gradient: 'from-blue-500/10 via-blue-400/5 to-transparent dark:from-blue-500/20 dark:via-blue-400/10',
        iconBg: 'bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400',
    },
    {
        key: 'activeEmployees',
        label: 'Mitarbeiter',
        icon: Users,
        gradient: 'from-emerald-500/10 via-emerald-400/5 to-transparent dark:from-emerald-500/20 dark:via-emerald-400/10',
        iconBg: 'bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400',
    },
    {
        key: 'upcomingInspections',
        label: 'Besichtigungen',
        icon: ClipboardCheck,
        gradient: 'from-amber-500/10 via-amber-400/5 to-transparent dark:from-amber-500/20 dark:via-amber-400/10',
        iconBg: 'bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400',
    },
    {
        key: 'weeklyHours',
        label: 'Stunden diese Woche',
        icon: Clock,
        gradient: 'from-purple-500/10 via-purple-400/5 to-transparent dark:from-purple-500/20 dark:via-purple-400/10',
        iconBg: 'bg-purple-500/10 text-purple-600 dark:bg-purple-500/20 dark:text-purple-400',
        suffix: 'h',
    },
]

function AnimatedNumber({ value, suffix }: { value: number; suffix?: string }) {
    const [displayed, setDisplayed] = useState(0)
    const ref = useRef<number | null>(null)

    useEffect(() => {
        if (value === 0) { setDisplayed(0); return }
        const duration = 800
        const start = Date.now()
        const from = 0

        const tick = () => {
            const elapsed = Date.now() - start
            const progress = Math.min(elapsed / duration, 1)
            // ease-out cubic
            const eased = 1 - Math.pow(1 - progress, 3)
            setDisplayed(Math.round(from + (value - from) * eased * 10) / 10)
            if (progress < 1) {
                ref.current = requestAnimationFrame(tick)
            } else {
                setDisplayed(value)
            }
        }
        ref.current = requestAnimationFrame(tick)
        return () => { if (ref.current) cancelAnimationFrame(ref.current) }
    }, [value])

    const formatted = Number.isInteger(displayed)
        ? displayed.toString()
        : displayed.toFixed(1)

    return (
        <span className="tabular-nums">
            {formatted}{suffix && <span className="text-lg font-normal ml-0.5 opacity-70">{suffix}</span>}
        </span>
    )
}

export default function KpiCards({ data, loading }: KpiCardsProps) {
    return (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {kpiConfigs.map((cfg, idx) => {
                const Icon = cfg.icon
                return (
                    <div
                        key={cfg.key}
                        className={`
              relative overflow-hidden rounded-2xl
              bg-white dark:bg-slate-800/80
              border border-gray-100 dark:border-slate-700/60
              backdrop-blur-sm
              p-4 sm:p-5
              transition-all duration-300
              hover:shadow-lg hover:-translate-y-0.5
              animate-card-enter
            `}
                        style={{ animationDelay: `${idx * 80}ms` }}
                    >
                        {/* Gradient overlay */}
                        <div className={`absolute inset-0 bg-gradient-to-br ${cfg.gradient} pointer-events-none`} />

                        <div className="relative z-10">
                            <div className={`inline-flex items-center justify-center w-10 h-10 rounded-xl ${cfg.iconBg} mb-3`}>
                                <Icon className="w-5 h-5" />
                            </div>

                            {loading ? (
                                <div className="space-y-2">
                                    <div className="h-8 w-16 rounded-lg skeleton" />
                                    <div className="h-4 w-24 rounded skeleton" />
                                </div>
                            ) : (
                                <>
                                    <p className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
                                        <AnimatedNumber value={data[cfg.key]} suffix={cfg.suffix} />
                                    </p>
                                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                        {cfg.label}
                                    </p>
                                </>
                            )}
                        </div>
                    </div>
                )
            })}
        </div>
    )
}
