import { useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import {
	Form,
	FormControl,
	FormField,
	FormItem,
} from "~/components/ui/form";
import { useDebounce } from "~/hooks/use-debounce";
import { getProjectSocket } from "~/lib/socket";
import { cn } from "~/lib/utils";
import { messageKeys, type MessageListData } from "~/queries/use-messages";
import { useAuthStore } from "~/stores/auth";
import type { ChatMessage } from "~/types";
import { Button } from "../ui/button";
import { Textarea } from "../ui/textarea";

interface MessageFormProps {
	projectId: number;
}

export function MessageForm({ projectId }: MessageFormProps) {
	const qc = useQueryClient();
	const { user } = useAuthStore();
	const [isFocused, setIsFocused] = useState<boolean>(false);
	const form = useForm({ defaultValues: { message: "" } });
	const { debouncedFn } = useDebounce();
	const isTyping = useRef<boolean>(false);

	/** Flip a still-pending optimistic row to a failed state so the UI can flag it. */
	const markFailed = (clientId: string) => {
		qc.setQueryData<MessageListData>(messageKeys.lists(projectId), (old) => {
			if (!old) return old;
			return {
				...old,
				data: old.data.map((m) =>
					m.clientId === clientId && m.pending
						? { ...m, pending: false, failed: true }
						: m,
				),
			};
		});
	};

	const onSubmit = (data: { message: string }) => {
		const content = data.message.trim();
		if (!content || !user) return;

		const socket = getProjectSocket(projectId);
		const clientId = crypto.randomUUID();
		const now = new Date().toISOString();

		const optimistic: ChatMessage = {
			id: -Date.now(),
			project_id: projectId,
			sender_id: user.id,
			content,
			is_edited: false,
			created_at: now,
			updated_at: now,
			sender: { id: user.id, name: user.name, avatar: user.avatar },
			clientId,
			pending: true,
		};

		qc.setQueryData<MessageListData>(messageKeys.lists(projectId), (old) => ({
			data: [...(old?.data ?? []), optimistic],
			pagination: old?.pagination,
		}));

		socket.emit("message:send", { content, clientId }, (ack) => {
			if (!ack?.ok) {
				markFailed(clientId);
				toast.error(ack?.error ?? "Failed to send message");
			}
		});

		// Stop the typing indicator immediately on send.
		socket.emit("user:typing-stop");
		isTyping.current = false;

		form.reset();
		setIsFocused(false);
	};

	const handleTypingStop = debouncedFn(() => {
		const socket = getProjectSocket(projectId);
		socket.emit("user:typing-stop");
		isTyping.current = false;
	}, 1000);

	const value = form.watch("message");
	const isActive = isFocused || value.trim().length > 0;

	return (
		<Form {...form}>
			<form onSubmit={form.handleSubmit(onSubmit)}>
				<FormField
					control={form.control}
					name="message"
					render={({ field: { onBlur, ...field } }) => (
						<FormItem>
							<FormControl>
								<Textarea
									placeholder="Write a comment..."
									className={cn(
										"min-h-10 h-auto resize-none bg-accent transition-all duration-300",
										isActive && "min-h-12 bg-transparent",
									)}
									onBlur={() => setIsFocused(false)}
									onFocus={() => setIsFocused(true)}
									onKeyDown={(e) => {
										if (e.key === "Enter" && !e.shiftKey) {
											e.preventDefault();
											form.handleSubmit(onSubmit)();
											return;
										}
										handleTypingStop(undefined);
										if (isTyping.current) return;
										getProjectSocket(projectId).emit("user:typing");
										isTyping.current = true;
									}}
									{...field}
								/>
							</FormControl>
						</FormItem>
					)}
				/>
				{isActive && (
					<div className="flex justify-end gap-2 mt-2">
						<Button
							className="text-xs px-2 py-1 h-auto"
							variant="outline"
							onClick={() => {
								form.reset();
								setIsFocused(false);
							}}
							type="button">
							Cancel
						</Button>
						<Button
							className="text-xs px-2 py-1 h-auto"
							type="submit"
							disabled={!value.trim()}>
							Send
						</Button>
					</div>
				)}
			</form>
		</Form>
	);
}
