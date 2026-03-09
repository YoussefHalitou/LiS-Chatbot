'use client'

import React from 'react'
import { MessageSquare, Plus, CalendarDays } from 'lucide-react'
import { triggerHaptic } from '@/lib/utils'

interface QuickActionsProps {
    onNavigateToChat: () => void
}

const actions = [
    {
        id: 'chat',
        label: 'Zum Chat',
        description: 'KI-Assistent öffnen',
        icon: MessageSquare,
        color: 'bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-500',
        primary: true,
    },
    {
        id: 'new-project',
        label: 'Neues Projekt',
        description: 'Projekt anlegen',
        icon: Plus,
        color: 'bg-gray-100 hover:bg-gray-200 dark:bg-slate-700/60 dark:hover:bg-slate-700',
        primary: false,
    },
    {
        id: 'schedule',
        label: 'Tagesplan',
        description: 'Plan ansehen',
        icon: CalendarDays,
        color: 'bg-gray-100 hover:bg-gray-200 dark:bg-slate-700/60 dark:hover:bg-slate-700',
        primary: false,
    },
]

export default function QuickActions({ onNavigateToChat }: QuickActionsProps) {
    const handleClick = (id: string) => {
        triggerHaptic('light')
        if (id === 'chat') {
            onNavigateToChat()
        }
        // Other actions can be wired up in the future
    }

    return (
        <div className="flex flex-wrap gap-2.5 animate-card-enter" style={{ animationDelay: '560ms' }}>
            {actions.map((action) => {
                const Icon = action.icon
                return (
                    <button
                        key={action.id}
                        onClick={() => handleClick(action.id)}
                        className={`
              flex items-center gap-2.5 px-4 py-3 rounded-xl
              text-sm font-medium
              transition-all duration-200
              active:scale-[0.97]
              ${action.primary
                                ? `${action.color} text-white shadow-md shadow-blue-500/20 dark:shadow-blue-900/30`
                                : `${action.color} text-gray-700 dark:text-gray-300`
                            }
            `}
                    >
                        <Icon className="w-4.5 h-4.5" />
                        <span>{action.label}</span>
                    </button>
                )
            })}
        </div>
    )
}
