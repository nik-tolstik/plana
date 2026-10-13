import { useState } from "react";
import { PlusIcon } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useCreateTask } from "@/features/task-manage";
import { errorMessage } from "@/shared/lib/error-message";
import { Input } from "@/shared/ui";

interface QuickAddProps {
  /** Список по умолчанию для новых задач (для страниц списков). */
  defaultListId?: string;
  /** Дата по умолчанию для задач без даты (страницы «Сегодня»/«Завтра»). */
  defaultDueDate?: string;
}

/**
 * Поле быстрого ввода: текст целиком становится названием задачи.
 * Дата/приоритет/теги задаются в панели деталей; на страницах «Сегодня»/«Завтра»
 * новая задача получает дату страницы (чип под полем показывает это).
 */
export function QuickAdd({ defaultListId, defaultDueDate }: QuickAddProps) {
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const createTask = useCreateTask();
  const prefersReducedMotion = useReducedMotion();

  async function submit() {
    const title = text.trim();
    if (title.length === 0) {
      setError("Введите название задачи");
      return;
    }
    try {
      await createTask.mutateAsync({ title, dueDate: defaultDueDate, listId: defaultListId });
      setText("");
      setError(null);
    } catch (cause) {
      setError(errorMessage(cause));
    }
  }

  return (
    <div className="flex flex-col gap-1.5">
      <Input
        aria-label="Быстрое добавление задачи"
        prefix={<PlusIcon className="size-4" />}
        placeholder="Добавить задачу"
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
        {defaultDueDate ? (
          <motion.div
            key="default-date"
            className="flex flex-wrap gap-1 px-1"
            aria-hidden="true"
            initial={prefersReducedMotion ? false : { opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
          >
            <span className="rounded-md bg-surface-selected px-1.5 py-0.5 text-xs text-muted-foreground">
              {defaultDueDate.split("-").reverse().join(".")}
            </span>
          </motion.div>
        ) : null}
      </AnimatePresence>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
