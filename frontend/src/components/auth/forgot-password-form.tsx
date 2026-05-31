import { yupResolver } from '@hookform/resolvers/yup'
import { Loader2 } from 'lucide-react'
import { useForm } from 'react-hook-form'
import * as yup from 'yup'
import { Button } from '~/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '~/components/ui/form'
import { Input } from '~/components/ui/input'
import { useForgotPassword } from '~/hooks/use-auth'
import type { ForgotPasswordFormData } from '~/types'

const schema = yup.object({
  email: yup.string().email('Invalid email').required('Email is required'),
})

interface ForgotPasswordFormProps {
  onSuccess: (email: string) => void
}

export function ForgotPasswordForm({ onSuccess }: ForgotPasswordFormProps) {
  const { mutate, isPending, isSuccess } = useForgotPassword()

  const form = useForm<ForgotPasswordFormData>({
    resolver: yupResolver(schema),
    defaultValues: { email: '' },
  })

  const onSubmit = (data: ForgotPasswordFormData) => {
    mutate(data, { onSuccess: () => onSuccess(data.email) })
  }

  if (isSuccess) {
    return (
      <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800 dark:border-green-800/30 dark:bg-green-900/20 dark:text-green-400">
        Check your email for a 6-digit OTP code to reset your password.
      </div>
    )
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input type="email" placeholder="you@example.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full" disabled={isPending}>
          {isPending && <Loader2 className="size-4 animate-spin" />}
          Send reset code
        </Button>
      </form>
    </Form>
  )
}
