import type { Meta, StoryObj } from '@storybook/react'
import EmojiPicker from '../components/EmojiPicker'
import { useState } from 'react'

// Simple action logger
const action = (name: string) => () => console.log(`Action: ${name}`)

const meta: Meta<typeof EmojiPicker> = {
  title: 'Components/EmojiPicker',
  component: EmojiPicker,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: 'A categorized emoji picker with haptic feedback. Features categories: Häufig (Common), Emotionen (Emotions), Gesten (Gestures), and Objekte (Objects).',
      },
    },
  },
  args: {
    onEmojiSelect: action('onEmojiSelect'),
  },
}

export default meta
type Story = StoryObj<typeof EmojiPicker>

export const Default: Story = {
  args: {},
  decorators: [
    (Story) => (
      <div className="h-96 flex items-end justify-center pb-20">
        <Story />
      </div>
    ),
  ],
}

// Interactive example showing selected emoji
const InteractiveEmojiPicker = () => {
  const [selectedEmoji, setSelectedEmoji] = useState<string | null>(null)
  const [emojiHistory, setEmojiHistory] = useState<string[]>([])

  const handleSelect = (emoji: string) => {
    setSelectedEmoji(emoji)
    setEmojiHistory((prev) => [emoji, ...prev.slice(0, 9)])
  }

  return (
    <div className="flex flex-col items-center gap-8">
      {/* Selected emoji display */}
      <div className="text-center">
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Selected Emoji:</p>
        <div className="text-6xl h-20 flex items-center justify-center">
          {selectedEmoji || '👆'}
        </div>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
          {selectedEmoji ? 'Click the picker to select another' : 'Click the picker below'}
        </p>
      </div>

      {/* Emoji history */}
      {emojiHistory.length > 0 && (
        <div className="text-center">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Recently selected:</p>
          <div className="flex gap-2">
            {emojiHistory.map((emoji, i) => (
              <span key={i} className="text-2xl opacity-60 hover:opacity-100 transition-opacity">
                {emoji}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Picker */}
      <div className="relative">
        <EmojiPicker onEmojiSelect={handleSelect} />
      </div>
    </div>
  )
}

export const Interactive: Story = {
  render: () => <InteractiveEmojiPicker />,
  decorators: [
    (Story) => (
      <div className="h-[500px] flex items-end justify-center pb-20">
        <Story />
      </div>
    ),
  ],
  parameters: {
    docs: {
      description: {
        story: 'Interactive demo showing emoji selection with history.',
      },
    },
  },
}

// In context with input field
const EmojiPickerWithInput = () => {
  const [message, setMessage] = useState('')

  const handleEmojiSelect = (emoji: string) => {
    setMessage((prev) => prev + emoji)
  }

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="flex items-end gap-2 p-4 bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-gray-200 dark:border-slate-700">
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Nachricht eingeben..."
          className="flex-1 px-4 py-3 bg-gray-100 dark:bg-slate-700 rounded-xl text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <EmojiPicker onEmojiSelect={handleEmojiSelect} />
        <button className="p-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors">
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M22 2L11 13M22 2L15 22L11 13M11 13L2 9L22 2" />
          </svg>
        </button>
      </div>
    </div>
  )
}

export const WithInputField: Story = {
  render: () => <EmojiPickerWithInput />,
  decorators: [
    (Story) => (
      <div className="h-[400px] flex items-end justify-center pb-20 px-4">
        <Story />
      </div>
    ),
  ],
  parameters: {
    docs: {
      description: {
        story: 'Emoji picker integrated with a message input field, similar to how it appears in the chat interface.',
      },
    },
  },
}
