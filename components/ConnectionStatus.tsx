'use client'

import { useState, useEffect } from 'react'
import { Wifi, WifiOff, Loader2 } from 'lucide-react'

type ConnectionStatus = 'online' | 'offline' | 'checking' | 'degraded'

interface ConnectionStatusProps {
  className?: string
}

export default function ConnectionStatus({ className = '' }: ConnectionStatusProps) {
  const [status, setStatus] = useState<ConnectionStatus>('checking')
  const [lastCheck, setLastCheck] = useState<Date>(new Date())

  useEffect(() => {
    const checkConnection = async () => {
      try {
        // Try to fetch a lightweight endpoint
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 3000) // 3 second timeout

        const response = await fetch('/api/health', {
          method: 'HEAD',
          signal: controller.signal,
          cache: 'no-cache',
        })

        clearTimeout(timeoutId)

        if (response.ok) {
          setStatus('online')
        } else {
          setStatus('degraded')
        }
      } catch (error) {
        // Check if it's a network error or timeout
        if (error instanceof Error && error.name === 'AbortError') {
          setStatus('degraded') // Timeout - service might be slow
        } else {
          setStatus('offline')
        }
      } finally {
        setLastCheck(new Date())
      }
    }

    // Initial check
    checkConnection()

    // Check every 30 seconds
    const interval = setInterval(checkConnection, 30000)

    // Also check when window regains focus
    const handleFocus = () => {
      checkConnection()
    }
    window.addEventListener('focus', handleFocus)

    // Check online/offline events
    const handleOnline = () => {
      setStatus('checking')
      checkConnection()
    }
    const handleOffline = () => {
      setStatus('offline')
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      clearInterval(interval)
      window.removeEventListener('focus', handleFocus)
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  const getStatusConfig = () => {
    switch (status) {
      case 'online':
        return {
          icon: Wifi,
          color: 'text-green-600',
          bgColor: 'bg-green-50',
          label: 'Verbunden',
        }
      case 'offline':
        return {
          icon: WifiOff,
          color: 'text-red-600',
          bgColor: 'bg-red-50',
          label: 'Offline',
        }
      case 'degraded':
        return {
          icon: Wifi,
          color: 'text-yellow-600',
          bgColor: 'bg-yellow-50',
          label: 'Verbindungsprobleme',
        }
      case 'checking':
        return {
          icon: Loader2,
          color: 'text-gray-600',
          bgColor: 'bg-gray-50',
          label: 'Prüfe Verbindung...',
        }
    }
  }

  const config = getStatusConfig()
  const Icon = config.icon

  return (
    <div
      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${config.bgColor} ${className}`}
      title={`Status: ${config.label} (Letzte Prüfung: ${lastCheck.toLocaleTimeString('de-DE')})`}
    >
      <Icon
        className={`w-4 h-4 ${config.color} ${status === 'checking' ? 'animate-spin' : ''}`}
      />
      <span className={`text-xs font-medium ${config.color} hidden sm:inline`}>
        {config.label}
      </span>
    </div>
  )
}

