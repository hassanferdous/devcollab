import { queryOptions, useQuery } from "@tanstack/react-query";
import { commentApi } from "~/lib/api/comments";
import type { CommentItem, PaginationMeta } from "~/types";

export const commentKeys = {
	all: ["comments"] as const,
	lists: (taskId: number) => [...commentKeys.all, "list", taskId] as const,
};

/** Shape held in the query cache: comments in display order (oldest → newest). */
export interface CommentListData {
	data: CommentItem[];
	pagination?: PaginationMeta;
}

export const commentsQueryOptions = (projectId: number, taskId: number) =>
	queryOptions({
		queryKey: commentKeys.lists(taskId),
		queryFn: async (): Promise<CommentListData> => {
			const res = await commentApi.getHistory(projectId, taskId, {
				page: 1,
				limit: 30,
			});
			// Backend returns newest-first; reverse to display order (oldest → newest).
			const payload = res.data.data as CommentListData;
			return { ...payload, data: [...(payload.data ?? [])].reverse() };
		},
		enabled: !!projectId && !!taskId,
	});

export function useComments(projectId: number, taskId: number) {
	return useQuery(commentsQueryOptions(projectId, taskId));
}
