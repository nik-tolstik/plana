/** Состояние инлайн-ввода списка задач: какая строка и в каком режиме. */
export interface TaskEditingState {
  taskId: string;
  mode: "title" | "new-task" | "new-subtask";
  /** Позиция каретки в названии при входе в правку (индекс символа клика). */
  titleCaret?: number;
}

export type TaskEditMode = TaskEditingState["mode"];
