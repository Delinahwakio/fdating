import { ButtonHTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/utils/cn'

interface GlassButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode
  variant?: 'primary' | 'secondary' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export const GlassButton = ({
  children,
  variant = 'primary',
  size = 'md',
  className,
  disabled,
  ...props
}: GlassButtonProps) => {
  const baseStyles = 'font-medium transition-all duration-300 rounded-glass-sm'
  
  const variantStyles = {
    primary: cn(
      'bg-primary-red text-white',
      'hover:bg-red-700 hover:shadow-lg hover:shadow-red-500/20',
      'active:scale-95',
      'disabled:bg-gray-600 disabled:cursor-not-allowed disabled:opacity-50'
    ),
    secondary: cn(
      'bg-glass-light backdrop-blur-md border border-white/10 text-gray-50',
      'hover:bg-glass-medium hover:border-white/20',
      'active:scale-95',
      'disabled:opacity-50 disabled:cursor-not-allowed'
    ),
    ghost: cn(
      'bg-transparent text-gray-300',
      'hover:bg-glass-light hover:text-gray-50',
      'active:scale-95',
      'disabled:opacity-50 disabled:cursor-not-allowed'
    ),
  }

  const sizeStyles = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg',
  }

  return (
    <button
      className={cn(
        baseStyles,
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  )
}
