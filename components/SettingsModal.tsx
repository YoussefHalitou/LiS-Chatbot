'use client'

import { X, Moon, Sun, Download, Keyboard, Trash2, LogOut, User } from 'lucide-react'
import { useTheme } from '@/lib/theme-context'
import { triggerHaptic } from '@/lib/utils'

interface SettingsModalProps {
  isOpen: boolean
  onClose: () => void
  onExportClick: () => void
  onShortcutsClick: () => void
  onClearChat: () => void
  user?: any
  onLoginClick?: () => void
  onLogout?: () => void
}

export default function SettingsModal({
  isOpen,
  onClose,
  onExportClick,
  onShortcutsClick,
  onClearChat,
  user,
  onLoginClick,
  onLogout
}: SettingsModalProps) {
  const { theme, toggleTheme } = useTheme()

  if (!isOpen) return null

  const handleAction = (callback: () => void) => {
    triggerHaptic('light')
    callback()
  }

  const settingsGroups = [
    {
      title: 'Darstellung',
      items: [
        {
          icon: theme === 'dark' ? Sun : Moon,
          label: theme === 'dark' ? 'Hell-Modus' : 'Dunkel-Modus',
          onClick: toggleTheme,
          color: 'text-gray-700 dark:text-gray-300'
        }
      ]
    },
    {
      title: 'Chat',
      items: [
        {
          icon: Download,
          label: 'Chat exportieren',
          onClick: () => handleAction(onExportClick),
          color: 'text-blue-600 dark:text-blue-400'
        },
        {
          icon: Trash2,
          label: 'Chat löschen',
          onClick: () => handleAction(onClearChat),
          color: 'text-red-600 dark:text-red-400'
        }
      ]
    },
    {
      title: 'Hilfe',
      items: [
        {
          icon: Keyboard,
          label: 'Tastenkürzel',
          onClick: () => handleAction(onShortcutsClick),
          color: 'text-gray-700 dark:text-gray-300'
        }
      ]
    }
  ]

  // Add auth section if handlers provided
  if (onLoginClick || onLogout) {
    settingsGroups.push({
      title: 'Konto',
      items: [
        user ? {
          icon: LogOut,
          label: 'Abmelden',
          onClick: () => handleAction(onLogout!),
          color: 'text-red-600 dark:text-red-400',
          subtitle: user.email
        } : {
          icon: User,
          label: 'Anmelden',
          onClick: () => handleAction(onLoginClick!),
          color: 'text-blue-600 dark:text-blue-400'
        }
      ]
    })
  }

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 modal-overlay"
        onClick={onClose}
        aria-hidden="true"
      />
      
      {/* Modal */}
      <div className="fixed inset-x-0 bottom-0 sm:inset-0 z-50 flex items-end sm:items-center justify-center">
        <div 
          className="bg-white dark:bg-slate-800 w-full sm:max-w-lg sm:rounded-2xl rounded-t-3xl shadow-2xl modal-mobile overflow-hidden max-h-[85vh] sm:max-h-[90vh] flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Drag Handle (Mobile) */}
          <div className="sm:hidden flex justify-center pt-2 pb-1">
            <div className="w-10 h-1 bg-gray-300 dark:bg-slate-600 rounded-full" />
          </div>

          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-slate-700">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-slate-100">
              Einstellungen
            </h2>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
              aria-label="Schließen"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-6 py-4">
            {settingsGroups.map((group, groupIndex) => (
              <div key={groupIndex} className={groupIndex > 0 ? 'mt-6' : ''}>
                <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                  {group.title}
                </h3>
                <div className="space-y-1">
                  {group.items.map((item, itemIndex) => {
                    const Icon = item.icon
                    return (
                      <button
                        key={itemIndex}
                        onClick={item.onClick}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-700/50 transition-colors text-left touch-manipulation"
                      >
                        <Icon className={`h-5 w-5 ${item.color}`} />
                        <div className="flex-1">
                          <div className={`font-medium ${item.color}`}>
                            {item.label}
                          </div>
                          {item.subtitle && (
                            <div className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                              {item.subtitle}
                            </div>
                          )}
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}

            {/* Version Info */}
            <div className="mt-8 pt-4 border-t border-gray-200 dark:border-slate-700 text-center">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                LiS Operations Assistant
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                Version 1.0.0
              </p>
            </div>
          </div>

          {/* Safe area for mobile */}
          <div className="sm:hidden h-safe-area-inset-bottom bg-white dark:bg-slate-800" />
        </div>
      </div>
    </>
  )
}
