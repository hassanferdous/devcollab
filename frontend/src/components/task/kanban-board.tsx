import {
	DndContext,
	DragEndEvent,
	DragOverEvent,
	DragOverlay,
	DragStartEvent,
	MouseSensor,
	TouchSensor,
	pointerWithin,
	rectIntersection,
	useSensor,
	useSensors,
	type CollisionDetection,
} from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
	useCreateTask,
	useDeleteTask,
	useUpdateTask,
} from "~/queries/use-tasks";
import { useProjectSocket } from "~/hooks/use-project-socket";
import type { Task, TaskStatus, UpdateTaskFormData } from "~/types";
import { KanbanColumn } from "./kanban-column";
import { TaskCard } from "./task-card";
import { TaskDetail } from "./task-detail";
import { useProjectContext } from "../providers/project-slug-provider";

const COLUMNS: TaskStatus[] = ["pending", "in_progress", "completed"];

const collisionDetection: CollisionDetection = (args) => {
	const pointerCollisions = pointerWithin(args);
	if (pointerCollisions.length > 0) return pointerCollisions;
	return rectIntersection(args);
};

interface KanbanBoardProps {
	tasks: Task[];
}

export function KanbanBoard({ tasks: initialTasks }: KanbanBoardProps) {
	const { slug: projectId } = useProjectContext();
	const [tasks, setTasks] = useState<Task[]>(initialTasks);
	const [activeTask, setActiveTask] = useState<Task | null>(null);
	const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);

	useEffect(() => {
		setTasks(initialTasks);
	}, [initialTasks]);

	useProjectSocket(projectId);

	const { mutate: createTask, isPending: isCreating } =
		useCreateTask(projectId);
	const { mutate: updateTask, isPending: isUpdating } =
		useUpdateTask(projectId);
	const { mutate: deleteTask } = useDeleteTask(projectId);

	const sensors = useSensors(
		useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
		useSensor(TouchSensor, {
			activationConstraint: { delay: 200, tolerance: 8 },
		}),
	);

	function getColumnForId(id: string | number): TaskStatus | null {
		if (COLUMNS.includes(id as TaskStatus)) return id as TaskStatus;
		const task = tasks.find((t) => t.id === id);
		return task?.status ?? null;
	}

	const tasksByStatus = COLUMNS.reduce(
		(acc, status) => {
			acc[status] = tasks.filter((t) => t.status === status);
			return acc;
		},
		{} as Record<TaskStatus, Task[]>,
	);

	const handleDragStart = (event: DragStartEvent) => {
		const task = tasks.find((t) => t.id === event.active.id);
		setActiveTask(task ?? null);
	};

	const handleDragOver = (event: DragOverEvent) => {
		const { active, over } = event;
		if (!over || active.id === over.id) return;

		const activeColumn = getColumnForId(active.id);
		const overColumn = getColumnForId(over.id);

		if (!activeColumn || !overColumn || activeColumn === overColumn) return;

		setTasks((prev) =>
			prev.map((t) =>
				t.id === active.id ? { ...t, status: overColumn } : t,
			),
		);
	};

	const handleDragEnd = (event: DragEndEvent) => {
		const { active, over } = event;
		setActiveTask(null);

		if (!over || active.id === over.id) return;

		const activeTaskId = active.id as number;
		const activeTask = tasks.find((t) => t.id === activeTaskId);
		if (!activeTask) return;

		const overColumn = getColumnForId(over.id);
		if (!overColumn) return;

		const originalStatus = initialTasks.find(
			(t) => t.id === activeTaskId,
		)?.status;

		if (activeTask.status !== originalStatus) {
			updateTask(
				{ taskId: activeTaskId, data: { status: activeTask.status } },
				{
					onError: () => {
						setTasks(initialTasks);
						toast.error("Failed to move task");
					},
				},
			);
		} else if (overColumn === activeTask.status) {
			const column = tasksByStatus[activeTask.status];
			const oldIndex = column.findIndex((t) => t.id === activeTaskId);
			const newIndex = column.findIndex((t) => t.id === over.id);
			if (oldIndex !== newIndex && newIndex !== -1) {
				const reordered = arrayMove(column, oldIndex, newIndex);
				setTasks((prev) => {
					const others = prev.filter(
						(t) => t.status !== activeTask.status,
					);
					return [...others, ...reordered];
				});
			}
		}
	};

	const handleCreateTask =
		(status: TaskStatus) =>
		(data: { title: string; description: string }) => {
			createTask(data, {
				onSuccess: (res) => {
					// const newTask: Task = { ...res.data.data, status };
					// setTasks((prev) => [...prev, newTask]);
					toast.success("Task created");
				},
				onError: () => toast.error("Failed to create task"),
			});
		};

	const handleUpdateTask = (taskId: number, data: UpdateTaskFormData) => {
		updateTask(
			{ taskId, data },
			{
				onSuccess: (res) => {
					const updated: Task = res.data.data;
					setTasks((prev) =>
						prev.map((t) => (t.id === taskId ? updated : t)),
					);
				},
				onError: () => toast.error("Failed to update task"),
			},
		);
	};

	const handleDeleteTask = (taskId: number) => {
		setTasks((prev) => prev.filter((t) => t.id !== taskId));
		deleteTask(taskId, {
			onSuccess: () => toast.success("Task deleted"),
			onError: () => {
				setTasks(initialTasks);
				toast.error("Failed to delete task");
			},
		});
	};

	const selectedTask =
		selectedTaskId !== null
			? (tasks.find((t) => t.id === selectedTaskId) ?? null)
			: null;

	return (
		<>
			<DndContext
				sensors={sensors}
				collisionDetection={collisionDetection}
				onDragStart={handleDragStart}
				onDragOver={handleDragOver}
				onDragEnd={handleDragEnd}>
				<div className="flex gap-3 overflow-x-auto px-0.5 py-1">
					{COLUMNS.map((status) => (
						<KanbanColumn
							key={status}
							status={status}
							tasks={tasksByStatus[status]}
							onCreateTask={handleCreateTask(status)}
							onOpenTask={setSelectedTaskId}
							isCreating={isCreating}
						/>
					))}
				</div>

				<DragOverlay dropAnimation={{ duration: 150, easing: "ease" }}>
					{activeTask && (
						<div className="rotate-2 scale-105 opacity-95 drop-shadow-xl">
							<TaskCard task={activeTask} onOpen={() => {}} />
						</div>
					)}
				</DragOverlay>
			</DndContext>

			{selectedTask && (
				<TaskDetail
					task={selectedTask}
					open={!!selectedTask}
					onOpenChange={(open) => {
						if (!open) setSelectedTaskId(null);
					}}
					onUpdate={handleUpdateTask}
					onDelete={handleDeleteTask}
					isUpdating={isUpdating}
				/>
			)}
		</>
	);
}
