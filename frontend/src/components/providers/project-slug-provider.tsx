import { createContext, useContext, useState } from "react";
import type { MemberRole, Project, ProjectMember } from "~/types";

export interface OnlineUser {
	id: number;
	name: string | null;
	email: string;
	avatar: string | null;
}

type ProjectContextType = {
	slug: number;
	project: Project;
	effectiveRole?: MemberRole;
	members?: ProjectMember[];
	onlineUsers: OnlineUser[];
	setOnlineUsers: React.Dispatch<React.SetStateAction<OnlineUser[]>>;
};

const ProjectContext = createContext<ProjectContextType | null>(null);

export const ProjectSlugProvider = ({
	slug,
	project,
	effectiveRole,
	members,
	children,
}: Omit<ProjectContextType, "onlineUsers" | "setOnlineUsers"> & {
	children: React.ReactNode;
}) => {
	const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);

	return (
		<ProjectContext.Provider
			value={{ slug, project, effectiveRole, members, onlineUsers, setOnlineUsers }}>
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
