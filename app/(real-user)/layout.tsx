'use client'

import { usePathname } from 'next/navigation'
import { useEffect } from 'react'
import { Toaster } from 'react-hot-toast'
import { DashboardLayout } from '@/components/layouts/DashboardLayout'

export default function RealUserLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const isChatPage = pathname?.startsWith('/chat/')

  // Disable automatic scroll restoration to prevent warnings with sticky headers
  useEffect(() => {
    if (typeof window !== 'undefined' && 'scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual'
    }
  }, [])

  // Don't wrap chat pages in DashboardLayout
  if (isChatPage) {
    return (
      <>
        {children}
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: '#1A1A2E',
              color: '#F9FAFB',
              border: '1px solid rgba(255, 255, 255, 0.1)',
            },
            success: {
              iconTheme: {
                primary: '#DC2626',
                secondary: '#F9FAFB',
              },
            },
          }}
        />
      </>
    )
  }

  return (
    <DashboardLayout>
      {children}
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#1A1A2E',
            color: '#F9FAFB',
            border: '1px solid rgba(255, 255, 255, 0.1)',
          },
          success: {
            iconTheme: {
              primary: '#DC2626',
              secondary: '#F9FAFB',
            },
          },
        }}
      />
    </DashboardLayout>
  )
}
