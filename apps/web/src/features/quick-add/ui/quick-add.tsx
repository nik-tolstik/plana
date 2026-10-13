import { useState } from "react";
import { CalendarIcon, CheckIcon, ChevronDownIcon, FlagIcon, PlusIcon } from "lucide-react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { TASK_PRIORITIES, TASK_PRIORITY_LABELS_RU, type TaskPriority } from "@plana/shared";
import { useTagsQuery } from "@/entities/tag";
import { useCreateTask } from "@/features/task-manage";
import { errorMessage } from "@/shared/lib/error-message";
import { cn } from "@/shared/lib/cn";
import { DateTimePicker, ENTITY_COLORS, Input, Popover } from "@/shared/ui";
import { PRIORITY_CLASS } from "@/shared/lib/priority-class";

interface QuickAddProps {
  listId?: string;
  /** Дата по умолчанию для задач без даты (страницы «Сегодня»/«Завтра»). */
  defaultDueDate?: string;
}

function parseDay(day: string | undefined): Date | undefined {
  if (!day) return undefined;
  const date = new Date(`${day}T00:00`);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function toDay(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Поле быстрого ввода: текст становится названием, настройки новой задачи —
 * в поповере справа (дата, приоритет, теги). После создания настройки
 * сбрасываются к дате страницы.
 */
export function QuickAdd({ listId, defaultDueDate }: QuickAddProps) {
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  // Дата страницы — базовое значение и значение сброса после создания.
  const [date, setDate] = useState<Date | undefined>(() => parseDay(defaultDueDate));
  const [priority, setPriority] = useState<TaskPriority>("none");
  const [tagNames, setTagNames] = useState<string[]>([]);
  const createTask = useCreateTask();
  const tagsQuery = useTagsQuery();
  const allTags = tagsQuery.data ?? [];

  async function submit() {
    const title = text.trim();
    if (title.length === 0) {
      setError("Введите название задачи");
      return;
    }
    try {
      await createTask.mutateAsync({
        title,
        dueDate: date ? toDay(date) : undefined,
        priority: priority === "none" ? undefined : priority,
        tagNames: tagNames.length > 0 ? tagNames : undefined,
        listId,
      });
      setText("");
      setError(null);
      setDate(parseDay(defaultDueDate));
      setPriority("none");
      setTagNames([]);
    } catch (cause) {
      setError(errorMessage(cause));
    }
  }

  const toggleTag = (name: string) => {
    setTagNames((current) =>
      current.some((selected) => selected.toLowerCase() === name.toLowerCase())
        ? current.filter((selected) => selected !== name)
        : [...current, name],
    );
  };

  const settingsActive = date !== undefined || priority !== "none" || tagNames.length > 0;

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
        suffix={
          <Popover
            placement="bottom-end"
            className="flex w-72 flex-col gap-2 p-2"
            trigger={({ onClick, ...triggerProps }) => (
              <button
                {...triggerProps}
                type="button"
                className={cn(
                  "flex h-7 cursor-pointer items-center gap-1 rounded-md px-1.5 text-xs transition-colors hover:bg-surface-control-hover",
                  settingsActive ? "text-primary-text" : "text-muted-foreground",
                )}
                aria-label="Настройки новой задачи"
                onClick={onClick}
              >
                <CalendarIcon aria-hidden className="size-3.5" />
                <span className="max-w-20 truncate">
                  {date ? format(date, "d MMM", { locale: ru }) : "Дата"}
                </span>
                <ChevronDownIcon aria-hidden className="size-3.5" />
              </button>
            )}
          >
            <div onClick={(event) => event.stopPropagation()}>
              <p className="px-2 pb-1 text-xs font-medium text-muted-foreground">Дата</p>
              <DateTimePicker inline showTime={false} clearable date={date} onSelect={setDate} />
              <div className="my-1 h-px bg-border" />
              <p className="px-2 pb-1 text-xs font-medium text-muted-foreground">Приоритет</p>
              <div className="flex flex-col gap-0.5">
                {TASK_PRIORITIES.map((value) => (
                  <button
                    key={value}
                    type="button"
                    role="menuitemradio"
                    aria-checked={value === priority}
                    className="flex min-h-8 cursor-pointer items-center gap-2 rounded-md px-2 py-1 text-left text-sm hover:bg-option-hover"
                    onClick={() => setPriority(value)}
                  >
                    <FlagIcon
                      aria-hidden
                      className={cn(
                        "size-4 shrink-0 fill-current",
                        value === priority ? PRIORITY_CLASS[value] : "text-muted-foreground",
                      )}
                    />
                    <span className="min-w-0 flex-1">{TASK_PRIORITY_LABELS_RU[value]}</span>
                    {value === priority ? (
                      <CheckIcon aria-hidden className="size-4 shrink-0 text-primary-text" />
                    ) : null}
                  </button>
                ))}
              </div>
              <div className="my-1 h-px bg-border" />
              <p className="px-2 pb-1 text-xs font-medium text-muted-foreground">Теги</p>
              <div
                className="flex max-h-40 flex-col gap-0.5 overflow-y-auto"
                role="listbox"
                aria-multiselectable
              >
                {allTags.map((tag) => {
                  const selected = tagNames.some(
                    (name) => name.toLowerCase() === tag.name.toLowerCase(),
                  );
                  return (
                    <button
                      key={tag.id}
                      type="button"
                      role="option"
                      aria-selected={selected}
                      className={cn(
                        "flex min-h-8 cursor-pointer items-center gap-2 rounded-md px-2 py-1 text-left text-sm hover:bg-option-hover",
                        selected && "bg-option-selected",
                      )}
                      onClick={() => toggleTag(tag.name)}
                    >
                      <span
                        aria-hidden
                        className="size-2 shrink-0 rounded-full"
                        style={{ background: ENTITY_COLORS[tag.color] }}
                      />
                      <span className="min-w-0 flex-1 truncate">{tag.name}</span>
                      {selected ? (
                        <CheckIcon aria-hidden className="size-4 shrink-0 text-primary-text" />
                      ) : null}
                    </button>
                  );
                })}
                {allTags.length === 0 ? (
                  <p className="px-2 py-1.5 text-sm text-muted-foreground">Нет тегов</p>
                ) : null}
              </div>
            </div>
          </Popover>
        }
      />
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
