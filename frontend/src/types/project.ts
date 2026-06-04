import type { User } from "./auth";

export type MemberRole = "admin" | "member" | "viewer";

export interface Project {
	id: number;
	owner_id: number;
	name: string;
	description: string | null;
	status: "active" | "archived";
	created_at: string;
	updated_at: string;
	role?: MemberRole;
	isMember?: boolean;
}

export interface ProjectMember {
	user_id: number;
	role: MemberRole;
	joined_at: string;
	name: string;
	email: string;
}

export interface ProjectWithMembers extends Project {
	members: ProjectMember[];
}

export interface CreateProjectFormData {
	name: string;
	description: string;
	status: "active" | "archived";
}

export interface AddMemberFormData {
	userId: number;
	role: MemberRole;
}
