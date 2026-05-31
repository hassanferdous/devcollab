import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { projectApi } from '~/lib/api/projects'
import type { CreateProjectFormData, MemberRole } from '~/types'

export const projectKeys = {
  all: ['projects'] as const,
  lists: () => [...projectKeys.all, 'list'] as const,
  detail: (id: number) => [...projectKeys.all, 'detail', id] as const,
}

export const projectsQueryOptions = queryOptions({
  queryKey: projectKeys.lists(),
  queryFn: () => projectApi.getAll().then((r) => r.data.data),
})

export const projectQueryOptions = (projectId: number) => queryOptions({
  queryKey: projectKeys.detail(projectId),
  queryFn: () => projectApi.getById(projectId).then((r) => r.data.data),
  enabled: !!projectId,
})

export function useProjects() {
  return useQuery(projectsQueryOptions)
}

export function useProject(projectId: number) {
  return useQuery(projectQueryOptions(projectId))
}

export function useCreateProject() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateProjectFormData) => projectApi.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: projectKeys.lists() }),
  })
}

export function useUpdateProject(projectId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Partial<CreateProjectFormData>) =>
      projectApi.update(projectId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: projectKeys.lists() })
      qc.invalidateQueries({ queryKey: projectKeys.detail(projectId) })
    },
  })
}

export function useDeleteProject() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (projectId: number) => projectApi.delete(projectId),
    onSuccess: () => qc.invalidateQueries({ queryKey: projectKeys.lists() }),
  })
}

export function useManageMember(projectId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (
      data:
        | { action: 'add'; userId: number; role: MemberRole }
        | { action: 'remove'; userId: number }
    ) => projectApi.manageMember(projectId, data),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: projectKeys.detail(projectId) }),
  })
}
