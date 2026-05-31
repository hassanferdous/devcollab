import { createFileRoute } from '@tanstack/react-router'
import { yupResolver } from '@hookform/resolvers/yup'
import { Loader2 } from 'lucide-react'
import { useForm } from 'react-hook-form'
import * as yup from 'yup'
import { toast } from 'sonner'
import { useMutation } from '@tanstack/react-query'
import { AppHeader } from '~/components/layout/app-header'
import { Avatar, AvatarFallback, AvatarImage } from '~/components/ui/avatar'
import { Button } from '~/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '~/components/ui/form'
import { Input } from '~/components/ui/input'
import { Separator } from '~/components/ui/separator'
import { userApi } from '~/lib/api/users'
import { useAuthStore } from '~/stores/auth'

export const Route = createFileRoute('/_app/profile')({
  component: ProfilePage,
})

const profileSchema = yup.object({
  name: yup.string().min(2).required('Name is required'),
  email: yup.string().email().required('Email is required'),
})

type ProfileFormData = yup.InferType<typeof profileSchema>

function getInitials(name: string) {
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
}

function ProfilePage() {
  const { user, updateUser } = useAuthStore()

  const form = useForm<ProfileFormData>({
    resolver: yupResolver(profileSchema),
    defaultValues: { name: user?.name ?? '', email: user?.email ?? '' },
  })

  const { mutate, isPending } = useMutation({
    mutationFn: (data: ProfileFormData) => userApi.update(user!.id, data),
    onSuccess: (res) => {
      updateUser(res.data.data)
      toast.success('Profile updated!')
    },
    onError: () => toast.error('Failed to update profile'),
  })

  if (!user) return null

  return (
    <>
      <AppHeader title="Profile" />

      <div className="flex-1 p-6">
        <div className="mx-auto max-w-lg space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Profile information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center gap-4">
                <Avatar className="size-16">
                  <AvatarImage src={user.avatar ?? undefined} />
                  <AvatarFallback className="text-lg">
                    {getInitials(user.name)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{user.name}</p>
                  <p className="text-sm text-muted-foreground">{user.email}</p>
                  <p className="mt-1 text-xs text-muted-foreground capitalize">
                    Signed in via {user.provider}
                  </p>
                </div>
              </div>

              <Separator />

              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit((data) => mutate(data))}
                  className="space-y-4"
                >
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Full name</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email address</FormLabel>
                        <FormControl>
                          <Input type="email" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-end">
                    <Button type="submit" disabled={isPending}>
                      {isPending && <Loader2 className="size-4 animate-spin" />}
                      Save changes
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  )
}
