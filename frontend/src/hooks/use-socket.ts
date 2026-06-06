import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { getProjectSocket } from "~/lib/socket";
import { useAuthStore } from "~/stores/auth";
import type {
	Task,
	TaskCreatedPayload,
	TaskDeletedPayload,
	TaskUpdatedPayload,
} from "~/types";
import { taskKeys } from "~/queries/use-tasks";

export function useProjectSocket(projectId: number) {
	const qc = useQueryClient();
	const { accessToken } = useAuthStore();

	useEffect(() => {
		if (!projectId) return;

		const socket = getProjectSocket(projectId);

		socket.on("project:joined", (data) => {
			console.log("project:joined", data);
		});

		socket.on("task:created", (task: TaskCreatedPayload) => {
			qc.setQueryData<{ data: Task[]; pagination: unknown }>(
				taskKeys.lists(projectId),
				(old) => {
					if (!old) return old;
					return { ...old, data: [...old.data, task] };
				},
			);
		});

		socket.on("task:updated", (task: TaskUpdatedPayload) => {
			qc.setQueryData<{ data: Task[]; pagination: unknown }>(
				taskKeys.lists(projectId),
				(old) => {
					if (!old) return old;
					return {
						...old,
						data: old.data.map((t) => (t.id === task.id ? task : t)),
					};
				},
			);
			qc.setQueryData(taskKeys.detail(projectId, task.id), task);
		});

		socket.on("task:deleted", (task: TaskDeletedPayload) => {
			qc.setQueryData<{ data: Task[]; pagination: unknown }>(
				taskKeys.lists(projectId),
				(old) => {
					if (!old) return old;
					return {
						...old,
						data: old.data.filter((t) => t.id !== task.id),
					};
				},
			);
		});

		socket.on("user:typing", (data) => {
			console.log(data);
		});
		socket.on("user:typing-stop", (data) => {
			console.log(data);
		});

		return () => {
			socket.off("project:joined");
			socket.off("task:created");
			socket.off("task:updated");
			socket.off("task:deleted");
			socket.off("user:typing"); // ✅ Fixed
			socket.off("user:typing-stop"); // ✅ Fixed
		};
	}, [accessToken, projectId, qc]);
}
