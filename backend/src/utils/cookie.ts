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

	static parseCookieString(cookieString: string | undefined): Record<string, string> {
		const cookies: Record<string, string> = {};
		if (!cookieString) return cookies;
		cookieString.split(";").forEach((cookie) => {
			const parts = cookie.split("=");
			const name = parts[0].trim();
			const value = parts.slice(1).join("=").trim();
			if (name) {
				cookies[name] = decodeURIComponent(value);
			}
		});
		return cookies;
	}
}
