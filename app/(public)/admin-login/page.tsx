import { LoginForm } from '@/components/auth/LoginForm'

export default function AdminLoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#0F0F23]">
      <LoginForm
        title="Admin Login"
        role="admin"
        redirectPath="/admin/dashboard"
      />
    </div>
  )
}
