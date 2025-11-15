import { cn } from '@/lib/utils/cn'

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export const LoadingSpinner = ({ size = 'md', className }: LoadingSpinnerProps) => {
  const sizeStyles = {
    sm: 'w-4 h-4 border-2',
    md: 'w-8 h-8 border-3',
    lg: 'w-12 h-12 border-4',
  }

  return (
    <div
      className={cn(
        'inline-block rounded-full border-solid border-primary-red border-t-transparent',
        'animate-spin',
        sizeStyles[size],
        className
      )}
      role="status"
      aria-label="Loading"
    >
      <span className="sr-only">Loading...</span>
    </div>
  )
}

export const LoadingScreen = ({ message }: { message?: string }) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-primary-bg">
      <LoadingSpinner size="lg" />
      {message && (
        <p className="mt-4 text-gray-300 text-lg">{message}</p>
      )}
    </div>
  )
}
