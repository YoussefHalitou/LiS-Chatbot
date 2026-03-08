import type { Meta, StoryObj } from '@storybook/react'
import BottomNav from '../components/BottomNav'

// Simple action logger
const action = (name: string) => () => console.log(`Action: ${name}`)

const meta: Meta<typeof BottomNav> = {
  title: 'Components/BottomNav',
  component: BottomNav,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: 'iOS-style bottom navigation bar for mobile devices. Only visible on screens smaller than 640px (sm breakpoint). Features haptic feedback on tab selection.',
      },
    },
    viewport: {
      defaultViewport: 'mobile1',
    },
  },
  args: {
    onNewChat: action('onNewChat'),
    onHistoryClick: action('onHistoryClick'),
    onSearchClick: action('onSearchClick'),
    onSettingsClick: action('onSettingsClick'),
  },
  decorators: [
    (Story) => (
      <div className="relative h-screen bg-gray-50 dark:bg-slate-900">
        <div className="p-4 text-center text-gray-500 dark:text-gray-400">
          <p>Content area</p>
          <p className="text-sm mt-2">Bottom nav is fixed to the bottom</p>
        </div>
        {/* Override sm:hidden for Storybook preview */}
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-t border-gray-200 dark:border-slate-700">
          <Story />
        </div>
      </div>
    ),
  ],
}

export default meta
type Story = StoryObj<typeof BottomNav>

// Custom render to remove sm:hidden class for Storybook
const BottomNavPreview = (props: React.ComponentProps<typeof BottomNav>) => {
  return (
    <nav className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-t border-gray-200 dark:border-slate-700">
      <div className="flex items-center justify-around h-16 px-2">
        {['chat', 'history', 'search', 'settings'].map((tabId) => {
          const isActive = props.activeTab === tabId
          const icons = {
            chat: 'MessageSquare',
            history: 'History',
            search: 'Search',
            settings: 'Settings',
          }
          const labels = {
            chat: 'Neu',
            history: 'Verlauf',
            search: 'Suchen',
            settings: 'Mehr',
          }
          
          return (
            <button
              key={tabId}
              className={`
                relative flex flex-col items-center justify-center gap-1 px-4 py-2 rounded-xl
                transition-all duration-200 touch-manipulation min-w-[70px]
                ${isActive 
                  ? 'text-blue-600 dark:text-blue-400' 
                  : 'text-gray-500 dark:text-gray-400'
                }
              `}
            >
              <div className="relative">
                <div className={`h-6 w-6 ${isActive ? 'scale-110' : ''}`}>
                  {/* Placeholder icon */}
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={isActive ? 2.5 : 2}>
                    <rect x="4" y="4" width="16" height="16" rx="2" />
                  </svg>
                </div>
                {tabId === 'history' && props.unreadCount && props.unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center bg-red-500 text-white text-[10px] font-bold rounded-full px-1">
                    {props.unreadCount > 9 ? '9+' : props.unreadCount}
                  </span>
                )}
                {isActive && (
                  <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-1 h-1 bg-blue-600 dark:bg-blue-400 rounded-full" />
                )}
              </div>
              <span className={`text-[11px] font-medium ${isActive ? 'text-blue-600 dark:text-blue-400' : ''}`}>
                {labels[tabId as keyof typeof labels]}
              </span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}

export const ChatActive: Story = {
  args: {
    activeTab: 'chat',
  },
  render: (args) => <BottomNavPreview {...args} />,
}

export const HistoryActive: Story = {
  args: {
    activeTab: 'history',
  },
  render: (args) => <BottomNavPreview {...args} />,
}

export const SearchActive: Story = {
  args: {
    activeTab: 'search',
  },
  render: (args) => <BottomNavPreview {...args} />,
}

export const SettingsActive: Story = {
  args: {
    activeTab: 'settings',
  },
  render: (args) => <BottomNavPreview {...args} />,
}

export const WithBadge: Story = {
  args: {
    activeTab: 'chat',
    unreadCount: 5,
  },
  render: (args) => <BottomNavPreview {...args} />,
  parameters: {
    docs: {
      description: {
        story: 'Bottom navigation with unread badge on the History tab.',
      },
    },
  },
}

export const WithLargeBadge: Story = {
  args: {
    activeTab: 'chat',
    unreadCount: 99,
  },
  render: (args) => <BottomNavPreview {...args} />,
  parameters: {
    docs: {
      description: {
        story: 'Badge displays "9+" when count exceeds 9.',
      },
    },
  },
}
