import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { useProjectContext } from "~/components/providers/project-slug-provider";
import { getProjectSocket } from "~/lib/socket";
import { useAuthStore } from "~/stores/auth";
import type {
	CommentItem,
	CommentNewPayload,
	Task,
	TaskCreatedPayload,
	TaskDeletedPayload,
	TaskUpdatedPayload,
} from "~/types";
import { taskKeys } from "~/queries/use-tasks";
import { commentKeys, type CommentListData } from "~/queries/use-comments";

export function useProjectSocket(projectId: number) {
	const qc = useQueryClient();
	const { accessToken, user } = useAuthStore();
	const userId = user?.id!;
	const { setOnlineUsers, setTypingUsers } = useProjectContext();

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

		socket.on("comment:new", (c: CommentNewPayload) => {
			// Route by task_id: a project-room broadcast may target any card.
			qc.setQueryData<CommentListData>(
				commentKeys.lists(c.task_id),
				(old) => {
					const list = old?.data ?? [];
					// Reconcile the sender's optimistic row by clientId; otherwise append.
					const idx = c.clientId
						? list.findIndex((m) => m.clientId === c.clientId)
						: -1;
					const reconciled: CommentItem = { ...c, pending: false };
					const data =
						idx >= 0
							? list.map((m, i) => (i === idx ? reconciled : m))
							: [...list, reconciled];
					return { data, pagination: old?.pagination };
				},
			);
		});

		socket.on("user:typing", (data) => {
			if (!data || data.userId === userId) return;
			setTypingUsers((prev) =>
				prev.includes(data.userId) ? prev : [...prev, data.userId],
			);
		});

		socket.on("user:typing-stop", (data) => {
			if (!data) return;
			setTypingUsers((prev) => prev.filter((id) => id !== data.userId));
		});

		socket.on("presence:updated", (data) => {
			setOnlineUsers(data.users ?? []);
		});

		return () => {
			socket.off("project:joined");
			socket.off("task:created");
			socket.off("task:updated");
			socket.off("task:deleted");
			socket.off("comment:new");
			socket.off("user:typing");
			socket.off("user:typing-stop");
			socket.off("presence:updated");
		};
	}, [accessToken, projectId, qc, userId, setOnlineUsers, setTypingUsers]);
}
