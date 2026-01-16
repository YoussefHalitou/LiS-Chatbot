'use client'

import { useEffect } from 'react'
import { X, Keyboard } from 'lucide-react'

interface KeyboardShortcutsModalProps {
  isOpen: boolean
  onClose: () => void
}

const shortcuts = [
  { keys: ['Ctrl', 'K'], description: 'Eingabefeld fokussieren' },
  { keys: ['Ctrl', 'M'], description: 'Mikrofon ein/aus' },
  { keys: ['Ctrl', 'Shift', 'M'], description: 'Sprachmodus starten' },
  { keys: ['Ctrl', 'Enter'], description: 'Nachricht senden' },
  { keys: ['Escape'], description: 'Sprachmodus beenden / Modal schließen' },
  { keys: ['Ctrl', 'F'], description: 'Suche öffnen' },
  { keys: ['Ctrl', 'E'], description: 'Chat exportieren' },
  { keys: ['Ctrl', '/'], description: 'Tastenkürzel anzeigen' },
]

export default function KeyboardShortcutsModal({ isOpen, onClose }: KeyboardShortcutsModalProps) {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    if (isOpen) {
      window.addEventListener('keydown', handleEscape)
      return () => window.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div 
      className="fixed inset-0 bg-black/50 flex items-center sm:items-center justify-center z-50 modal-overlay"
      onClick={onClose}
    >
      <div 
        className="bg-white dark:bg-slate-800 rounded-t-2xl sm:rounded-xl shadow-2xl w-full sm:max-w-md sm:mx-4 overflow-hidden fixed bottom-0 sm:relative sm:bottom-auto modal-mobile"
        onClick={e => e.stopPropagation()}
      >
        {/* Drag handle for mobile */}
        <div className="sm:hidden w-10 h-1 bg-gray-300 dark:bg-slate-600 rounded-full mx-auto mt-3 mb-2" />
        
        <div className="p-4 border-b border-gray-200 dark:border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Keyboard className="h-5 w-5 text-blue-500" />
            <h2 className="font-semibold text-gray-900 dark:text-white">Tastenkürzel</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-500 active:scale-95 transition-transform touch-manipulation"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        <div className="p-4 space-y-4 sm:space-y-3 max-h-[50vh] sm:max-h-none overflow-y-auto">
          {shortcuts.map((shortcut, index) => (
            <div key={index} className="flex items-center justify-between gap-4">
              <span className="text-gray-700 dark:text-slate-300 text-sm flex-1">
                {shortcut.description}
              </span>
              <div className="flex items-center gap-1 flex-shrink-0">
                {shortcut.keys.map((key, keyIndex) => (
                  <span key={keyIndex}>
                    <kbd className="px-2 py-1.5 sm:py-1 text-xs font-semibold text-gray-800 dark:text-slate-200 bg-gray-100 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded">
                      {key}
                    </kbd>
                    {keyIndex < shortcut.keys.length - 1 && (
                      <span className="mx-1 text-gray-400">+</span>
                    )}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="p-4 bg-gray-50 dark:bg-slate-900 border-t border-gray-200 dark:border-slate-700">
          <p className="text-xs text-gray-500 dark:text-slate-400 text-center">
            Tipp: Auf Mac verwende ⌘ statt Ctrl
          </p>
        </div>
        
        {/* Safe area padding for mobile */}
        <div className="sm:hidden safe-area-inset-bottom" />
      </div>
    </div>
  )
}

