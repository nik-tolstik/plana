/**
 * MIME-типы dataTransfer перетаскиваемых сущностей. Отличают дроп задачи
 * (перенос в другой список через сайдбар) от дропа списка при сортировке;
 * подзадача несёт свой MIME, чтобы приёмники понимали, что сначала
 * нужен promote в отдельную задачу.
 */
export const TASK_DRAG_MIME = "application/x-plana-task";
export const SUBTASK_DRAG_MIME = "application/x-plana-subtask";

export interface SubtaskDragPayload {
  subtaskId: string;
  /** Родитель — чтобы не вкладывать подзадачу обратно в него же. */
  parentTaskId: string;
}

export function encodeSubtaskDrag(payload: SubtaskDragPayload): string {
  return JSON.stringify(payload);
}

export function decodeSubtaskDrag(raw: string): SubtaskDragPayload | null {
  try {
    const parsed = JSON.parse(raw) as Partial<SubtaskDragPayload>;
    if (typeof parsed.subtaskId === "string" && typeof parsed.parentTaskId === "string") {
      return { subtaskId: parsed.subtaskId, parentTaskId: parsed.parentTaskId };
    }
  } catch {
    // чужие/битые данные — просто не дропаем
  }
  return null;
}
