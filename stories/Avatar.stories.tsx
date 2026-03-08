import type { Meta, StoryObj } from '@storybook/react'
import { Avatar, AvatarGroup } from '../components/ui/Avatar'

const meta: Meta<typeof Avatar> = {
  title: 'UI/Avatar',
  component: Avatar,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: 'An avatar component for displaying user profile images with fallback initials and status indicators.',
      },
    },
  },
  argTypes: {
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg', 'xl'],
    },
    status: {
      control: 'select',
      options: [undefined, 'online', 'offline', 'busy', 'away'],
    },
  },
}

export default meta
type Story = StoryObj<typeof Avatar>

export const Default: Story = {
  args: {
    alt: 'John Doe',
  },
}

export const WithImage: Story = {
  args: {
    src: 'https://api.dicebear.com/7.x/avataaars/svg?seed=John',
    alt: 'John Doe',
  },
}

export const WithFallback: Story = {
  args: {
    fallback: 'JD',
    alt: 'John Doe',
  },
}

export const AllSizes: Story = {
  render: () => (
    <div className="flex items-center gap-4">
      <Avatar size="sm" alt="Small" />
      <Avatar size="md" alt="Medium" />
      <Avatar size="lg" alt="Large" />
      <Avatar size="xl" alt="Extra Large" />
    </div>
  ),
}

export const WithStatus: Story = {
  render: () => (
    <div className="flex items-center gap-4">
      <Avatar status="online" alt="Online User" />
      <Avatar status="offline" alt="Offline User" />
      <Avatar status="busy" alt="Busy User" />
      <Avatar status="away" alt="Away User" />
    </div>
  ),
}

export const AvatarGroupExample: Story = {
  render: () => (
    <AvatarGroup max={4}>
      <Avatar src="https://api.dicebear.com/7.x/avataaars/svg?seed=John" alt="John" />
      <Avatar src="https://api.dicebear.com/7.x/avataaars/svg?seed=Jane" alt="Jane" />
      <Avatar src="https://api.dicebear.com/7.x/avataaars/svg?seed=Bob" alt="Bob" />
      <Avatar src="https://api.dicebear.com/7.x/avataaars/svg?seed=Alice" alt="Alice" />
      <Avatar alt="Max" />
      <Avatar alt="Sophie" />
    </AvatarGroup>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Avatar group with max display limit and overflow counter.',
      },
    },
  },
}

export const AvatarGroupSizes: Story = {
  render: () => (
    <div className="space-y-4">
      <div>
        <p className="text-sm text-gray-500 mb-2">Small</p>
        <AvatarGroup max={3} size="sm">
          <Avatar alt="User 1" />
          <Avatar alt="User 2" />
          <Avatar alt="User 3" />
          <Avatar alt="User 4" />
        </AvatarGroup>
      </div>
      <div>
        <p className="text-sm text-gray-500 mb-2">Medium</p>
        <AvatarGroup max={3} size="md">
          <Avatar alt="User 1" />
          <Avatar alt="User 2" />
          <Avatar alt="User 3" />
          <Avatar alt="User 4" />
        </AvatarGroup>
      </div>
      <div>
        <p className="text-sm text-gray-500 mb-2">Large</p>
        <AvatarGroup max={3} size="lg">
          <Avatar alt="User 1" />
          <Avatar alt="User 2" />
          <Avatar alt="User 3" />
          <Avatar alt="User 4" />
        </AvatarGroup>
      </div>
    </div>
  ),
}

export const TeamMembers: Story = {
  render: () => (
    <div className="flex items-center gap-3">
      <AvatarGroup max={3}>
        <Avatar 
          src="https://api.dicebear.com/7.x/avataaars/svg?seed=Anna" 
          alt="Anna"
          status="online"
        />
        <Avatar 
          src="https://api.dicebear.com/7.x/avataaars/svg?seed=Max" 
          alt="Max"
          status="online"
        />
        <Avatar 
          src="https://api.dicebear.com/7.x/avataaars/svg?seed=Lisa" 
          alt="Lisa"
          status="away"
        />
        <Avatar alt="Tim" status="offline" />
        <Avatar alt="Sarah" status="busy" />
      </AvatarGroup>
      <span className="text-sm text-gray-600 dark:text-gray-400">
        5 team members
      </span>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Avatar group representing team members with status indicators.',
      },
    },
  },
}

export const BrokenImage: Story = {
  args: {
    src: 'https://invalid-url.com/image.jpg',
    alt: 'Fallback User',
  },
  parameters: {
    docs: {
      description: {
        story: 'Avatar gracefully falls back to initials when image fails to load.',
      },
    },
  },
}
