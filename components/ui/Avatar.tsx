'use client'

import React, { forwardRef, ImgHTMLAttributes, useState } from 'react'

type AvatarSize = 'sm' | 'md' | 'lg' | 'xl'

interface AvatarProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'size'> {
  size?: AvatarSize
  fallback?: string
  status?: 'online' | 'offline' | 'busy' | 'away'
}

const sizeStyles: Record<AvatarSize, { container: string; text: string; status: string }> = {
  sm: { container: 'w-8 h-8', text: 'text-xs', status: 'w-2 h-2' },
  md: { container: 'w-10 h-10', text: 'text-sm', status: 'w-2.5 h-2.5' },
  lg: { container: 'w-12 h-12', text: 'text-base', status: 'w-3 h-3' },
  xl: { container: 'w-16 h-16', text: 'text-lg', status: 'w-4 h-4' },
}

const statusColors = {
  online: 'bg-green-500',
  offline: 'bg-gray-400',
  busy: 'bg-red-500',
  away: 'bg-yellow-500',
}

const Avatar = forwardRef<HTMLDivElement, AvatarProps>(({
  size = 'md',
  fallback,
  status,
  src,
  alt = '',
  className = '',
  ...props
}, ref) => {
  const [hasError, setHasError] = useState(false)
  const styles = sizeStyles[size]

  // Generate initials from fallback or alt
  const getInitials = (text: string) => {
    return text
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const initials = fallback || (alt ? getInitials(alt) : '?')

  return (
    <div
      ref={ref}
      className={`relative inline-flex ${styles.container} ${className}`}
    >
      {src && !hasError ? (
        <img
          src={src}
          alt={alt}
          className={`${styles.container} rounded-full object-cover`}
          onError={() => setHasError(true)}
          {...props}
        />
      ) : (
        <div
          className={`
            ${styles.container}
            rounded-full
            bg-gradient-to-br from-blue-500 to-purple-600
            flex items-center justify-center
            text-white font-medium
            ${styles.text}
          `}
        >
          {initials}
        </div>
      )}

      {status && (
        <span
          className={`
            absolute bottom-0 right-0
            ${styles.status}
            ${statusColors[status]}
            rounded-full
            border-2 border-white dark:border-slate-900
          `}
        />
      )}
    </div>
  )
})

Avatar.displayName = 'Avatar'

// Avatar Group component
interface AvatarGroupProps {
  children: React.ReactNode
  max?: number
  size?: AvatarSize
}

const AvatarGroup = ({ children, max = 4, size = 'md' }: AvatarGroupProps) => {
  const childArray = React.Children.toArray(children)
  const visibleChildren = childArray.slice(0, max)
  const remainingCount = childArray.length - max

  return (
    <div className="flex -space-x-2">
      {visibleChildren.map((child, index) => (
        <div key={index} className="relative" style={{ zIndex: visibleChildren.length - index }}>
          {React.isValidElement(child) 
            ? React.cloneElement(child as React.ReactElement<AvatarProps>, { size })
            : child
          }
        </div>
      ))}
      {remainingCount > 0 && (
        <div
          className={`
            ${sizeStyles[size].container}
            rounded-full
            bg-gray-200 dark:bg-slate-700
            flex items-center justify-center
            text-gray-600 dark:text-gray-300
            font-medium
            ${sizeStyles[size].text}
            border-2 border-white dark:border-slate-900
          `}
        >
          +{remainingCount}
        </div>
      )}
    </div>
  )
}

export { Avatar, AvatarGroup, type AvatarProps, type AvatarSize }
