/**
 * Mentions are stored inline in comment text as a stable token: `@[Name](userId)`.
 * This keeps them persistable as plain text, re-parseable on reload, and
 * self-healing (a half-deleted token simply stops matching).
 */
export const MENTION_RE = /@\[([^\]]+)\]\((\d+)\)/g;

export type MentionPart =
	| { type: "text"; value: string }
	| { type: "mention"; id: number; name: string };

/** Split content into ordered text / mention parts for rendering. */
export function parseMentions(content: string): MentionPart[] {
	const parts: MentionPart[] = [];
	let lastIndex = 0;
	// Fresh regex state per call (MENTION_RE is global/stateful).
	const re = new RegExp(MENTION_RE.source, "g");
	let match: RegExpExecArray | null;

	while ((match = re.exec(content)) !== null) {
		if (match.index > lastIndex) {
			parts.push({ type: "text", value: content.slice(lastIndex, match.index) });
		}
		parts.push({ type: "mention", name: match[1], id: Number(match[2]) });
		lastIndex = match.index + match[0].length;
	}

	if (lastIndex < content.length) {
		parts.push({ type: "text", value: content.slice(lastIndex) });
	}

	return parts;
}

/** Render mention tokens as readable `@Name` for plain-text contexts (toasts, titles). */
export function mentionsToPlainText(content: string): string {
	return content.replace(new RegExp(MENTION_RE.source, "g"), (_m, name) => `@${name}`);
}

/** Unique user ids referenced by mention tokens in `content`. */
export function extractMentionedIds(content: string): number[] {
	const re = new RegExp(MENTION_RE.source, "g");
	const ids = new Set<number>();
	let match: RegExpExecArray | null;
	while ((match = re.exec(content)) !== null) {
		ids.add(Number(match[2]));
	}
	return [...ids];
}
