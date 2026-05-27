'use client'

import { cn } from '@/core/utils/helpers'
import type { ButtonHTMLAttributes, ReactNode } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'whatsapp' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  isLoading?: boolean
  leftIcon?: ReactNode
  rightIcon?: ReactNode
}

const variants = {
  primary: 'bg-primary text-on-primary hover:bg-primary-container sun-shadow',
  secondary: 'bg-secondary-container text-on-secondary-container hover:bg-outline-variant/30',
  outline: 'border border-outline text-primary hover:bg-surface-container',
  whatsapp: 'bg-whatsapp text-white hover:brightness-110 sun-shadow',
  ghost: 'bg-transparent text-primary hover:bg-surface-container',
  danger: 'bg-red-600 text-white hover:bg-red-700 sun-shadow',
}

const sizes = {
  sm: 'px-3 py-2 text-xs rounded-lg',
  md: 'px-5 md:px-6 py-2.5 md:py-3 text-xs md:text-sm rounded-xl',
  lg: 'px-8 py-4 text-sm md:text-base rounded-xl',
}

export function Button({
  children,
  className,
  variant = 'primary',
  size = 'md',
  isLoading,
  leftIcon,
  rightIcon,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        'flex items-center justify-center gap-2 font-headline font-semibold transition-all active:scale-95 disabled:opacity-50 disabled:active:scale-100 cursor-pointer disabled:cursor-not-allowed',
        variants[variant],
        sizes[size],
        className
      )}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ) : (
        <>
          {leftIcon}
          {children}
          {rightIcon}
        </>
      )}
    </button>
  )
}
