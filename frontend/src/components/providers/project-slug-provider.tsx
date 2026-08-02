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
	/** User ids currently typing in the project chat (excludes the current user). */
	typingUsers: number[];
	setTypingUsers: React.Dispatch<React.SetStateAction<number[]>>;
};

const ProjectContext = createContext<ProjectContextType | null>(null);

export const ProjectSlugProvider = ({
	slug,
	project,
	effectiveRole,
	members,
	children,
}: Omit<
	ProjectContextType,
	"onlineUsers" | "setOnlineUsers" | "typingUsers" | "setTypingUsers"
> & {
	children: React.ReactNode;
}) => {
	const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
	const [typingUsers, setTypingUsers] = useState<number[]>([]);

	return (
		<ProjectContext.Provider
			value={{
				slug,
				project,
				effectiveRole,
				members,
				onlineUsers,
				setOnlineUsers,
				typingUsers,
				setTypingUsers,
			}}>
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
