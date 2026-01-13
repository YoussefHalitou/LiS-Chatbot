import type { Metadata, Viewport } from 'next'
import './globals.css'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { ToastContainer } from '@/lib/toast'
import { ThemeProvider } from '@/lib/theme-context'

export const metadata: Metadata = {
  title: 'LiS Chatbot',
  description: 'AI Chatbot with voice input/output and Supabase integration',
  icons: {
    icon: '/favicon.ico',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#3b82f6' },
    { media: '(prefers-color-scheme: dark)', color: '#0f172a' },
  ],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="de" suppressHydrationWarning>
      <body className="antialiased bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100 transition-colors duration-200">
        <ThemeProvider>
          <ErrorBoundary>
            {children}
            <ToastContainer />
          </ErrorBoundary>
        </ThemeProvider>
      </body>
    </html>
  )
}

