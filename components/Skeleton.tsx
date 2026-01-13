'use client'

interface SkeletonProps {
  className?: string
  variant?: 'text' | 'circular' | 'rectangular' | 'rounded'
  width?: string | number
  height?: string | number
  animation?: 'pulse' | 'wave' | 'none'
}

export function Skeleton({
  className = '',
  variant = 'text',
  width,
  height,
  animation = 'wave',
}: SkeletonProps) {
  const baseClasses = 'bg-gray-200 dark:bg-slate-700'
  
  const animationClasses = {
    pulse: 'animate-pulse',
    wave: 'skeleton',
    none: '',
  }

  const variantClasses = {
    text: 'rounded',
    circular: 'rounded-full',
    rectangular: '',
    rounded: 'rounded-lg',
  }

  const style: React.CSSProperties = {
    width: width || (variant === 'text' ? '100%' : undefined),
    height: height || (variant === 'text' ? '1em' : undefined),
  }

  return (
    <div
      className={`${baseClasses} ${animationClasses[animation]} ${variantClasses[variant]} ${className}`}
      style={style}
      role="status"
      aria-label="Lädt..."
    />
  )
}

/**
 * Message skeleton for chat loading state
 */
export function MessageSkeleton({ isUser = false }: { isUser?: boolean }) {
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} animate-fade-in`}>
      <div
        className={`max-w-[75%] rounded-xl px-4 py-3 ${
          isUser
            ? 'bg-blue-100 dark:bg-blue-900/30'
            : 'bg-gray-100 dark:bg-slate-800'
        }`}
      >
        <div className="space-y-2">
          <Skeleton variant="text" width="80%" height="1rem" />
          <Skeleton variant="text" width="60%" height="1rem" />
          {!isUser && <Skeleton variant="text" width="90%" height="1rem" />}
        </div>
        <Skeleton variant="text" width="4rem" height="0.75rem" className="mt-2" />
      </div>
    </div>
  )
}

/**
 * Chat list skeleton for sidebar loading state
 */
export function ChatListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="p-2 space-y-2">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="p-3 rounded-lg bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-slate-700"
        >
          <Skeleton variant="text" width="70%" height="1rem" />
          <Skeleton variant="text" width="50%" height="0.75rem" className="mt-2" />
        </div>
      ))}
    </div>
  )
}

/**
 * Full page loading skeleton
 */
export function PageSkeleton() {
  return (
    <div className="flex flex-col h-screen bg-white dark:bg-slate-900">
      {/* Header skeleton */}
      <div className="border-b border-gray-100 dark:border-slate-700 px-4 py-3">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <Skeleton variant="rounded" width="40px" height="40px" />
          <div className="flex-1">
            <Skeleton variant="text" width="120px" height="1.25rem" />
            <Skeleton variant="text" width="200px" height="0.875rem" className="mt-1" />
          </div>
        </div>
      </div>

      {/* Messages area skeleton */}
      <div className="flex-1 overflow-hidden bg-gray-50 dark:bg-slate-900 px-4 py-5">
        <div className="max-w-3xl mx-auto space-y-4">
          <MessageSkeleton />
          <MessageSkeleton isUser />
          <MessageSkeleton />
        </div>
      </div>

      {/* Input skeleton */}
      <div className="border-t border-gray-100 dark:border-slate-700 px-4 py-3">
        <div className="max-w-3xl mx-auto flex items-end gap-2">
          <Skeleton variant="rounded" className="flex-1" height="48px" />
          <Skeleton variant="rounded" width="44px" height="44px" />
          <Skeleton variant="rounded" width="44px" height="44px" />
        </div>
      </div>
    </div>
  )
}

export default Skeleton

