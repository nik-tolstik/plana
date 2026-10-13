/** Состояние инлайн-ввода списка задач: какая строка и в каком режиме. */
export interface TaskEditingState {
  taskId: string;
  mode: "title" | "new-task" | "new-subtask";
}

export type TaskEditMode = TaskEditingState["mode"];
