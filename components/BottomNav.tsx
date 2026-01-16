'use client'

import { MessageSquare, History, Search, Settings } from 'lucide-react'
import { triggerHaptic } from '@/lib/utils'

interface BottomNavProps {
  activeTab?: 'chat' | 'history' | 'search' | 'settings'
  onNewChat: () => void
  onHistoryClick: () => void
  onSearchClick: () => void
  onSettingsClick: () => void
  unreadCount?: number
}

export default function BottomNav({
  activeTab = 'chat',
  onNewChat,
  onHistoryClick,
  onSearchClick,
  onSettingsClick,
  unreadCount = 0
}: BottomNavProps) {
  const handleTabClick = (callback: () => void, tab: string) => {
    triggerHaptic('light')
    callback()
  }

  const tabs = [
    {
      id: 'chat',
      label: 'Neu',
      icon: MessageSquare,
      onClick: onNewChat,
      badge: undefined
    },
    {
      id: 'history',
      label: 'Verlauf',
      icon: History,
      onClick: onHistoryClick,
      badge: unreadCount > 0 ? unreadCount : undefined
    },
    {
      id: 'search',
      label: 'Suchen',
      icon: Search,
      onClick: onSearchClick,
      badge: undefined
    },
    {
      id: 'settings',
      label: 'Mehr',
      icon: Settings,
      onClick: onSettingsClick,
      badge: undefined
    }
  ]

  return (
    <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-t border-gray-200 dark:border-slate-700 safe-area-bottom">
      <div className="flex items-center justify-around h-16 px-2">
        {tabs.map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          
          return (
            <button
              key={tab.id}
              onClick={() => handleTabClick(tab.onClick, tab.id)}
              className={`
                relative flex flex-col items-center justify-center gap-1 px-4 py-2 rounded-xl
                transition-all duration-200 touch-manipulation min-w-[70px]
                ${isActive 
                  ? 'text-blue-600 dark:text-blue-400' 
                  : 'text-gray-500 dark:text-gray-400 active:bg-gray-100 dark:active:bg-slate-800'
                }
              `}
              aria-label={tab.label}
              aria-current={isActive ? 'page' : undefined}
            >
              <div className="relative">
                <Icon 
                  className={`h-6 w-6 transition-transform ${isActive ? 'scale-110' : ''}`}
                  strokeWidth={isActive ? 2.5 : 2}
                />
                {tab.badge && (
                  <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center bg-red-500 text-white text-[10px] font-bold rounded-full px-1">
                    {tab.badge > 9 ? '9+' : tab.badge}
                  </span>
                )}
                {isActive && (
                  <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-1 h-1 bg-blue-600 dark:bg-blue-400 rounded-full animate-scale-in" />
                )}
              </div>
              <span className={`text-[11px] font-medium transition-colors ${isActive ? 'text-blue-600 dark:text-blue-400' : ''}`}>
                {tab.label}
              </span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
