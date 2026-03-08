'use client'

import { useState } from 'react'
import { Smile } from 'lucide-react'
import { triggerHaptic } from '@/lib/utils'

interface EmojiPickerProps {
  onEmojiSelect: (emoji: string) => void
}

const EMOJI_CATEGORIES = {
  'Häufig': ['😊', '👍', '❤️', '😂', '🎉', '🔥', '✅', '👏'],
  'Emotionen': ['😀', '😃', '😄', '😁', '😅', '😂', '🤣', '😊', '😇', '🙂', '😉', '😌', '😍', '🥰', '😘', '😗'],
  'Gesten': ['👍', '👎', '👌', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉', '👆', '👇', '☝️', '✋', '🤚', '👋'],
  'Objekte': ['📱', '💻', '⌚', '📷', '📁', '📊', '📈', '📉', '📆', '📅', '📝', '📋', '✏️', '📌', '📎', '🔗']
}

export default function EmojiPicker({ onEmojiSelect }: EmojiPickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [activeCategory, setActiveCategory] = useState('Häufig')

  const handleEmojiClick = (emoji: string) => {
    triggerHaptic('light')
    onEmojiSelect(emoji)
    setIsOpen(false)
  }

  const handleToggle = () => {
    triggerHaptic('light')
    setIsOpen(!isOpen)
  }

  return (
    <div className="relative">
      <button
        onClick={handleToggle}
        className="p-2.5 sm:p-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-slate-700 dark:text-gray-400 dark:hover:text-gray-300 transition-colors touch-manipulation"
        aria-label="Emoji auswählen"
        type="button"
      >
        <Smile className="h-5 w-5" />
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-30"
            onClick={() => setIsOpen(false)}
          />
          
          {/* Picker */}
          <div className="absolute bottom-full right-0 mb-2 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-slate-700 z-40 w-80 max-w-[calc(100vw-2rem)] animate-scale-up">
            {/* Category Tabs */}
            <div className="flex gap-1 p-2 border-b border-gray-200 dark:border-slate-700 overflow-x-auto">
              {Object.keys(EMOJI_CATEGORIES).map((category) => (
                <button
                  key={category}
                  onClick={() => {
                    triggerHaptic('light')
                    setActiveCategory(category)
                  }}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition-colors ${
                    activeCategory === category
                      ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700'
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>

            {/* Emoji Grid */}
            <div className="p-3 max-h-64 overflow-y-auto">
              <div className="grid grid-cols-8 gap-2">
                {EMOJI_CATEGORIES[activeCategory as keyof typeof EMOJI_CATEGORIES].map((emoji, index) => (
                  <button
                    key={`${emoji}-${index}`}
                    onClick={() => handleEmojiClick(emoji)}
                    className="text-2xl p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors active:scale-95"
                    type="button"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
