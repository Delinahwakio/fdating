import { LoginForm } from '@/components/auth/LoginForm'

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#0F0F23]">
      <LoginForm
        title="User Login"
        role="user"
        redirectPath="/discover"
      />
    </div>
  )
}
