import { createMongoAbility } from "@casl/ability";
import { AbilityProvider } from "@casl/react";
export const ability = createMongoAbility(
	[
		{
			action: "manage",
			subject: "Task",
			conditions: {
				role: {
					$in: ["admin", "member"],
				},
			},
		},
		{
			action: "read",
			subject: "Task",
			conditions: { role: "viewer" },
		},
	],
	{
		// Custom type detection algorithm
		detectSubjectType: (object) => {
			// If it's a plain object and has a 'subject' property, use that!
			if (object && typeof object === "object" && "subject" in object) {
				return object.subject as string;
			}
			// Fallback to CASL's default behavior if no 'subject' key is found
			return (
				(object.constructor as any).modelName || object.constructor.name
			);
		},
	},
);

export const ProjectAbilityProvider = ({
	children,
}: {
	children: React.ReactNode;
}) => {
	return <AbilityProvider value={ability}>{children}</AbilityProvider>;
};
