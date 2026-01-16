'use client'

import { useState } from 'react'
import { Sparkles, Calendar, Users, FolderKanban, HelpCircle, X } from 'lucide-react'
import { triggerHaptic } from '@/lib/utils'

interface EmptyStateProps {
  onQuickAction: (question: string) => void
}

const sampleQuestions = {
  'Projekte': [
    { icon: '📋', text: 'Zeige mir alle aktiven Projekte', color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' },
    { icon: '🏗️', text: 'Welche Projekte starten diese Woche?', color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' },
    { icon: '📊', text: 'Status des Projekts XYZ', color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' },
  ],
  'Mitarbeiter': [
    { icon: '👥', text: 'Liste aller Mitarbeiter', color: 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400' },
    { icon: '🔍', text: 'Wer ist heute im Einsatz?', color: 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400' },
    { icon: '📱', text: 'Kontaktdaten von Mitarbeiter Max', color: 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400' },
  ],
  'Termine': [
    { icon: '📅', text: 'Termine diese Woche', color: 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400' },
    { icon: '⏰', text: 'Was steht heute an?', color: 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400' },
    { icon: '🗓️', text: 'Nächste wichtige Deadline', color: 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400' },
  ],
}

export default function EmptyState({ onQuickAction }: EmptyStateProps) {
  const [showTutorial, setShowTutorial] = useState(false)

  const handleQuickAction = (text: string) => {
    triggerHaptic('light')
    onQuickAction(text)
  }

  const handleShowTutorial = () => {
    triggerHaptic('light')
    setShowTutorial(true)
  }

  return (
    <div className="flex-1 flex items-center justify-center p-6">
      <div className="max-w-3xl w-full">
        {/* Welcome Header with Animation */}
        <div className="text-center mb-8 animate-fade-in">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-3xl mb-4 animate-float shadow-xl">
            <Sparkles className="h-10 w-10 text-white" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400 bg-clip-text text-transparent mb-2">
            Willkommen bei LiS Assistant
          </h1>
          <p className="text-gray-600 dark:text-gray-400 text-base sm:text-lg max-w-2xl mx-auto">
            Dein intelligenter Helfer für Projektplanung, Mitarbeiterverwaltung und Einsatzkoordination.
          </p>
          
          {/* Tutorial Button */}
          <button
            onClick={handleShowTutorial}
            className="mt-4 inline-flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 hover:underline transition-all"
          >
            <HelpCircle className="h-4 w-4" />
            <span>Wie funktioniert&apos;s?</span>
          </button>
        </div>

        {/* Categorized Sample Questions */}
        <div className="space-y-6">
          {Object.entries(sampleQuestions).map(([category, questions], categoryIndex) => {
            const CategoryIcon = category === 'Projekte' ? FolderKanban : category === 'Mitarbeiter' ? Users : Calendar
            
            return (
              <div 
                key={category} 
                className="animate-slide-up"
                style={{ animationDelay: `${categoryIndex * 0.1}s` }}
              >
                <div className="flex items-center gap-2 mb-3">
                  <CategoryIcon className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                  <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                    {category}
                  </h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {questions.map((q, index) => (
                    <button
                      key={index}
                      onClick={() => handleQuickAction(q.text)}
                      className={`${q.color} rounded-xl px-4 py-3 text-left transition-all hover:scale-105 hover:shadow-lg active:scale-95 touch-manipulation group`}
                    >
                      <div className="flex items-start gap-2">
                        <span className="text-2xl">{q.icon}</span>
                        <span className="text-sm font-medium flex-1 group-hover:translate-x-1 transition-transform">
                          {q.text}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )
          })}
        </div>

        {/* Quick Tips */}
        <div className="mt-8 p-4 bg-gray-50 dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
            <span>💡</span>
            <span>Schnelltipps</span>
          </h3>
          <ul className="space-y-1.5 text-sm text-gray-600 dark:text-gray-400">
            <li className="flex items-start gap-2">
              <span className="text-blue-500">•</span>
              <span>Stelle Fragen in natürlicher Sprache</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-500">•</span>
              <span>Nutze das Mikrofon für Spracheingabe</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-500">•</span>
              <span>Drücke Shift+Enter für eine neue Zeile</span>
            </li>
          </ul>
        </div>
      </div>

      {/* Tutorial Overlay */}
      {showTutorial && (
        <>
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 modal-overlay"
            onClick={() => setShowTutorial(false)}
          />
          <div className="fixed inset-4 sm:inset-auto sm:left-1/2 sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:max-w-2xl sm:w-full z-50">
            <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl p-6 sm:p-8 max-h-[90vh] overflow-y-auto animate-scale-up">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                    So funktioniert&apos;s
                  </h2>
                  <p className="text-gray-600 dark:text-gray-400">
                    Deine Kurzanleitung für LiS Assistant
                  </p>
                </div>
                <button
                  onClick={() => setShowTutorial(false)}
                  className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-6">
                {[
                  {
                    icon: '💬',
                    title: 'Text-Chat',
                    desc: 'Stelle Fragen in natürlicher Sprache. Der Assistent versteht deine Anfragen und durchsucht die Datenbank.'
                  },
                  {
                    icon: '🎤',
                    title: 'Spracheingabe',
                    desc: 'Tippe auf das Mikrofon-Symbol, um per Sprache zu kommunizieren. Perfekt für unterwegs!'
                  },
                  {
                    icon: '📱',
                    title: 'Mobile Navigation',
                    desc: 'Nutze die untere Navigation auf dem Smartphone: Neuer Chat, Verlauf, Suche und Einstellungen.'
                  },
                  {
                    icon: '✨',
                    title: 'Vorschläge',
                    desc: 'Wähle aus den Vorschlägen oben oder stelle eigene Fragen zu Projekten, Mitarbeitern und Terminen.'
                  },
                  {
                    icon: '🔍',
                    title: 'Suche & Export',
                    desc: 'Durchsuche frühere Gespräche und exportiere wichtige Chats als PDF oder JSON.'
                  },
                ].map((item, index) => (
                  <div key={index} className="flex gap-4 items-start">
                    <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center text-2xl shadow-lg">
                      {item.icon}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                        {item.title}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {item.desc}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <button
                onClick={() => setShowTutorial(false)}
                className="w-full mt-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium rounded-xl transition-all active:scale-95 shadow-lg"
              >
                Los geht&apos;s!
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
