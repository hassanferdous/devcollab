import { yupResolver } from "@hookform/resolvers/yup";
import { Link } from "@tanstack/react-router";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import * as yup from "yup";
import { Button } from "~/components/ui/button";
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "~/components/ui/form";
import { Input } from "~/components/ui/input";
import { useLogin } from "~/queries/use-auth";
import type { LoginFormData } from "~/types";

const schema = yup.object({
	email: yup.string().email("Invalid email").required("Email is required"),
	password: yup.string().required("Password is required"),
});

export function LoginForm() {
	const [showPassword, setShowPassword] = useState(false);
	const { mutate: login, isPending, error } = useLogin();

	const form = useForm<LoginFormData>({
		resolver: yupResolver(schema),
		defaultValues: { email: "admin@gmail.com", password: "user@123" },
	});

	const errorMessage = (
		error as { response?: { data?: { message?: string } } }
	)?.response?.data?.message;

	return (
		<Form {...form}>
			<form
				onSubmit={form.handleSubmit((data) => login(data))}
				className="space-y-4">
				{errorMessage && (
					<div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
						{errorMessage}
					</div>
				)}

				<FormField
					control={form.control}
					name="email"
					render={({ field }) => (
						<FormItem>
							<FormLabel>Email</FormLabel>
							<FormControl>
								<Input
									type="email"
									placeholder="you@example.com"
									autoComplete="email"
									{...field}
								/>
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>

				<FormField
					control={form.control}
					name="password"
					render={({ field }) => (
						<FormItem>
							<div className="flex items-center justify-between">
								<FormLabel>Password</FormLabel>
								<Link
									to="/forgot-password"
									className="text-xs text-primary hover:underline">
									Forgot password?
								</Link>
							</div>
							<FormControl>
								<div className="relative">
									<Input
										type={showPassword ? "text" : "password"}
										placeholder="••••••••"
										autoComplete="current-password"
										{...field}
									/>
									<Button
										type="button"
										variant="ghost"
										size="icon-sm"
										className="absolute right-1 top-1/2 -translate-y-1/2 text-muted-foreground"
										onClick={() => setShowPassword(!showPassword)}>
										{showPassword ? (
											<EyeOff className="size-4" />
										) : (
											<Eye className="size-4" />
										)}
									</Button>
								</div>
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>

				<Button type="submit" className="w-full" disabled={isPending}>
					{isPending && <Loader2 className="size-4 animate-spin" />}
					Sign in
				</Button>
			</form>
		</Form>
	);
}
