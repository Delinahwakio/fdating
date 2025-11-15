import { ReactNode } from 'react'
import { cn } from '@/lib/utils/cn'

interface AuthLayoutProps {
  children: ReactNode
  className?: string
}

export const AuthLayout = ({ children, className }: AuthLayoutProps) => {
  return (
    <div className="min-h-screen bg-primary-bg flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-primary-red mb-2">Fantooo</h1>
          <p className="text-gray-400">Connect with your fantasy</p>
        </div>
        <div className={cn('w-full', className)}>
          {children}
        </div>
      </div>
    </div>
  )
}
