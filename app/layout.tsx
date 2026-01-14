import type { Metadata, Viewport } from 'next'
import './globals.css'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { ToastContainer } from '@/lib/toast'
import { ThemeProvider } from '@/lib/theme-context'

const siteUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://lis-chatbot.vercel.app'

export const metadata: Metadata = {
  title: {
    default: 'LiS Operations Assistant',
    template: '%s | LiS Operations Assistant',
  },
  description: 'Intelligenter Assistent für Projektplanung, Mitarbeiterverwaltung und Einsatzkoordination bei Land in Sicht.',
  keywords: ['Chatbot', 'AI', 'Projektplanung', 'Mitarbeiterverwaltung', 'Land in Sicht', 'Operations'],
  authors: [{ name: 'Land in Sicht' }],
  creator: 'Land in Sicht',
  publisher: 'Land in Sicht',
  robots: {
    index: true,
    follow: true,
  },
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
  manifest: '/manifest.json',
  openGraph: {
    type: 'website',
    locale: 'de_DE',
    url: siteUrl,
    siteName: 'LiS Operations Assistant',
    title: 'LiS Operations Assistant',
    description: 'Intelligenter Assistent für Projektplanung, Mitarbeiterverwaltung und Einsatzkoordination.',
    images: [
      {
        url: `${siteUrl}/og-image.png`,
        width: 1200,
        height: 630,
        alt: 'LiS Operations Assistant',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'LiS Operations Assistant',
    description: 'Intelligenter Assistent für Projektplanung und Mitarbeiterverwaltung.',
    images: [`${siteUrl}/og-image.png`],
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

