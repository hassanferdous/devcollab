import { throwError } from "@/utils/error";
import { NextFunction, Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { MemberAbilityContext } from "../domains/v1/project/ability";
import { ProjectServices } from "../domains/v1/project/service";

/**
 * @description Check if user has permission to access the project
 *
 * @function projectAccess
 * @param {string} subject - Project or Task
 * @returns {Function} - Middleware function
 */

export const projectAccess = (
	subject: MemberAbilityContext["__subjectType"]
) => {
	return async (req: Request, _res: Response, next: NextFunction) => {
		const projectId = Number(req.params.projectId);
		if (!projectId)
			throwError(
				"Invalid request. Please provide a valid project ID.",
				StatusCodes.BAD_REQUEST
			);
		const user = req.user;
		const project = await ProjectServices.isMembership({
			userId: req.user!.id!,
			projectId
		});
		req.abilityContext = {
			isMember: project.isMember,
			project_id: projectId,
			user_id: user!.id!,
			role: project.role,
			__subjectType: subject
		};
		req.project = project;
		next();
	};
};
