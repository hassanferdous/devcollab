import { yupResolver } from "@hookform/resolvers/yup";
import { Loader2, MailQuestion, UserMinus, UserPlus } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import * as yup from "yup";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Button } from "~/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "~/components/ui/dialog";
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "~/components/ui/form";
import { Input } from "~/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "~/components/ui/select";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "~/components/ui/alert-dialog";
import { useManageMember } from "~/queries/use-projects";
import { userApi } from "~/lib/api/users";
import { useAuthStore } from "~/stores/auth";
import type {
	AddMemberFormData,
	MemberRole,
	ProjectMember,
	User,
} from "~/types";

const addMemberSchema = yup.object({
	userId: yup.number().required("User is required"),
	role: yup
		.mixed<MemberRole>()
		.oneOf(["admin", "member", "viewer"])
		.required("Role is required"),
});

function getInitials(name: string) {
	return name
		.split(" ")
		.map((n) => n[0])
		.join("")
		.toUpperCase()
		.slice(0, 2);
}

const roleBadge: Record<MemberRole, string> = {
	admin: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
	member: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
	viewer:
		"bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
};

interface ProjectMembersProps {
	projectId: number;
	members: ProjectMember[];
	canManage: boolean;
}

export function AddMemberDialog({
	projectId,
	children = (
		<Button size="sm" variant="outline">
			<UserPlus className="size-4" />
			Add member
		</Button>
	),
}: {
	projectId: number;
	children?: React.ReactNode;
}) {
	const [addOpen, setAddOpen] = useState(false);
	const [emailInput, setEmailInput] = useState("");
	const [results, setResults] = useState<User[]>([]);
	const [selectedUser, setSelectedUser] = useState<User | null>(null);
	const [notFound, setNotFound] = useState(false);
	const [searching, setSearching] = useState(false);
	const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const { mutate, isPending } = useManageMember(projectId);

	const form = useForm<AddMemberFormData>({
		resolver: yupResolver(addMemberSchema),
		defaultValues: { userId: 0, role: "member" },
	});

	const searchUsers = async (query: string) => {
		if (!query.trim()) {
			setResults([]);
			setNotFound(false);
			return;
		}
		setSearching(true);
		try {
			const res = await userApi.getAll({
				search: query.trim(),
				page: 1,
				limit: 5,
			});
			const users: User[] = res.data.data?.data ?? [];
			setResults(users);
			setNotFound(users.length === 0);
		} catch {
			setResults([]);
			setNotFound(true);
		} finally {
			setSearching(false);
		}
	};

	const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const val = e.target.value;
		setEmailInput(val);
		setSelectedUser(null);
		setNotFound(false);

		if (debounceRef.current) clearTimeout(debounceRef.current);
		debounceRef.current = setTimeout(() => searchUsers(val), 350);
	};

	useEffect(() => {
		return () => {
			if (debounceRef.current) clearTimeout(debounceRef.current);
		};
	}, []);

	const selectUser = (u: User) => {
		setSelectedUser(u);
		setEmailInput(u.email);
		setResults([]);
		form.setValue("userId", u.id);
	};

	const resetDialog = () => {
		setEmailInput("");
		setResults([]);
		setSelectedUser(null);
		setNotFound(false);
		form.reset();
	};

	const handleAddMember = (data: AddMemberFormData) => {
		mutate(
			{ action: "add", userId: data.userId, role: data.role },
			{
				onSuccess: () => {
					setAddOpen(false);
					resetDialog();
				},
			},
		);
	};

	return (
		<Dialog
			open={addOpen}
			onOpenChange={(o) => {
				setAddOpen(o);
				if (!o) resetDialog();
			}}>
			<DialogTrigger asChild>{children}</DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Add team member</DialogTitle>
				</DialogHeader>
				<Form {...form}>
					<form
						onSubmit={form.handleSubmit(handleAddMember)}
						className="space-y-4">
						{/* Email search */}
						<div className="relative">
							<div className="relative">
								<Input
									placeholder="Search by name or email..."
									value={emailInput}
									onChange={handleEmailChange}
									autoComplete="off"
								/>
								{searching && (
									<Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 size-4 animate-spin text-muted-foreground" />
								)}
							</div>

							{/* Dropdown results */}
							{results.length > 0 && !selectedUser && (
								<div className="absolute z-10 mt-1 w-full rounded-lg border bg-popover shadow-md overflow-hidden">
									{results.map((u) => (
										<button
											key={u.id}
											type="button"
											onClick={() => selectUser(u)}
											className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-accent transition-colors">
											<Avatar className="size-7 shrink-0">
												<AvatarImage src={u.avatar ?? undefined} />
												<AvatarFallback className="text-[10px]">
													{getInitials(u.name)}
												</AvatarFallback>
											</Avatar>
											<div className="min-w-0">
												<p className="text-sm font-medium truncate">
													{u.name}
												</p>
												<p className="text-xs text-muted-foreground truncate">
													{u.email}
												</p>
											</div>
										</button>
									))}
								</div>
							)}
						</div>

						{/* Selected user card */}
						{selectedUser && (
							<div className="flex items-center gap-3 rounded-lg border bg-muted/30 p-3">
								<Avatar className="size-8 shrink-0">
									<AvatarImage
										src={selectedUser.avatar ?? undefined}
									/>
									<AvatarFallback className="text-xs">
										{getInitials(selectedUser.name)}
									</AvatarFallback>
								</Avatar>
								<div className="min-w-0 flex-1">
									<p className="text-sm font-medium truncate">
										{selectedUser.name}
									</p>
									<p className="text-xs text-muted-foreground truncate">
										{selectedUser.email}
									</p>
								</div>
								<button
									type="button"
									onClick={resetDialog}
									className="text-xs text-muted-foreground hover:text-foreground shrink-0">
									Change
								</button>
							</div>
						)}

						{/* Not found — invite placeholder */}
						{notFound && emailInput.trim() && (
							<div className="flex items-center gap-3 rounded-lg border border-dashed p-3 text-muted-foreground">
								<MailQuestion className="size-5 shrink-0" />
								<div className="min-w-0">
									<p className="text-sm font-medium text-foreground truncate">
										{emailInput}
									</p>
									<p className="text-xs">
										Not registered — an invitation will be sent.
									</p>
								</div>
							</div>
						)}

						{/* Role */}
						<FormField
							control={form.control}
							name="role"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Role</FormLabel>
									<Select
										onValueChange={field.onChange}
										defaultValue={field.value}>
										<FormControl>
											<SelectTrigger>
												<SelectValue />
											</SelectTrigger>
										</FormControl>
										<SelectContent>
											<SelectItem value="admin">Admin</SelectItem>
											<SelectItem value="member">Member</SelectItem>
											<SelectItem value="viewer">Viewer</SelectItem>
										</SelectContent>
									</Select>
									<FormMessage />
								</FormItem>
							)}
						/>

						<div className="flex justify-end gap-2">
							<Button
								type="button"
								variant="outline"
								onClick={() => {
									setAddOpen(false);
									resetDialog();
								}}>
								Cancel
							</Button>
							<Button
								type="submit"
								disabled={isPending || (!selectedUser && !notFound)}>
								{isPending && (
									<Loader2 className="size-4 animate-spin" />
								)}
								{notFound ? "Send invitation" : "Add member"}
							</Button>
						</div>
					</form>
				</Form>
			</DialogContent>
		</Dialog>
	);
}

