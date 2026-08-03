import { projectRolesEnum } from "@/db/project.schema";
import { AbilityBuilder, createMongoAbility } from "@casl/ability";

export type MemberAbilityContext = {
	role: (typeof projectRolesEnum.enumValues)[number] | null;
	project_id: number;
	user_id: number;
	isMember: boolean;
	__subjectType: "Project" | "Task" | "Comment";
};

export default function defineAbilityFor(context: MemberAbilityContext) {
	const { can, rules } = new AbilityBuilder(createMongoAbility);

	switch (context.role) {
		case "admin":
			can("manage", "all");
			break;
		case "member":
			can("read", "Project");
			can("create", "Task");
			can("update", "Task");
			can("delete", "Task");
			can("create", "Comment");
			can("read", "Comment");
			break;
		case "viewer":
			can("read", "Project");
			can("read", "Task");
			can("read", "Comment");
			break;
		default:
			break;
	}

	return createMongoAbility(rules, {
		detectSubjectType: (object) => object.__subjectType
	});
}
