import { AdminLayout } from '@/components/layouts/AdminLayout'
import { Toaster } from 'react-hot-toast'

export default function AdminRootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AdminLayout>
      {children}
      <Toaster position="bottom-right" />
    </AdminLayout>
  )
}
