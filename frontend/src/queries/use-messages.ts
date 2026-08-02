import { queryOptions, useQuery } from "@tanstack/react-query";
import { messageApi } from "~/lib/api/messages";
import type { ChatMessage, PaginationMeta } from "~/types";

export const messageKeys = {
	all: ["messages"] as const,
	lists: (projectId: number) =>
		[...messageKeys.all, "list", projectId] as const,
};

/** Shape held in the query cache: messages in display order (oldest → newest). */
export interface MessageListData {
	data: ChatMessage[];
	pagination?: PaginationMeta;
}

export const messagesQueryOptions = (projectId: number) =>
	queryOptions({
		queryKey: messageKeys.lists(projectId),
		queryFn: async (): Promise<MessageListData> => {
			const res = await messageApi.getHistory(projectId, {
				page: 1,
				limit: 30,
			});
			// Backend returns newest-first; reverse to display order (oldest → newest).
			const payload = res.data.data as MessageListData;
			return { ...payload, data: [...(payload.data ?? [])].reverse() };
		},
		enabled: !!projectId,
	});

export function useMessages(projectId: number) {
	return useQuery(messagesQueryOptions(projectId));
}
