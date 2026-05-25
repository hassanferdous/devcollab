import { CookieOptions, Request, Response } from "express";

export class CookieUtil {
	static setCookie(
		res: Response,
		name: string,
		value: string,
		options: CookieOptions
	) {
		res.cookie(name, value, options);
	}

	static getCookie(req: Request, name: string) {
		return req.cookies[name];
	}

	static clearCookie(res: Response, name: string) {
		res.clearCookie(name);
	}

	static clearAllCookies(req: Request, res: Response) {
		const $cookies = req.cookies;
		Object.keys($cookies).forEach((key) => {
			res.clearCookie(key);
		});
	}
}
