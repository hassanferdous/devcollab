import { createFileRoute, Link } from '@tanstack/react-router'
import { useState } from 'react'
import { ForgotPasswordForm } from '~/components/auth/forgot-password-form'
import { VerifyOtpForm } from '~/components/auth/verify-otp-form'
import { ResetPasswordForm } from '~/components/auth/reset-password-form'
import { ArrowLeft } from 'lucide-react'

export const Route = createFileRoute('/_auth/forgot-password')({
  component: ForgotPasswordPage,
})

type Step = 'email' | 'otp' | 'reset'

function ForgotPasswordPage() {
  const [step, setStep] = useState<Step>('email')
  const [email, setEmail] = useState('')
  const [resetToken, setResetToken] = useState('')

  const stepTitles: Record<Step, { title: string; description: string }> = {
    email: {
      title: 'Forgot your password?',
      description: "Enter your email and we'll send you a reset code",
    },
    otp: {
      title: 'Check your email',
      description: 'Enter the 6-digit code we sent to your inbox',
    },
    reset: {
      title: 'Create new password',
      description: 'Your new password must be at least 8 characters',
    },
  }

  const { title, description } = stepTitles[step]

  return (
    <div className="space-y-6">
      <div className="space-y-1.5 text-center">
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>

      {step === 'email' && (
        <ForgotPasswordForm
          onSuccess={(emailVal) => {
            setEmail(emailVal)
            setStep('otp')
          }}
        />
      )}

      {step === 'otp' && (
        <VerifyOtpForm
          email={email}
          onSuccess={(token) => {
            setResetToken(token)
            setStep('reset')
          }}
        />
      )}

      {step === 'reset' && <ResetPasswordForm token={resetToken} />}

      <Link
        to="/login"
        className="flex items-center justify-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="size-3.5" />
        Back to sign in
      </Link>
    </div>
  )
}
