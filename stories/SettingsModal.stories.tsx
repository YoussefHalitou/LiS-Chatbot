import type { Meta, StoryObj } from '@storybook/react'
import SettingsModal from '../components/SettingsModal'
import { ThemeProvider } from '../lib/theme-context'

// Simple action logger
const action = (name: string) => () => console.log(`Action: ${name}`)

const meta: Meta<typeof SettingsModal> = {
  title: 'Components/SettingsModal',
  component: SettingsModal,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: 'iOS-style bottom sheet settings modal. Consolidates app settings including theme toggle, chat export, keyboard shortcuts, and authentication. Uses glassmorphism design on mobile.',
      },
    },
  },
  args: {
    isOpen: true,
    onClose: action('onClose'),
    onExportClick: action('onExportClick'),
    onShortcutsClick: action('onShortcutsClick'),
    onClearChat: action('onClearChat'),
    onLoginClick: action('onLoginClick'),
    onLogout: action('onLogout'),
    user: null,
  },
  decorators: [
    (Story) => (
      <ThemeProvider>
        <div className="h-screen bg-gray-100 dark:bg-slate-900">
          <div className="p-4 text-center text-gray-500 dark:text-gray-400">
            <p>Background content</p>
          </div>
          <Story />
        </div>
      </ThemeProvider>
    ),
  ],
}

export default meta
type Story = StoryObj<typeof SettingsModal>

export const Default: Story = {
  args: {
    isOpen: true,
    user: null,
  },
}

export const WithLoggedInUser: Story = {
  args: {
    isOpen: true,
    user: {
      id: '123',
      email: 'user@example.com',
      aud: 'authenticated',
      role: 'user',
      created_at: '2024-01-01',
      app_metadata: {},
      user_metadata: {},
    },
  },
  parameters: {
    docs: {
      description: {
        story: 'Settings modal with an authenticated user showing logout option.',
      },
    },
  },
}

export const MobileView: Story = {
  args: {
    isOpen: true,
    user: null,
  },
  parameters: {
    viewport: {
      defaultViewport: 'mobile1',
    },
    docs: {
      description: {
        story: 'Mobile view showing the bottom sheet style with safe area handling.',
      },
    },
  },
}

export const Closed: Story = {
  args: {
    isOpen: false,
    user: null,
  },
  parameters: {
    docs: {
      description: {
        story: 'Modal in closed state (not visible).',
      },
    },
  },
}

// Settings groups preview
export const SettingsGroupsPreview: Story = {
  render: () => (
    <ThemeProvider>
      <div className="p-6 max-w-md mx-auto space-y-6 bg-white dark:bg-slate-800 rounded-2xl">
        {/* Display section */}
        <div>
          <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
            Darstellung
          </h3>
          <div className="space-y-1">
            <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-700/50 transition-colors text-left">
              <span className="text-gray-700 dark:text-gray-300">🌙</span>
              <span className="font-medium text-gray-700 dark:text-gray-300">Dunkel-Modus</span>
            </button>
          </div>
        </div>

        {/* Chat section */}
        <div>
          <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
            Chat
          </h3>
          <div className="space-y-1">
            <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-700/50 transition-colors text-left">
              <span className="text-blue-600 dark:text-blue-400">📥</span>
              <span className="font-medium text-blue-600 dark:text-blue-400">Chat exportieren</span>
            </button>
            <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-700/50 transition-colors text-left">
              <span className="text-red-600 dark:text-red-400">🗑️</span>
              <span className="font-medium text-red-600 dark:text-red-400">Chat löschen</span>
            </button>
          </div>
        </div>

        {/* Account section */}
        <div>
          <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
            Konto
          </h3>
          <div className="space-y-1">
            <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-700/50 transition-colors text-left">
              <span className="text-blue-600 dark:text-blue-400">👤</span>
              <div className="flex-1">
                <span className="font-medium text-blue-600 dark:text-blue-400">Anmelden</span>
              </div>
            </button>
          </div>
        </div>
      </div>
    </ThemeProvider>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Preview of settings groups layout without the modal wrapper.',
      },
    },
  },
}
