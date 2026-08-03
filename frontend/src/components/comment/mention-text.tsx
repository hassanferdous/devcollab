import { Fragment } from "react";
import { cn } from "~/lib/utils";
import { parseMentions } from "~/lib/parse-mentions";

interface MentionTextProps {
	content: string;
	currentUserId?: number;
	className?: string;
}

/**
 * Renders comment/notification text with `@[Name](id)` tokens turned into
 * highlighted mention chips. A mention of the current user gets a distinct
 * "you" style.
 */
export function MentionText({
	content,
	currentUserId,
	className,
}: MentionTextProps) {
	const parts = parseMentions(content);

	return (
		<span className={cn("whitespace-pre-wrap break-words", className)}>
			{parts.map((part, i) =>
				part.type === "text" ? (
					<Fragment key={i}>{part.value}</Fragment>
				) : (
					<span
						key={i}
						className={cn(
							"rounded px-1 font-medium",
							part.id === currentUserId
								? "bg-primary/20 text-primary"
								: "bg-accent-foreground/10 text-accent-foreground",
						)}>
						@{part.name}
					</span>
				),
			)}
		</span>
	);
}
