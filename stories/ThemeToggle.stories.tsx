import type { Meta, StoryObj } from '@storybook/react'
import ThemeToggle from '../components/ThemeToggle'
import { ThemeProvider } from '../lib/theme-context'

const meta: Meta<typeof ThemeToggle> = {
  title: 'Components/ThemeToggle',
  component: ThemeToggle,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: 'Theme toggle component with two variants: a simple toggle button and a dropdown with light/dark/system options.',
      },
    },
  },
  decorators: [
    (Story) => (
      <ThemeProvider>
        <div className="p-8">
          <Story />
        </div>
      </ThemeProvider>
    ),
  ],
}

export default meta
type Story = StoryObj<typeof ThemeToggle>

export const Simple: Story = {
  args: {
    variant: 'simple',
  },
  parameters: {
    docs: {
      description: {
        story: 'Simple toggle button that switches between light and dark mode on click.',
      },
    },
  },
}

export const Dropdown: Story = {
  args: {
    variant: 'dropdown',
  },
  parameters: {
    docs: {
      description: {
        story: 'Dropdown variant with options for Light, Dark, and System preference.',
      },
    },
  },
}

export const WithCustomClass: Story = {
  args: {
    variant: 'simple',
    className: 'shadow-lg',
  },
  parameters: {
    docs: {
      description: {
        story: 'Example with custom className applied.',
      },
    },
  },
}

// Comparison of both variants
export const BothVariants: Story = {
  render: () => (
    <ThemeProvider>
      <div className="flex items-center gap-8">
        <div className="text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Simple</p>
          <ThemeToggle variant="simple" />
        </div>
        <div className="text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Dropdown</p>
          <ThemeToggle variant="dropdown" />
        </div>
      </div>
    </ThemeProvider>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Side-by-side comparison of both theme toggle variants.',
      },
    },
  },
}

// In a header context
export const InHeader: Story = {
  render: () => (
    <ThemeProvider>
      <div className="flex items-center justify-between p-4 bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold">
            L
          </div>
          <div>
            <h1 className="font-semibold text-gray-900 dark:text-white">LiS Assistant</h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">Operations Helper</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle variant="simple" />
        </div>
      </div>
    </ThemeProvider>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Theme toggle as it appears in the application header.',
      },
    },
  },
}
