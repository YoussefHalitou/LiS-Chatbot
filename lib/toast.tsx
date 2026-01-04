'use client'

import { useState, useEffect, useCallback } from 'react'
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react'

export type ToastType = 'success' | 'error' | 'info' | 'warning'

export interface Toast {
  id: string
  message: string
  type: ToastType
  duration?: number
}

interface ToastContextType {
  toasts: Toast[]
  showToast: (message: string, type?: ToastType, duration?: number) => void
  removeToast: (id: string) => void
}

// Simple toast manager using React state
// For production, consider using a library like react-hot-toast or sonner
let toastListeners: Array<(toasts: Toast[]) => void> = []
let toastState: Toast[] = []

function notifyListeners() {
  toastListeners.forEach((listener) => listener([...toastState]))
}

export function showToast(message: string, type: ToastType = 'info', duration: number = 5000) {
  const id = Math.random().toString(36).substring(2, 9)
  const toast: Toast = { id, message, type, duration }

  toastState.push(toast)
  notifyListeners()

  // Auto-remove after duration
  if (duration > 0) {
    setTimeout(() => {
      removeToast(id)
    }, duration)
  }
}

export function removeToast(id: string) {
  toastState = toastState.filter((t) => t.id !== id)
  notifyListeners()
}

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([])

  useEffect(() => {
    const listener = (newToasts: Toast[]) => {
      setToasts(newToasts)
    }

    toastListeners.push(listener)
    setToasts([...toastState])

    return () => {
      toastListeners = toastListeners.filter((l) => l !== listener)
    }
  }, [])

  return {
    toasts,
    showToast: useCallback((message: string, type?: ToastType, duration?: number) => {
      showToast(message, type, duration)
    }, []),
    removeToast: useCallback((id: string) => {
      removeToast(id)
    }, []),
  }
}

export function ToastContainer() {
  const { toasts, removeToast } = useToast()

  if (toasts.length === 0) return null

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onClose={() => removeToast(toast.id)} />
      ))}
    </div>
  )
}

function ToastItem({ toast, onClose }: { toast: Toast; onClose: () => void }) {
  const config = {
    success: {
      icon: CheckCircle,
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
      textColor: 'text-green-800',
      iconColor: 'text-green-600',
    },
    error: {
      icon: AlertCircle,
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
      textColor: 'text-red-800',
      iconColor: 'text-red-600',
    },
    warning: {
      icon: AlertTriangle,
      bgColor: 'bg-yellow-50',
      borderColor: 'border-yellow-200',
      textColor: 'text-yellow-800',
      iconColor: 'text-yellow-600',
    },
    info: {
      icon: Info,
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      textColor: 'text-blue-800',
      iconColor: 'text-blue-600',
    },
  }[toast.type]

  const Icon = config.icon

  return (
    <div
      className={`${config.bgColor} ${config.borderColor} border rounded-lg shadow-lg p-4 flex items-start gap-3 animate-in slide-in-from-right-full duration-300`}
      role="alert"
    >
      <Icon className={`w-5 h-5 ${config.iconColor} flex-shrink-0 mt-0.5`} />
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium ${config.textColor}`}>{toast.message}</p>
      </div>
      <button
        onClick={onClose}
        className={`${config.textColor} hover:opacity-70 transition-opacity flex-shrink-0`}
        aria-label="Toast schließen"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}

