import type { Metadata, Viewport } from 'next'
import './globals.css'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { ToastContainer } from '@/lib/toast'

export const metadata: Metadata = {
  title: 'LiS Chatbot',
  description: 'AI Chatbot with voice input/output and Supabase integration',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#3b82f6' },
    { media: '(prefers-color-scheme: dark)', color: '#1e293b' },
  ],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="de">
      <body className="antialiased">
        <ErrorBoundary>
          {children}
          <ToastContainer />
        </ErrorBoundary>
      </body>
    </html>
  )
}

