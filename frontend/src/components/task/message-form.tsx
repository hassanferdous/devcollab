import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormMessage,
} from "~/components/ui/form";
import { cn, wait } from "~/lib/utils";
import { Button } from "../ui/button";
import { Textarea } from "../ui/textarea";
import { useProjectContext } from "../providers/project-slug-provider";
import { getProjectSocket } from "~/lib/socket";
import { useDebounce } from "~/hooks/use-debounce";
import { useAuthStore } from "~/stores/auth";

export function MessageForm() {
	const { slug: projectId, effectiveRole } = useProjectContext();
	const { user } = useAuthStore();
	const [isFocused, setIsFocused] = useState<boolean>(false);
	const form = useForm({
		defaultValues: {
			message: "",
		},
	});

	const { debouncedFn } = useDebounce();

	const onSubmit = (data: { message: string }) => {};
	const isActive = isFocused || form.getValues("message").trim().length > 0;
	const isTyping = useRef<boolean>(false);

	const handleTypingStop = debouncedFn(() => {
		if (!projectId) return;
		const socket = getProjectSocket(projectId);
		socket.emit("user:typing-stop", `${user?.name} stoped typing...`);
		isTyping.current = false;
	}, 1000);

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
									onKeyDown={() => {
										handleTypingStop(false);
										if (isTyping.current) return;
										const socket = getProjectSocket(projectId);
										socket.emit(
											"user:typing",
											`${user?.name} is typing...`,
										);
										isTyping.current = true;
									}}
									{...field}
								/>
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>
				{/* {isTyping && (
					<p className="text-xs text-muted-foreground">Typing...</p>
				)} */}
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
						<Button className="text-xs px-2 py-1 h-auto" type="submit">
							Submit
						</Button>
					</div>
				)}
			</form>
		</Form>
	);
}
