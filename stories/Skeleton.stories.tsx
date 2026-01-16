import type { Meta, StoryObj } from '@storybook/react'
import { Skeleton, MessageSkeleton, ChatListSkeleton, PageSkeleton } from '../components/Skeleton'

const meta: Meta<typeof Skeleton> = {
  title: 'Components/Skeleton',
  component: Skeleton,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: 'Skeleton loading components for indicating content is being loaded. Provides visual feedback to users while data is being fetched.',
      },
    },
  },
  argTypes: {
    variant: {
      control: 'select',
      options: ['text', 'circular', 'rectangular', 'rounded'],
      description: 'The shape variant of the skeleton',
    },
    animation: {
      control: 'select',
      options: ['pulse', 'wave', 'none'],
      description: 'The animation style',
    },
    width: {
      control: 'text',
      description: 'Width of the skeleton (CSS value)',
    },
    height: {
      control: 'text',
      description: 'Height of the skeleton (CSS value)',
    },
  },
}

export default meta
type Story = StoryObj<typeof Skeleton>

export const Default: Story = {
  args: {
    variant: 'text',
    animation: 'wave',
    width: '200px',
    height: '1rem',
  },
}

export const TextVariant: Story = {
  args: {
    variant: 'text',
    width: '100%',
    height: '1rem',
  },
  render: (args) => (
    <div className="space-y-2 w-64">
      <Skeleton {...args} width="100%" />
      <Skeleton {...args} width="80%" />
      <Skeleton {...args} width="60%" />
    </div>
  ),
}

export const CircularVariant: Story = {
  args: {
    variant: 'circular',
    width: '48px',
    height: '48px',
  },
}

export const RectangularVariant: Story = {
  args: {
    variant: 'rectangular',
    width: '200px',
    height: '120px',
  },
}

export const RoundedVariant: Story = {
  args: {
    variant: 'rounded',
    width: '200px',
    height: '120px',
  },
}

export const PulseAnimation: Story = {
  args: {
    variant: 'rounded',
    animation: 'pulse',
    width: '200px',
    height: '100px',
  },
}

export const NoAnimation: Story = {
  args: {
    variant: 'rounded',
    animation: 'none',
    width: '200px',
    height: '100px',
  },
}

// Message Skeleton Stories
export const MessageSkeletonUser: StoryObj<typeof MessageSkeleton> = {
  render: () => <MessageSkeleton isUser />,
  parameters: {
    docs: {
      description: {
        story: 'Skeleton for user messages in the chat interface.',
      },
    },
  },
}

export const MessageSkeletonAssistant: StoryObj<typeof MessageSkeleton> = {
  render: () => <MessageSkeleton isUser={false} />,
  parameters: {
    docs: {
      description: {
        story: 'Skeleton for assistant messages in the chat interface.',
      },
    },
  },
}

export const MessageSkeletonConversation: StoryObj<typeof MessageSkeleton> = {
  render: () => (
    <div className="space-y-4 max-w-xl">
      <MessageSkeleton />
      <MessageSkeleton isUser />
      <MessageSkeleton />
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Multiple message skeletons simulating a conversation loading state.',
      },
    },
  },
}

// Chat List Skeleton Stories
export const ChatListSkeletonDefault: StoryObj<typeof ChatListSkeleton> = {
  render: () => (
    <div className="w-72 bg-white dark:bg-slate-900 rounded-lg border border-gray-200 dark:border-slate-700">
      <ChatListSkeleton count={3} />
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Skeleton for the chat list sidebar.',
      },
    },
  },
}

export const ChatListSkeletonMany: StoryObj<typeof ChatListSkeleton> = {
  render: () => (
    <div className="w-72 bg-white dark:bg-slate-900 rounded-lg border border-gray-200 dark:border-slate-700">
      <ChatListSkeleton count={6} />
    </div>
  ),
}

// Page Skeleton Story
export const FullPageSkeleton: StoryObj<typeof PageSkeleton> = {
  render: () => (
    <div className="h-[600px] w-full max-w-3xl mx-auto border border-gray-200 dark:border-slate-700 rounded-lg overflow-hidden">
      <PageSkeleton />
    </div>
  ),
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        story: 'Full page skeleton for initial app loading state.',
      },
    },
  },
}
