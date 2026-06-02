import {
	queryOptions,
	useMutation,
	useQuery,
	useQueryClient,
	useSuspenseQuery,
} from "@tanstack/react-query";
import { taskApi } from "~/lib/api/tasks";
import { wait } from "~/lib/utils";
import type { UpdateTaskFormData } from "~/types";

export const taskKeys = {
	all: ["tasks"] as const,
	lists: (projectId: number) => [...taskKeys.all, "list", projectId] as const,
	detail: (projectId: number, taskId: number) =>
		[...taskKeys.all, "detail", projectId, taskId] as const,
};

export const tasksQueryOptions = (projectId: number) =>
	queryOptions({
		queryKey: taskKeys.lists(projectId),
		queryFn: async () => {
			await wait(1500);
			return taskApi
				.getAll(projectId, { limit: 100 })
				.then((r) => r.data.data);
		},
		enabled: !!projectId,
	});

export function useTasks(projectId: number) {
	return useSuspenseQuery(tasksQueryOptions(projectId));
}

export function useTask(projectId: number, taskId: number) {
	return useQuery({
		queryKey: taskKeys.detail(projectId, taskId),
		queryFn: () =>
			taskApi.getById(projectId, taskId).then((r) => r.data.data),
		enabled: !!projectId && !!taskId,
	});
}

export function useCreateTask(projectId: number) {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (data: { title: string; description: string }) =>
			taskApi.create(projectId, data),
		onSuccess: () =>
			qc.invalidateQueries({ queryKey: taskKeys.lists(projectId) }),
	});
}

export function useUpdateTask(projectId: number) {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: ({
			taskId,
			data,
		}: {
			taskId: number;
			data: UpdateTaskFormData;
		}) => taskApi.update(projectId, taskId, data),
		onSuccess: (_, { taskId }) => {
			qc.invalidateQueries({ queryKey: taskKeys.lists(projectId) });
			qc.invalidateQueries({ queryKey: taskKeys.detail(projectId, taskId) });
		},
	});
}

export function useDeleteTask(projectId: number) {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (taskId: number) => taskApi.delete(projectId, taskId),
		onSuccess: () =>
			qc.invalidateQueries({ queryKey: taskKeys.lists(projectId) }),
	});
}
