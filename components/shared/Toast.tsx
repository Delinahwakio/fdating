'use client'

import { createContext, useContext, useState, ReactNode, useCallback } from 'react'
import { cn } from '@/lib/utils/cn'

type ToastVariant = 'success' | 'error' | 'info'

interface Toast {
  id: string
  message: string
  variant: ToastVariant
}

interface ToastContextType {
  success: (message: string) => void
  error: (message: string) => void
  info: (message: string) => void
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

export const useToast = () => {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within ToastProvider')
  }
  return context
}

export const ToastProvider = ({ children }: { children: ReactNode }) => {
  const [toasts, setToasts] = useState<Toast[]>([])

  const addToast = useCallback((message: string, variant: ToastVariant) => {
    const id = Math.random().toString(36).substring(7)
    setToasts((prev) => [...prev, { id, message, variant }])

    setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id))
    }, 5000)
  }, [])

  const success = useCallback((message: string) => addToast(message, 'success'), [addToast])
  const error = useCallback((message: string) => addToast(message, 'error'), [addToast])
  const info = useCallback((message: string) => addToast(message, 'info'), [addToast])

  return (
    <ToastContext.Provider value={{ success, error, info }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-md">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} />
        ))}
      </div>
    </ToastContext.Provider>
  )
}

const ToastItem = ({ toast }: { toast: Toast }) => {
  const variantStyles = {
    success: 'border-green-500/50 bg-green-500/10',
    error: 'border-red-500/50 bg-red-500/10',
    info: 'border-blue-500/50 bg-blue-500/10',
  }

  const iconStyles = {
    success: '✓',
    error: '✕',
    info: 'ℹ',
  }

  return (
    <div
      className={cn(
        'flex items-center gap-3 p-4 rounded-glass-sm',
        'bg-glass-light backdrop-blur-md border',
        'shadow-lg animate-in slide-in-from-right duration-300',
        variantStyles[toast.variant]
      )}
    >
      <span className="text-xl">{iconStyles[toast.variant]}</span>
      <p className="text-sm text-gray-50">{toast.message}</p>
    </div>
  )
}

// Convenience export for direct usage
export const toast = {
  success: (message: string) => {
    console.warn('Toast called outside provider context')
  },
  error: (message: string) => {
    console.warn('Toast called outside provider context')
  },
  info: (message: string) => {
    console.warn('Toast called outside provider context')
  },
}
