import { UserServices } from "@domains/v1/user/service";
import bcrypt from "bcrypt";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";

// Local Strategy
passport.use(
	new LocalStrategy(
		{ usernameField: "email", passwordField: "password" },
		async function (email, password, cb) {
			const user = await UserServices.findByEmail(email);
			if (!user) {
				return cb(null, false, { message: "Incorrect email or password." });
			}
			// OAuth-only users (e.g. Google) have no password_hash and must not
			// be able to authenticate via the local (password) strategy.
			if (!user.password_hash) {
				return cb(null, false, { message: "Incorrect email or password." });
			}
			const isMatched = await bcrypt.compare(password, user.password_hash);
			if (!isMatched) {
				return cb({ message: "Incorrect email or password." }, false, {
					message: "Incorrect email or password."
				});
			}
			// eslint-disable-next-line @typescript-eslint/no-unused-vars
			const { password_hash, ...sanitizedUser } = user;
			return cb(null, sanitizedUser);
		}
	)
);
