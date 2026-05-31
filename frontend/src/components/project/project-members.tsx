import { yupResolver } from '@hookform/resolvers/yup'
import { Loader2, UserMinus, UserPlus } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import * as yup from 'yup'
import { Avatar, AvatarFallback, AvatarImage } from '~/components/ui/avatar'
import { Button } from '~/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '~/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '~/components/ui/form'
import { Input } from '~/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '~/components/ui/alert-dialog'
import { useManageMember } from '~/hooks/use-projects'
import { userApi } from '~/lib/api/users'
import { useAuthStore } from '~/stores/auth'
import type { AddMemberFormData, MemberRole, ProjectMember, User } from '~/types'

const addMemberSchema = yup.object({
  userId: yup.number().required('User ID is required'),
  role: yup
    .mixed<MemberRole>()
    .oneOf(['admin', 'member', 'viewer'])
    .required('Role is required'),
})

function getInitials(name: string) {
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
}

const roleBadge: Record<MemberRole, string> = {
  admin: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  member: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  viewer: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
}

interface ProjectMembersProps {
  projectId: number
  members: ProjectMember[]
  canManage: boolean
}

export function ProjectMembers({ projectId, members, canManage }: ProjectMembersProps) {
  const [addOpen, setAddOpen] = useState(false)
  const [removeTarget, setRemoveTarget] = useState<ProjectMember | null>(null)
  const [userSearch, setUserSearch] = useState('')
  const [foundUser, setFoundUser] = useState<User | null>(null)
  const [searching, setSearching] = useState(false)
  const { mutate, isPending } = useManageMember(projectId)
  const { user: currentUser } = useAuthStore()

  const form = useForm<AddMemberFormData>({
    resolver: yupResolver(addMemberSchema),
    defaultValues: { userId: 0, role: 'member' },
  })

  const searchUser = async () => {
    setSearching(true)
    try {
      const userId = parseInt(userSearch)
      if (isNaN(userId)) return
      const res = await userApi.getById(userId)
      setFoundUser(res.data.data)
      form.setValue('userId', userId)
    } catch {
      setFoundUser(null)
    } finally {
      setSearching(false)
    }
  }

  const handleAddMember = (data: AddMemberFormData) => {
    mutate(
      { action: 'add', userId: data.userId, role: data.role },
      {
        onSuccess: () => {
          setAddOpen(false)
          form.reset()
          setFoundUser(null)
          setUserSearch('')
        },
      }
    )
  }

  const handleRemoveMember = () => {
    if (!removeTarget) return
    mutate(
      { action: 'remove', userId: removeTarget.user_id },
      { onSuccess: () => setRemoveTarget(null) }
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {canManage && (
        <div className="flex justify-end">
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline">
                <UserPlus className="size-4" />
                Add member
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add team member</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(handleAddMember)}
                  className="space-y-4"
                >
                  <div className="flex gap-2">
                    <Input
                      placeholder="User ID"
                      value={userSearch}
                      onChange={(e) => setUserSearch(e.target.value)}
                      type="number"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={searchUser}
                      disabled={searching}
                    >
                      {searching ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        'Find'
                      )}
                    </Button>
                  </div>

                  {foundUser && (
                    <div className="flex items-center gap-3 rounded-lg border p-3">
                      <Avatar className="size-8">
                        <AvatarImage src={foundUser.avatar ?? undefined} />
                        <AvatarFallback className="text-xs">
                          {getInitials(foundUser.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">{foundUser.name}</p>
                        <p className="text-xs text-muted-foreground">{foundUser.email}</p>
                      </div>
                    </div>
                  )}

                  <FormField
                    control={form.control}
                    name="role"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Role</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="admin">Admin</SelectItem>
                            <SelectItem value="member">Member</SelectItem>
                            <SelectItem value="viewer">Viewer</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setAddOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={isPending || !foundUser}>
                      {isPending && <Loader2 className="size-4 animate-spin" />}
                      Add member
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      )}

      <div className="divide-y rounded-lg border">
        {members.map((member) => (
          <div
            key={member.user_id}
            className="flex items-center gap-3 px-4 py-3"
          >
            <Avatar className="size-8 shrink-0">
              <AvatarImage src={member.user?.avatar ?? undefined} />
              <AvatarFallback className="text-xs">
                {member.user ? getInitials(member.user.name) : '?'}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">
                {member.user?.name ?? `User #${member.user_id}`}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {member.user?.email}
              </p>
            </div>
            <span
              className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium capitalize ${roleBadge[member.role]}`}
            >
              {member.role}
            </span>
            {canManage && member.user_id !== currentUser?.id && (
              <Button
                variant="ghost"
                size="icon-xs"
                className="shrink-0 text-muted-foreground hover:text-destructive"
                onClick={() => setRemoveTarget(member)}
              >
                <UserMinus className="size-3.5" />
              </Button>
            )}
          </div>
        ))}
        {members.length === 0 && (
          <p className="px-4 py-6 text-center text-sm text-muted-foreground">
            No members yet
          </p>
        )}
      </div>

      <AlertDialog
        open={!!removeTarget}
        onOpenChange={(o) => !o && setRemoveTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove member?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove{' '}
              <span className="font-medium text-foreground">
                {removeTarget?.user?.name ?? `User #${removeTarget?.user_id}`}
              </span>{' '}
              from the project. They will lose access immediately.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveMember}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                'Remove'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
