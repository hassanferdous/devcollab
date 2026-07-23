import { PaginationMeta } from "@/utils/response";
import { JwtPayload } from "jsonwebtoken";
declare global {
	namespace Express {
		interface Request {
			// Marking these as optional because not every route uses this middleware
			abilityContext?: MemberAbilityContext;
			project?: ProjectWithMember;
			user?: User & JwtPayload; // Adjust to your actual user type
		}
	}
}

export interface Paginated<T> {
	data: T[];
	pagination?: PaginationMeta;
}
