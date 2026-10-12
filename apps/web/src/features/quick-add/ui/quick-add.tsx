import { useMemo, useState } from "react";
import { PlusIcon } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { parseQuickAdd, rruleValueLabel, TASK_PRIORITY_LABELS_RU } from "@plana/shared";
import { useUserTimezone } from "@/entities/task";
import { useCreateTask } from "@/features/task-manage";
import { errorMessage } from "@/shared/lib/error-message";
import { Input } from "@/shared/ui";

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
  const prefersReducedMotion = useReducedMotion();

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
  if (parsed?.rrule) chips.push(rruleValueLabel(parsed.rrule));
  if (parsed && parsed.priority !== "none") chips.push(TASK_PRIORITY_LABELS_RU[parsed.priority]);
  if (parsed) chips.push(...parsed.tags.map((tag) => `#${tag}`));

  return (
    <div className="flex flex-col gap-1.5">
      <Input
        aria-label="Быстрое добавление задачи"
        prefix={<PlusIcon className="size-4" />}
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
      <AnimatePresence initial={false}>
        {chips.length > 0 ? (
          <motion.div
            key="chips"
            className="flex flex-wrap gap-1 px-1"
            aria-hidden="true"
            initial={prefersReducedMotion ? false : { opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
          >
            {chips.map((chip) => (
              <span
                className="rounded-md bg-surface-selected px-1.5 py-0.5 text-xs text-muted-foreground"
                key={chip}
              >
                {chip}
              </span>
            ))}
          </motion.div>
        ) : null}
      </AnimatePresence>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
