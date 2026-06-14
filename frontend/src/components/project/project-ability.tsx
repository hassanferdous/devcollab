import { AbilityBuilder, createMongoAbility, type MongoAbility } from "@casl/ability";
import { AbilityProvider } from "@casl/react";
import { useMemo } from "react";
import { useProjectContext } from "~/components/providers/project-slug-provider";
import type { MemberRole } from "~/types";

type Actions = "manage" | "create" | "read" | "update" | "delete";
type Subjects = "Task" | "Project" | "all";
export type AppAbility = MongoAbility<[Actions, Subjects]>;

export function buildAbility(role?: MemberRole): AppAbility {
	const { can, build } = new AbilityBuilder<AppAbility>(createMongoAbility);

	switch (role) {
		case "admin":
			can("manage", "all");
			break;
		case "member":
			can("read", "Project");
			can("create", "Task");
			can("update", "Task");
			can("delete", "Task");
			break;
		case "viewer":
			can("read", "Project");
			can("read", "Task");
			break;
	}

	return build();
}

export const ProjectAbilityProvider = ({
	children,
}: {
	children: React.ReactNode;
}) => {
	const { effectiveRole } = useProjectContext();
	const ability = useMemo(() => buildAbility(effectiveRole), [effectiveRole]);
	return <AbilityProvider value={ability}>{children}</AbilityProvider>;
};
