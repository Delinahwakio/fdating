import { Toaster } from 'react-hot-toast'
import { OperatorLayout } from '@/components/layouts/OperatorLayout'

export default function OperatorRootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#1A1A2E',
            color: '#F9FAFB',
            border: '1px solid rgba(255, 255, 255, 0.1)',
          },
          success: {
            iconTheme: {
              primary: '#10B981',
              secondary: '#F9FAFB',
            },
          },
          error: {
            iconTheme: {
              primary: '#DC2626',
              secondary: '#F9FAFB',
            },
          },
        }}
      />
      <OperatorLayout>{children}</OperatorLayout>
    </>
  )
}
