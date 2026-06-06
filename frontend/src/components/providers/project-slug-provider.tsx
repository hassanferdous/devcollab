import { createContext, useContext } from "react";
import type { MemberRole, Project, ProjectMember } from "~/types";

type ProjectContextType = {
	slug: number;
	project: Project;
	effectiveRole?: MemberRole;
	members?: ProjectMember[];
};

const ProjectContext = createContext<ProjectContextType | null>(null);

export const ProjectSlugProvider = ({
	slug,
	project,
	effectiveRole,
	members,
	children,
}: ProjectContextType & {
	children: React.ReactNode;
}) => {
	return (
		<ProjectContext.Provider
			value={{ slug, project, effectiveRole, members }}>
			{children}
		</ProjectContext.Provider>
	);
};

export const useProjectContext = () => {
	const context = useContext(ProjectContext);
	if (!context) {
		throw new Error(
			"useProjectContext must be used within a ProjectProvider",
		);
	}
	return context;
};
