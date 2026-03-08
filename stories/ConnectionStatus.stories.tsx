import type { Meta, StoryObj } from '@storybook/react'
import { Wifi, WifiOff, Loader2 } from 'lucide-react'

// Mock component since the real one uses network requests
const ConnectionStatusMock = ({ 
  status = 'online' as 'online' | 'offline' | 'checking' | 'degraded',
  className = '' 
}: { 
  status?: 'online' | 'offline' | 'checking' | 'degraded'
  className?: string 
}) => {
  const getStatusConfig = () => {
    switch (status) {
      case 'online':
        return {
          icon: Wifi,
          color: 'text-green-600 dark:text-green-400',
          bgColor: 'bg-green-50 dark:bg-green-900/30',
          label: 'Verbunden',
        }
      case 'offline':
        return {
          icon: WifiOff,
          color: 'text-red-600 dark:text-red-400',
          bgColor: 'bg-red-50 dark:bg-red-900/30',
          label: 'Offline',
        }
      case 'degraded':
        return {
          icon: Wifi,
          color: 'text-yellow-600 dark:text-yellow-400',
          bgColor: 'bg-yellow-50 dark:bg-yellow-900/30',
          label: 'Verbindungsprobleme',
        }
      case 'checking':
        return {
          icon: Loader2,
          color: 'text-gray-600 dark:text-gray-400',
          bgColor: 'bg-gray-50 dark:bg-gray-800',
          label: 'Prüfe Verbindung...',
        }
    }
  }

  const config = getStatusConfig()
  const Icon = config.icon

  return (
    <div
      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${config.bgColor} ${className}`}
      title={`Status: ${config.label}`}
    >
      <Icon
        className={`w-4 h-4 ${config.color} ${status === 'checking' ? 'animate-spin' : ''}`}
      />
      <span className={`text-xs font-medium ${config.color}`}>
        {config.label}
      </span>
    </div>
  )
}

const meta: Meta<typeof ConnectionStatusMock> = {
  title: 'Components/ConnectionStatus',
  component: ConnectionStatusMock,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: 'Displays the current connection status to the server. Automatically checks connection every 30 seconds and on window focus. Shows different states: online, offline, degraded (slow), and checking.',
      },
    },
  },
  argTypes: {
    status: {
      control: 'select',
      options: ['online', 'offline', 'degraded', 'checking'],
      description: 'The current connection status',
    },
  },
}

export default meta
type Story = StoryObj<typeof ConnectionStatusMock>

export const Online: Story = {
  args: {
    status: 'online',
  },
  parameters: {
    docs: {
      description: {
        story: 'Connection is healthy and responsive.',
      },
    },
  },
}

export const Offline: Story = {
  args: {
    status: 'offline',
  },
  parameters: {
    docs: {
      description: {
        story: 'No network connection or server is unreachable.',
      },
    },
  },
}

export const Degraded: Story = {
  args: {
    status: 'degraded',
  },
  parameters: {
    docs: {
      description: {
        story: 'Connection is slow or timing out. Server may be under load.',
      },
    },
  },
}

export const Checking: Story = {
  args: {
    status: 'checking',
  },
  parameters: {
    docs: {
      description: {
        story: 'Currently checking connection status.',
      },
    },
  },
}

// All states comparison
export const AllStates: Story = {
  render: () => (
    <div className="space-y-3">
      <div className="flex items-center gap-4">
        <span className="w-20 text-sm text-gray-500">Online:</span>
        <ConnectionStatusMock status="online" />
      </div>
      <div className="flex items-center gap-4">
        <span className="w-20 text-sm text-gray-500">Offline:</span>
        <ConnectionStatusMock status="offline" />
      </div>
      <div className="flex items-center gap-4">
        <span className="w-20 text-sm text-gray-500">Degraded:</span>
        <ConnectionStatusMock status="degraded" />
      </div>
      <div className="flex items-center gap-4">
        <span className="w-20 text-sm text-gray-500">Checking:</span>
        <ConnectionStatusMock status="checking" />
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Side-by-side comparison of all connection states.',
      },
    },
  },
}

// In header context
export const InHeader: Story = {
  render: () => (
    <div className="flex items-center justify-between p-4 bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 min-w-[400px]">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold">
          L
        </div>
        <div>
          <h1 className="font-semibold text-gray-900 dark:text-white">LiS Assistant</h1>
          <p className="text-xs text-gray-500 dark:text-gray-400">Operations Helper</p>
        </div>
      </div>
      <ConnectionStatusMock status="online" />
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Connection status as it appears in the application header.',
      },
    },
  },
}
