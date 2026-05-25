import { config } from "@/config";
import { UserServices } from "@domains/v1/user/service";
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";

passport.use(
	new GoogleStrategy(
		{
			clientID: config.env.GOOGLE_CLIENT_ID,
			clientSecret: config.env.GOOGLE_CLIENT_SECRET,
			callbackURL: `http://localhost:8000/api/v1/auth/google/callback`, // Callback URL
			scope: ["profile", "email"]
		},
		async (_accessToken, _refreshToken, profile, cb) => {
			try {
				const user = await UserServices.findByEmail(
					profile._json.email as string
				);
				if (user) return cb(null, user);
				const newUser = await UserServices.create({
					name: profile._json.name,
					avatar: profile._json.picture,
					email: profile._json.email as string,
					provider: profile.provider,
					password_hash: ""
				});
				return cb(null, newUser);
			} catch (err) {
				return cb(err as Error, false);
			}
		}
	)
);
