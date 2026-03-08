'use client'

import { useState, useEffect, useRef } from 'react'
import { X, Search } from 'lucide-react'
import { Message } from '@/types'

interface SearchModalProps {
  isOpen: boolean
  onClose: () => void
  messages: Message[]
  onSelectMessage: (index: number) => void
}

export default function SearchModal({ isOpen, onClose, messages, onSelectMessage }: SearchModalProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isOpen])

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

  const filteredMessages = messages
    .map((msg, index) => ({ msg, index }))
    .filter(({ msg }) => 
      msg.content.toLowerCase().includes(searchTerm.toLowerCase())
    )

  return (
    <div 
      className="fixed inset-0 bg-black/50 flex items-start sm:items-start justify-center sm:pt-20 z-50 modal-overlay"
      onClick={onClose}
    >
      <div 
        className="bg-white dark:bg-slate-800 rounded-t-2xl sm:rounded-xl shadow-2xl w-full sm:max-w-lg sm:mx-4 overflow-hidden fixed bottom-0 sm:relative sm:bottom-auto modal-mobile sm:animate-in sm:fade-in sm:slide-in-from-top-4"
        onClick={e => e.stopPropagation()}
      >
        {/* Drag handle for mobile */}
        <div className="sm:hidden w-10 h-1 bg-gray-300 dark:bg-slate-600 rounded-full mx-auto mt-3 mb-2" />
        
        <div className="p-4 border-b border-gray-200 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <Search className="h-5 w-5 text-gray-400" />
            <input
              ref={inputRef}
              type="text"
              placeholder="Nachrichten durchsuchen..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="flex-1 bg-transparent text-gray-900 dark:text-white placeholder-gray-400 outline-none text-[16px]"
            />
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-500 active:scale-95 transition-transform touch-manipulation"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
        
        <div className="max-h-[60vh] sm:max-h-80 overflow-y-auto overscroll-contain">
          {searchTerm && filteredMessages.length === 0 && (
            <div className="p-4 text-center text-gray-500">
              Keine Nachrichten gefunden
            </div>
          )}
          {filteredMessages.map(({ msg, index }) => (
            <button
              key={index}
              onClick={() => {
                onSelectMessage(index)
                onClose()
              }}
              className="w-full p-4 sm:p-3 text-left hover:bg-gray-50 dark:hover:bg-slate-700 active:bg-gray-100 dark:active:bg-slate-600 border-b border-gray-100 dark:border-slate-700 last:border-0 transition-colors touch-manipulation"
            >
              <div className="flex items-center gap-2 mb-1">
                <span className={`text-xs font-medium ${msg.role === 'user' ? 'text-blue-600' : 'text-green-600'}`}>
                  {msg.role === 'user' ? 'Du' : 'Assistent'}
                </span>
              </div>
              <p className="text-sm text-gray-700 dark:text-slate-300 line-clamp-2">
                {msg.content}
              </p>
            </button>
          ))}
        </div>
        
        {/* Safe area padding for mobile */}
        <div className="sm:hidden safe-area-inset-bottom" />
      </div>
    </div>
  )
}

