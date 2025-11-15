import { LoginForm } from '@/components/auth/LoginForm'

export default function OperatorLoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#0F0F23]">
      <LoginForm
        title="Operator Login"
        role="operator"
        redirectPath="/operator/waiting"
      />
    </div>
  )
}
