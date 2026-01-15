'use client'

import { useState, useEffect } from 'react'
import { X, Download, FileText, FileJson, Copy, Check } from 'lucide-react'
import { Message } from '@/types'

interface ExportChatModalProps {
  isOpen: boolean
  onClose: () => void
  messages: Message[]
}

export default function ExportChatModal({ isOpen, onClose, messages }: ExportChatModalProps) {
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    if (isOpen) {
      window.addEventListener('keydown', handleEscape)
      return () => window.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  const formatAsText = () => {
    return messages.map(msg => 
      `[${msg.role === 'user' ? 'Du' : 'Assistent'}]\n${msg.content}\n`
    ).join('\n---\n\n')
  }

  const formatAsJson = () => {
    return JSON.stringify(messages, null, 2)
  }

  const formatAsMarkdown = () => {
    return messages.map(msg => 
      `### ${msg.role === 'user' ? '👤 Du' : '🤖 Assistent'}\n\n${msg.content}\n`
    ).join('\n---\n\n')
  }

  const downloadFile = (content: string, filename: string, type: string) => {
    const blob = new Blob([content], { type })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    onClose()
  }

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(formatAsText())
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const timestamp = new Date().toISOString().split('T')[0]

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div 
        className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-4 border-b border-gray-200 dark:border-slate-700 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900 dark:text-white">Chat exportieren</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-500"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        <div className="p-4 space-y-2">
          <button
            onClick={() => downloadFile(formatAsText(), `chat-${timestamp}.txt`, 'text/plain')}
            className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-300 transition-colors"
          >
            <FileText className="h-5 w-5 text-blue-500" />
            <div className="text-left">
              <div className="font-medium">Text (.txt)</div>
              <div className="text-xs text-gray-500">Einfaches Textformat</div>
            </div>
          </button>

          <button
            onClick={() => downloadFile(formatAsMarkdown(), `chat-${timestamp}.md`, 'text/markdown')}
            className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-300 transition-colors"
          >
            <FileText className="h-5 w-5 text-purple-500" />
            <div className="text-left">
              <div className="font-medium">Markdown (.md)</div>
              <div className="text-xs text-gray-500">Formatierter Text</div>
            </div>
          </button>

          <button
            onClick={() => downloadFile(formatAsJson(), `chat-${timestamp}.json`, 'application/json')}
            className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-300 transition-colors"
          >
            <FileJson className="h-5 w-5 text-green-500" />
            <div className="text-left">
              <div className="font-medium">JSON (.json)</div>
              <div className="text-xs text-gray-500">Strukturiertes Format</div>
            </div>
          </button>

          <hr className="my-2 border-gray-200 dark:border-slate-700" />

          <button
            onClick={copyToClipboard}
            className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-300 transition-colors"
          >
            {copied ? (
              <Check className="h-5 w-5 text-green-500" />
            ) : (
              <Copy className="h-5 w-5 text-gray-500" />
            )}
            <div className="text-left">
              <div className="font-medium">{copied ? 'Kopiert!' : 'In Zwischenablage kopieren'}</div>
              <div className="text-xs text-gray-500">Als Text kopieren</div>
            </div>
          </button>
        </div>
      </div>
    </div>
  )
}

