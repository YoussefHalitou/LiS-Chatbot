import React from 'react'
import type { Preview } from '@storybook/nextjs-vite'
import '../app/globals.css'

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
       color: /(background|color)$/i,
       date: /Date$/i,
      },
    },
    backgrounds: {
      default: 'light',
      values: [
        { name: 'light', value: '#ffffff' },
        { name: 'dark', value: '#0f172a' },
      ],
    },
    layout: 'centered',
  },
  decorators: [
    (Story, context) => {
      const isDark = context.globals.backgrounds?.value === '#0f172a'
      return (
        <div className={isDark ? 'dark' : ''}>
          <div className="bg-white dark:bg-slate-900 p-4 min-h-screen">
            <Story />
          </div>
        </div>
      )
    },
  ],
};

export default preview;