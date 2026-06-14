import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { useProjectContext } from "~/components/providers/project-slug-provider";
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
	const { accessToken, user } = useAuthStore();
	const userId = user?.id!;
	const { setOnlineUsers } = useProjectContext();

	useEffect(() => {
		if (!projectId || !userId) return;

		const socket = getProjectSocket(projectId);

		socket.on("project:joined", (data) => {
			console.log("Joined:", data);
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
			console.log(`user started typing`, data);
		});

		socket.on("user:typing-stop", (data) => {
			console.log(`user stopped typing`, data);
		});

		socket.on("presence:updated", (data) => {
			setOnlineUsers(data.users ?? []);
		});

		return () => {
			socket.off("project:joined");
			socket.off("task:created");
			socket.off("task:updated");
			socket.off("task:deleted");
			socket.off("user:typing");
			socket.off("user:typing-stop");
			socket.off("presence:updated");
		};
	}, [accessToken, projectId, qc, userId, setOnlineUsers]);
}
