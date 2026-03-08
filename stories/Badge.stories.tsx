import type { Meta, StoryObj } from '@storybook/react'
import { Badge } from '../components/ui/Badge'

const meta: Meta<typeof Badge> = {
  title: 'UI/Badge',
  component: Badge,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: 'A badge component for displaying status, labels, or counts. Available in multiple color variants and sizes.',
      },
    },
  },
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'primary', 'secondary', 'success', 'warning', 'error', 'outline'],
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
    },
  },
}

export default meta
type Story = StoryObj<typeof Badge>

export const Default: Story = {
  args: {
    children: 'Badge',
  },
}

export const Primary: Story = {
  args: {
    children: 'Primary',
    variant: 'primary',
  },
}

export const Secondary: Story = {
  args: {
    children: 'Secondary',
    variant: 'secondary',
  },
}

export const Success: Story = {
  args: {
    children: 'Success',
    variant: 'success',
  },
}

export const Warning: Story = {
  args: {
    children: 'Warning',
    variant: 'warning',
  },
}

export const Error: Story = {
  args: {
    children: 'Error',
    variant: 'error',
  },
}

export const Outline: Story = {
  args: {
    children: 'Outline',
    variant: 'outline',
  },
}

export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      <Badge variant="default">Default</Badge>
      <Badge variant="primary">Primary</Badge>
      <Badge variant="secondary">Secondary</Badge>
      <Badge variant="success">Success</Badge>
      <Badge variant="warning">Warning</Badge>
      <Badge variant="error">Error</Badge>
      <Badge variant="outline">Outline</Badge>
    </div>
  ),
}

export const AllSizes: Story = {
  render: () => (
    <div className="flex items-center gap-2">
      <Badge size="sm" variant="primary">Small</Badge>
      <Badge size="md" variant="primary">Medium</Badge>
      <Badge size="lg" variant="primary">Large</Badge>
    </div>
  ),
}

export const StatusBadges: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      <Badge variant="success">Active</Badge>
      <Badge variant="warning">Pending</Badge>
      <Badge variant="error">Inactive</Badge>
      <Badge variant="primary">In Progress</Badge>
      <Badge variant="default">Draft</Badge>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Common status badge patterns for various states.',
      },
    },
  },
}

export const WithEmoji: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      <Badge variant="success">✓ Completed</Badge>
      <Badge variant="warning">⏳ In Review</Badge>
      <Badge variant="primary">🚀 New</Badge>
      <Badge variant="secondary">⭐ Featured</Badge>
    </div>
  ),
}

export const NumberBadges: Story = {
  render: () => (
    <div className="flex items-center gap-4">
      <div className="relative">
        <span className="text-gray-600 dark:text-gray-300">Notifications</span>
        <Badge variant="error" size="sm" className="absolute -top-2 -right-6">3</Badge>
      </div>
      <div className="relative">
        <span className="text-gray-600 dark:text-gray-300">Messages</span>
        <Badge variant="primary" size="sm" className="absolute -top-2 -right-6">12</Badge>
      </div>
      <div className="relative">
        <span className="text-gray-600 dark:text-gray-300">Updates</span>
        <Badge variant="default" size="sm" className="absolute -top-2 -right-6">99+</Badge>
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Badges used as notification counters.',
      },
    },
  },
}
