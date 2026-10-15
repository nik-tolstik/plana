import { CheckIcon, FlagIcon } from "lucide-react";
import type { ReactNode } from "react";
import { TASK_PRIORITIES, type PatchTaskDto, type TaskDto } from "@plana/shared";
import { useTagsQuery } from "@/entities/tag";
import { cn } from "@/shared/lib/cn";
import { PRIORITY_CLASS } from "@/shared/lib/priority-class";
import { TASK_PRIORITY_LABELS_RU } from "@/shared/lib/priority-labels";
import { DateTimePicker, ENTITY_COLORS, Popover } from "@/shared/ui";

interface TaskChipProps {
  task: TaskDto;
  onPatch: (input: PatchTaskDto) => void;
}

/**
 * Барьер всплытия кликов внутри чипового поповера: контент рендерится
 * в портал, но React-синтетика всплывает «виртуально» к триггеру в строке
 * задачи — без барьера выбор значения открывал бы панель деталей.
 */
function ChipPopoverBody({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div className={className} onClick={(event) => event.stopPropagation()}>
      {children}
    </div>
  );
}

/**
 * Чипы строки задачи: тег/дата/приоритет открывают поповер быстрой смены.
 * Все триггеры гасят всплытие — клик по чипу не открывает панель деталей.
 */

export function TaskTagsChip({ task, onPatch }: TaskChipProps) {
  const tagsQuery = useTagsQuery();
  const allTags = tagsQuery.data ?? [];
  const selectedNames = task.tags.map((tag) => tag.name);

  if (task.tags.length === 0) return null;

  const toggle = (name: string) => {
    const exists = selectedNames.some((selected) => selected.toLowerCase() === name.toLowerCase());
    const next = exists
      ? selectedNames.filter((selected) => selected !== name)
      : [...selectedNames, name];
    onPatch({ tagNames: next });
  };

  return (
    <Popover
      placement="bottom-end"
      trigger={({ onClick, ...triggerProps }) => (
        <button
          {...triggerProps}
          type="button"
          data-task-chip
          aria-label="Изменить теги"
          className="hidden shrink-0 cursor-pointer gap-1 rounded-md px-0.5 py-0.5 transition-colors hover:bg-control-hover sm:inline-flex"
          onClick={(event) => {
            event.stopPropagation();
            onClick?.(event);
          }}
        >
          {task.tags.map((tag) => (
            <span
              className="inline-flex items-center gap-1 rounded-md bg-muted px-1.5 py-0.5 text-xs text-muted-foreground"
              key={tag.id}
            >
              <span
                aria-hidden
                className="size-1.5 rounded-full"
                style={{ background: ENTITY_COLORS[tag.color] }}
              />
              {tag.name}
            </span>
          ))}
        </button>
      )}
    >
      <ChipPopoverBody className="flex w-56 flex-col gap-0.5 p-2">
        <p className="px-2 pb-1 text-xs font-medium text-muted-foreground">Теги</p>
        <div
          className="flex max-h-64 flex-col gap-0.5 overflow-y-auto"
          role="listbox"
          aria-multiselectable
        >
          {allTags.map((tag) => {
            const selected = selectedNames.some(
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
                onClick={() => toggle(tag.name)}
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
      </ChipPopoverBody>
    </Popover>
  );
}

/**
 * Чип даты: календарь с быстрыми пресетами прямо в поповере.
 * Время не показываем — меняется в панели деталей; при смене дня
 * существующее время задачи сохраняется.
 */
export function TaskDateChip({
  task,
  overdue,
  label,
  onPatch,
}: TaskChipProps & { overdue: boolean; label: string | null }) {
  if (label === null) return null;
  const date =
    task.dueDate !== null
      ? new Date(`${task.dueDate}T${task.dueTime !== null ? task.dueTime : "00:00"}`)
      : undefined;

  function handleSelect(next: Date | undefined) {
    if (!next) {
      onPatch({ dueDate: null, dueTime: null });
      return;
    }
    const year = next.getFullYear();
    const month = String(next.getMonth() + 1).padStart(2, "0");
    const day = String(next.getDate()).padStart(2, "0");
    onPatch({ dueDate: `${year}-${month}-${day}`, dueTime: task.dueTime ?? null });
  }

  return (
    <Popover
      placement="bottom-end"
      className="w-auto overflow-hidden p-0"
      trigger={({ onClick, ...triggerProps }) => (
        <button
          {...triggerProps}
          type="button"
          data-task-chip
          aria-label="Изменить дату"
          title="Изменить дату"
          className={cn(
            "shrink-0 cursor-pointer rounded-md px-1 py-0.5 text-xs transition-colors hover:bg-control-hover hover:text-foreground",
            overdue ? "font-medium text-destructive" : "text-muted-foreground",
          )}
          onClick={(event) => {
            event.stopPropagation();
            onClick?.(event);
          }}
        >
          {label}
        </button>
      )}
    >
      <ChipPopoverBody>
        <DateTimePicker inline showTime={false} date={date} clearable onSelect={handleSelect} />
      </ChipPopoverBody>
    </Popover>
  );
}

export function TaskPriorityChip({ task, onPatch }: TaskChipProps) {
  if (task.priority === "none") return null;

  return (
    <Popover
      placement="bottom-end"
      trigger={({ onClick, ...triggerProps }) => (
        <button
          {...triggerProps}
          type="button"
          data-task-chip
          aria-label="Изменить приоритет"
          title={TASK_PRIORITY_LABELS_RU[task.priority]}
          className="shrink-0 cursor-pointer rounded-md p-1 transition-colors hover:bg-control-hover"
          onClick={(event) => {
            event.stopPropagation();
            onClick?.(event);
          }}
        >
          <FlagIcon className={cn("size-3.5 fill-current", PRIORITY_CLASS[task.priority])} />
        </button>
      )}
    >
      {({ close }) => (
        <ChipPopoverBody className="flex w-48 flex-col gap-0.5 p-2">
          <p className="px-2 pb-1 text-xs font-medium text-muted-foreground">Приоритет</p>
          {TASK_PRIORITIES.map((priority) => (
            <button
              key={priority}
              type="button"
              role="menuitemradio"
              aria-checked={priority === task.priority}
              className="flex min-h-8 cursor-pointer items-center gap-2 rounded-md px-2 py-1 text-left text-sm hover:bg-option-hover"
              onClick={() => {
                onPatch({ priority });
                close();
              }}
            >
              <FlagIcon
                aria-hidden
                className={cn(
                  "size-4 shrink-0 fill-current",
                  priority === task.priority ? PRIORITY_CLASS[priority] : "text-muted-foreground",
                )}
              />
              <span className="min-w-0 flex-1">{TASK_PRIORITY_LABELS_RU[priority]}</span>
              {priority === task.priority ? (
                <CheckIcon aria-hidden className="size-4 shrink-0 text-primary-text" />
              ) : null}
            </button>
          ))}
        </ChipPopoverBody>
      )}
    </Popover>
  );
}
