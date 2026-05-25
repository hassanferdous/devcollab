import { config } from "@/config";
import jwt from "jsonwebtoken";

export default class JWT {
	static generateToken(payload: object, type: "access" | "refresh") {
		if (type === "access") {
			return jwt.sign(payload, config.env.JWT_ACCESS_SECRET, {
				expiresIn: config.env
					.JWT_ACCESS_EXPIRES_IN as jwt.SignOptions["expiresIn"]
			});
		} else {
			return jwt.sign(payload, config.env.JWT_REFRESH_SECRET, {
				expiresIn: config.env
					.JWT_REFRESH_EXPIRES_IN as jwt.SignOptions["expiresIn"]
			});
		}
	}

	static verifyToken(token: string, type: "access" | "refresh") {
		if (type === "access") {
			return jwt.verify(token, config.env.JWT_ACCESS_SECRET);
		} else {
			return jwt.verify(token, config.env.JWT_REFRESH_SECRET);
		}
	}

	static decodeToken(token: string) {
		return jwt.decode(token);
	}

	static getPayload(token: string) {
		return jwt.verify(token, config.env.JWT_ACCESS_SECRET);
	}
}
