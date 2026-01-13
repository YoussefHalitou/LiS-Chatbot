'use client'

import { Moon, Sun, Monitor } from 'lucide-react'
import { useTheme } from '@/lib/theme-context'
import { useState, useRef, useEffect } from 'react'

interface ThemeToggleProps {
  variant?: 'simple' | 'dropdown'
  className?: string
}

export default function ThemeToggle({ variant = 'simple', className = '' }: ThemeToggleProps) {
  const { theme, resolvedTheme, setTheme, toggleTheme } = useTheme()
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  if (variant === 'simple') {
    return (
      <button
        onClick={toggleTheme}
        className={`p-2 rounded-lg transition-colors ${
          resolvedTheme === 'dark'
            ? 'bg-slate-700 text-yellow-400 hover:bg-slate-600'
            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
        } ${className}`}
        title={resolvedTheme === 'dark' ? 'Helles Design' : 'Dunkles Design'}
        aria-label={resolvedTheme === 'dark' ? 'Zu hellem Design wechseln' : 'Zu dunklem Design wechseln'}
      >
        {resolvedTheme === 'dark' ? (
          <Sun className="h-5 w-5" />
        ) : (
          <Moon className="h-5 w-5" />
        )}
      </button>
    )
  }

  // Dropdown variant with system option
  const options = [
    { value: 'light' as const, icon: Sun, label: 'Hell' },
    { value: 'dark' as const, icon: Moon, label: 'Dunkel' },
    { value: 'system' as const, icon: Monitor, label: 'System' },
  ]

  const currentOption = options.find((o) => o.value === theme) || options[2]
  const CurrentIcon = currentOption.icon

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
          resolvedTheme === 'dark'
            ? 'bg-slate-700 text-slate-200 hover:bg-slate-600'
            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
        }`}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-label="Design auswählen"
      >
        <CurrentIcon className="h-4 w-4" />
        <span className="text-sm font-medium hidden sm:inline">{currentOption.label}</span>
      </button>

      {isOpen && (
        <div
          className={`absolute right-0 mt-2 w-40 rounded-lg shadow-lg border z-50 ${
            resolvedTheme === 'dark'
              ? 'bg-slate-800 border-slate-700'
              : 'bg-white border-gray-200'
          }`}
          role="listbox"
        >
          {options.map((option) => {
            const Icon = option.icon
            const isSelected = theme === option.value
            return (
              <button
                key={option.value}
                onClick={() => {
                  setTheme(option.value)
                  setIsOpen(false)
                }}
                className={`w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors ${
                  isSelected
                    ? resolvedTheme === 'dark'
                      ? 'bg-blue-600 text-white'
                      : 'bg-blue-50 text-blue-700'
                    : resolvedTheme === 'dark'
                    ? 'text-slate-200 hover:bg-slate-700'
                    : 'text-gray-700 hover:bg-gray-100'
                } first:rounded-t-lg last:rounded-b-lg`}
                role="option"
                aria-selected={isSelected}
              >
                <Icon className="h-4 w-4" />
                <span>{option.label}</span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

