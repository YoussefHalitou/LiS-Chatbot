import type { Meta, StoryObj } from '@storybook/react'
import { Input } from '../components/ui/Input'
import { Search, Mail, Lock, Eye, EyeOff } from 'lucide-react'
import { useState } from 'react'

const meta: Meta<typeof Input> = {
  title: 'UI/Input',
  component: Input,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: 'A flexible input component with label, error state, hint text, and icon support.',
      },
    },
  },
  argTypes: {
    type: {
      control: 'select',
      options: ['text', 'email', 'password', 'number', 'tel', 'url'],
    },
    disabled: {
      control: 'boolean',
    },
  },
}

export default meta
type Story = StoryObj<typeof Input>

export const Default: Story = {
  args: {
    placeholder: 'Enter text...',
  },
}

export const WithLabel: Story = {
  args: {
    label: 'Email Address',
    placeholder: 'you@example.com',
    type: 'email',
  },
}

export const WithHint: Story = {
  args: {
    label: 'Password',
    type: 'password',
    hint: 'Must be at least 8 characters',
  },
}

export const WithError: Story = {
  args: {
    label: 'Email',
    value: 'invalid-email',
    error: 'Please enter a valid email address',
    type: 'email',
  },
}

export const WithLeftIcon: Story = {
  args: {
    placeholder: 'Search...',
    leftIcon: <Search className="h-4 w-4" />,
  },
}

export const WithRightIcon: Story = {
  args: {
    label: 'Email',
    placeholder: 'you@example.com',
    rightIcon: <Mail className="h-4 w-4" />,
  },
}

export const Disabled: Story = {
  args: {
    label: 'Disabled Input',
    value: 'Cannot edit this',
    disabled: true,
  },
}

// Password with show/hide toggle
const PasswordInput = () => {
  const [showPassword, setShowPassword] = useState(false)

  return (
    <Input
      label="Password"
      type={showPassword ? 'text' : 'password'}
      placeholder="Enter password"
      leftIcon={<Lock className="h-4 w-4" />}
      rightIcon={
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="hover:text-gray-700 dark:hover:text-gray-300"
        >
          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      }
    />
  )
}

export const PasswordToggle: Story = {
  render: () => <PasswordInput />,
}

export const FormExample: Story = {
  render: () => (
    <div className="space-y-4 max-w-sm">
      <Input
        label="Full Name"
        placeholder="John Doe"
      />
      <Input
        label="Email"
        type="email"
        placeholder="john@example.com"
        leftIcon={<Mail className="h-4 w-4" />}
      />
      <Input
        label="Password"
        type="password"
        placeholder="••••••••"
        leftIcon={<Lock className="h-4 w-4" />}
        hint="At least 8 characters"
      />
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Example of multiple inputs in a form layout.',
      },
    },
  },
}
