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
import { useVerifyOtp } from '~/queries/use-auth'
import type { VerifyOtpFormData } from '~/types'

const schema = yup.object({
  email: yup.string().email().required(),
  otp: yup
    .string()
    .length(6, 'OTP must be 6 digits')
    .matches(/^\d{6}$/, 'OTP must be numeric')
    .required('OTP is required'),
})

interface VerifyOtpFormProps {
  email: string
  onSuccess: (token: string) => void
}

export function VerifyOtpForm({ email, onSuccess }: VerifyOtpFormProps) {
  const { mutate, isPending, error } = useVerifyOtp()

  const form = useForm<VerifyOtpFormData>({
    resolver: yupResolver(schema),
    defaultValues: { email, otp: '' },
  })

  const errorMessage =
    (error as { response?: { data?: { message?: string } } })?.response?.data?.message

  const onSubmit = (data: VerifyOtpFormData) => {
    mutate(data, {
      onSuccess: (res) => {
        onSuccess(res.data.data?.token ?? '')
      },
    })
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {errorMessage && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {errorMessage}
          </div>
        )}

        <p className="text-sm text-muted-foreground">
          We sent a code to <span className="font-medium text-foreground">{email}</span>
        </p>

        <FormField
          control={form.control}
          name="otp"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Verification code</FormLabel>
              <FormControl>
                <Input
                  placeholder="000000"
                  maxLength={6}
                  inputMode="numeric"
                  className="text-center text-2xl tracking-[0.5em]"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full" disabled={isPending}>
          {isPending && <Loader2 className="size-4 animate-spin" />}
          Verify code
        </Button>
      </form>
    </Form>
  )
}
