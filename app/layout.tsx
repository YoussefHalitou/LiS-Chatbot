import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'LiS Chatbot',
  description: 'AI Chatbot with voice input/output and Supabase integration',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}

