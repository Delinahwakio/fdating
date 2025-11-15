import { ReactNode } from 'react'
import { cn } from '@/lib/utils/cn'

interface GlassCardProps {
  children: ReactNode
  className?: string
  onClick?: () => void
}

export const GlassCard = ({ children, className, onClick }: GlassCardProps) => {
  return (
    <div
      onClick={onClick}
      className={cn(
        'bg-glass-light backdrop-blur-md border border-white/10',
        'rounded-glass shadow-lg',
        'transition-all duration-300',
        'hover:bg-glass-medium hover:border-white/20',
        onClick && 'cursor-pointer',
        className
      )}
    >
      {children}
    </div>
  )
}
