import type { Meta, StoryObj } from '@storybook/react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { MoreVertical, Calendar, Users } from 'lucide-react'

const meta: Meta<typeof Card> = {
  title: 'UI/Card',
  component: Card,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: 'A versatile card component for displaying content in a contained, styled box. Includes subcomponents for header, title, description, content, and footer.',
      },
    },
  },
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'outlined', 'elevated'],
    },
    padding: {
      control: 'select',
      options: ['none', 'sm', 'md', 'lg'],
    },
    hoverable: {
      control: 'boolean',
    },
  },
}

export default meta
type Story = StoryObj<typeof Card>

export const Default: Story = {
  args: {
    children: (
      <>
        <CardHeader>
          <CardTitle>Card Title</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600 dark:text-gray-400">
            This is the card content. You can put any content here.
          </p>
        </CardContent>
      </>
    ),
  },
}

export const WithDescription: Story = {
  args: {
    children: (
      <>
        <CardHeader>
          <div>
            <CardTitle>Project Alpha</CardTitle>
            <CardDescription>Created on January 15, 2026</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600 dark:text-gray-400">
            A comprehensive project management solution for enterprise teams.
          </p>
        </CardContent>
      </>
    ),
  },
}

export const WithFooter: Story = {
  args: {
    children: (
      <>
        <CardHeader>
          <CardTitle>Confirm Action</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600 dark:text-gray-400">
            Are you sure you want to proceed with this action?
          </p>
        </CardContent>
        <CardFooter>
          <Button variant="ghost">Cancel</Button>
          <Button>Confirm</Button>
        </CardFooter>
      </>
    ),
  },
}

export const Outlined: Story = {
  args: {
    variant: 'outlined',
    children: (
      <CardContent>
        <p className="text-gray-600 dark:text-gray-400">
          An outlined card variant with a border instead of a shadow.
        </p>
      </CardContent>
    ),
  },
}

export const Elevated: Story = {
  args: {
    variant: 'elevated',
    children: (
      <CardContent>
        <p className="text-gray-600 dark:text-gray-400">
          An elevated card with a prominent shadow.
        </p>
      </CardContent>
    ),
  },
}

export const Hoverable: Story = {
  args: {
    hoverable: true,
    children: (
      <CardContent>
        <p className="text-gray-600 dark:text-gray-400">
          Hover over this card to see the effect.
        </p>
      </CardContent>
    ),
  },
}

export const ProjectCard: Story = {
  render: () => (
    <Card className="max-w-sm">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle>Project Beta</CardTitle>
            <CardDescription>Marketing Campaign</CardDescription>
          </div>
          <button className="p-1 hover:bg-gray-100 dark:hover:bg-slate-700 rounded">
            <MoreVertical className="h-5 w-5 text-gray-500" />
          </button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex gap-2 mb-4">
          <Badge variant="primary">Active</Badge>
          <Badge variant="secondary">High Priority</Badge>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Q1 marketing campaign for product launch across all channels.
        </p>
        <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
          <div className="flex items-center gap-1">
            <Calendar className="h-4 w-4" />
            <span>Jan 20</span>
          </div>
          <div className="flex items-center gap-1">
            <Users className="h-4 w-4" />
            <span>5 members</span>
          </div>
        </div>
      </CardContent>
    </Card>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Example of a project card with badges, metadata, and icons.',
      },
    },
  },
}

export const CardGrid: Story = {
  render: () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {[1, 2, 3].map((i) => (
        <Card key={i} hoverable>
          <CardHeader>
            <CardTitle>Card {i}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 dark:text-gray-400">
              Card content for item {i}.
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  ),
}
