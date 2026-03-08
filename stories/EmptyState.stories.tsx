import type { Meta, StoryObj } from '@storybook/react'
import EmptyState from '../components/EmptyState'
import { useState } from 'react'

// Simple action logger
const action = (name: string) => () => console.log(`Action: ${name}`)

const meta: Meta<typeof EmptyState> = {
  title: 'Components/EmptyState',
  component: EmptyState,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: 'Welcoming empty state shown when there are no messages in the chat. Features animated welcome header, categorized sample questions (Projects, Employees, Appointments), quick tips, and an interactive tutorial overlay.',
      },
    },
  },
  args: {
    onQuickAction: action('onQuickAction'),
  },
}

export default meta
type Story = StoryObj<typeof EmptyState>

export const Default: Story = {
  args: {},
  decorators: [
    (Story) => (
      <div className="h-screen bg-gray-50 dark:bg-slate-900">
        <Story />
      </div>
    ),
  ],
}

// Interactive version showing selected question
const InteractiveEmptyState = () => {
  const [selectedQuestion, setSelectedQuestion] = useState<string | null>(null)

  return (
    <div className="h-screen bg-gray-50 dark:bg-slate-900 flex flex-col">
      {selectedQuestion && (
        <div className="bg-blue-50 dark:bg-blue-900/30 border-b border-blue-200 dark:border-blue-800 px-4 py-3">
          <p className="text-sm text-blue-600 dark:text-blue-400">
            <strong>Selected question:</strong> {selectedQuestion}
          </p>
          <button
            onClick={() => setSelectedQuestion(null)}
            className="text-xs text-blue-500 hover:underline mt-1"
          >
            Clear selection
          </button>
        </div>
      )}
      <EmptyState onQuickAction={setSelectedQuestion} />
    </div>
  )
}

export const Interactive: Story = {
  render: () => <InteractiveEmptyState />,
  parameters: {
    docs: {
      description: {
        story: 'Interactive demo showing how quick action buttons work. Click a question to see it selected.',
      },
    },
  },
}

// Mobile view
export const Mobile: Story = {
  args: {},
  parameters: {
    viewport: {
      defaultViewport: 'mobile1',
    },
  },
  decorators: [
    (Story) => (
      <div className="h-screen bg-gray-50 dark:bg-slate-900">
        <Story />
      </div>
    ),
  ],
}

// Tablet view
export const Tablet: Story = {
  args: {},
  parameters: {
    viewport: {
      defaultViewport: 'tablet',
    },
  },
  decorators: [
    (Story) => (
      <div className="h-screen bg-gray-50 dark:bg-slate-900">
        <Story />
      </div>
    ),
  ],
}

// Just the sample questions section
export const SampleQuestionsOnly: Story = {
  render: () => {
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
    }

    return (
      <div className="p-6 max-w-3xl mx-auto space-y-6">
        {Object.entries(sampleQuestions).map(([category, questions]) => (
          <div key={category}>
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-3">
              {category}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {questions.map((q, index) => (
                <button
                  key={index}
                  className={`${q.color} rounded-xl px-4 py-3 text-left transition-all hover:scale-105 hover:shadow-lg active:scale-95`}
                >
                  <div className="flex items-start gap-2">
                    <span className="text-2xl">{q.icon}</span>
                    <span className="text-sm font-medium flex-1">{q.text}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    )
  },
  parameters: {
    docs: {
      description: {
        story: 'Just the sample questions grid component for integration elsewhere.',
      },
    },
  },
}

// Quick Tips section
export const QuickTipsOnly: Story = {
  render: () => (
    <div className="p-6 max-w-xl mx-auto">
      <div className="p-4 bg-gray-50 dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700">
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
  ),
  parameters: {
    docs: {
      description: {
        story: 'Just the quick tips component for integration elsewhere.',
      },
    },
  },
}