export function ProjectMembers({
	projectId,
	members,
	canManage,
}: ProjectMembersProps) {
	const [removeTarget, setRemoveTarget] = useState<ProjectMember | null>(null);
	const { mutate, isPending } = useManageMember(projectId);
	const { user: currentUser } = useAuthStore();

	console.log({ currentUser });

	const handleRemoveMember = () => {
		if (!removeTarget) return;
		mutate(
			{ action: "remove", userId: removeTarget.user_id },
			{ onSuccess: () => setRemoveTarget(null) },
		);
	};

	return (
		<div className="flex flex-col gap-3">
			{canManage && (
				<div className="flex justify-end">
					<AddMemberDialog projectId={projectId} />
				</div>
			)}

			<div className="divide-y divide-border rounded-lg border border-border">
				{members.map((member) => (
					<div
						key={member.user_id}
						className="flex items-center gap-3 px-4 py-3">
						<Avatar className="size-8 shrink-0">
							<AvatarImage src={undefined} />
							<AvatarFallback className="text-xs">
								{member.name ? getInitials(member.name) : "?"}
							</AvatarFallback>
						</Avatar>
						<div className="min-w-0 flex-1">
							<p className="truncate text-sm font-medium">
								{member.name ?? `User #${member.user_id}`}
							</p>
							<p className="truncate text-xs text-muted-foreground">
								{member.email}
							</p>
						</div>
						<span
							className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium capitalize ${roleBadge[member.role]}`}>
							{member.role}
						</span>
						{canManage && member.user_id !== currentUser?.id && (
							<Button
								variant="ghost"
								size="icon-xs"
								className="shrink-0 text-muted-foreground hover:text-destructive"
								onClick={() => setRemoveTarget(member)}>
								<UserMinus className="size-3.5" />
							</Button>
						)}
					</div>
				))}
				{members.length === 0 && (
					<p className="px-4 py-6 text-center text-sm text-muted-foreground">
						No members yet
					</p>
				)}
			</div>

			<AlertDialog
				open={!!removeTarget}
				onOpenChange={(o) => !o && setRemoveTarget(null)}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Remove member?</AlertDialogTitle>
						<AlertDialogDescription>
							This will remove{" "}
							<span className="font-medium text-foreground">
								{removeTarget?.name ?? `User #${removeTarget?.user_id}`}
							</span>{" "}
							from the project. They will lose access immediately.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction
							onClick={handleRemoveMember}
							className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
							{isPending ? (
								<Loader2 className="size-4 animate-spin" />
							) : (
								"Remove"
							)}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
}
