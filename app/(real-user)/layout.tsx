import { Toaster } from 'react-hot-toast'
import { DashboardLayout } from '@/components/layouts/DashboardLayout'

export default function RealUserLayout({
  children,
}: {
  children: React.ReactNode
}) {
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
