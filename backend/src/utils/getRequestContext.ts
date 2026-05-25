import { MemberAbilityContext } from "@/domains/v1/project/ability";
import { throwError } from "@/utils/error";
import { StatusCodes } from "http-status-codes";
import { Request } from "express";
export function getRequestContext(req: Request): MemberAbilityContext {
	if (!req.abilityContext) {
		throwError(
			"Unauthorized: Ability context missing",
			StatusCodes.UNAUTHORIZED
		);
	}
	return req.abilityContext;
}
