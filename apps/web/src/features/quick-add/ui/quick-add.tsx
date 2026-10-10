import { useMemo, useState } from "react";
import { parseQuickAdd, rruleValueLabel, TASK_PRIORITY_LABELS_RU } from "@plana/shared";
import { useUserTimezone } from "@/entities/task";
import { useCreateTask } from "@/features/task-manage";
import { errorMessage } from "@/shared/lib/error-message";

interface QuickAddProps {
  /** Список по умолчанию для новых задач (для страниц списков). */
  defaultListId?: string;
}

/** Поле быстрого ввода: разбирает даты/время/приоритет на лету (shared parseQuickAdd). */
export function QuickAdd({ defaultListId }: QuickAddProps) {
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const timezone = useUserTimezone();
  const createTask = useCreateTask();

  const parsed = useMemo(
    () =>
      text.trim().length > 0 ? parseQuickAdd(text, { now: new Date(), timeZone: timezone }) : null,
    [text, timezone],
  );

  async function submit() {
    if (!parsed || parsed.title.length === 0) {
      setError("Введите название задачи");
      return;
    }
    try {
      await createTask.mutateAsync({
        title: parsed.title,
        dueDate: parsed.dueDate ?? undefined,
        dueTime: parsed.dueTime ?? undefined,
        rrule: parsed.rrule ?? undefined,
        priority: parsed.priority === "none" ? undefined : parsed.priority,
        listId: defaultListId,
        // Хештеги «#тег» из строки быстрого ввода.
        tagNames: parsed.tags.length > 0 ? parsed.tags : undefined,
      });
      setText("");
      setError(null);
    } catch (cause) {
      setError(errorMessage(cause));
    }
  }

  const chips: string[] = [];
  if (parsed?.dueDate) chips.push(parsed.dueDate.split("-").reverse().join("."));
  if (parsed?.dueTime) chips.push(parsed.dueTime);
  if (parsed?.rrule) chips.push(`↻ ${rruleValueLabel(parsed.rrule)}`);
  if (parsed && parsed.priority !== "none") chips.push(TASK_PRIORITY_LABELS_RU[parsed.priority]);
  if (parsed) chips.push(...parsed.tags.map((tag) => `#${tag}`));

  return (
    <div className="quick-add">
      <input
        aria-label="Быстрое добавление задачи"
        className="quick-add-input"
        placeholder="Добавить задачу: «Созвон завтра в 17 !!»"
        value={text}
        onChange={(event) => setText(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            void submit();
          }
          if (event.key === "Escape") {
            setText("");
            setError(null);
          }
        }}
      />
      {chips.length > 0 && (
        <div className="quick-add-preview" aria-hidden="true">
          {chips.map((chip) => (
            <span className="chip" key={chip}>
              {chip}
            </span>
          ))}
        </div>
      )}
      {error && <p className="quick-add-error">{error}</p>}
    </div>
  );
}
