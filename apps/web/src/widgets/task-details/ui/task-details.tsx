import { useEffect, useMemo, useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { XIcon } from "lucide-react";
import {
  TASK_PRIORITIES,
  TASK_PRIORITY_LABELS_RU,
  rruleValueLabel,
  todayInZone,
  type TaskDto,
  type TaskPriority,
} from "@plana/shared";
import { useSectionsQuery, useSidebarQuery } from "@/entities/list";
import { useTagsQuery } from "@/entities/tag";
import { useUserTimezone } from "@/entities/task";
import { useCompleteTask, useUncompleteTask, useUpdateTask } from "@/features/task-manage";
import { errorMessage } from "@/shared/lib/error-message";
import {
  Button,
  Checkbox,
  ColorDot,
  DateTimePicker,
  EntityMarker,
  Input,
  Label,
  MultiSelect,
  Select,
  Textarea,
} from "@/shared/ui";

interface TaskDetailsProps {
  task: TaskDto;
  onClose: () => void;
}

/** Пресеты повтора; value — каноническая RRULE-строка, "" = без повтора. */
const REPEAT_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "", label: "Без повтора" },
  { value: "FREQ=DAILY", label: "Каждый день" },
  { value: "FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR", label: "По будням" },
  { value: "FREQ=WEEKLY;BYDAY=SA,SU", label: "По выходным" },
  { value: "FREQ=WEEKLY", label: "Каждую неделю" },
  { value: "FREQ=MONTHLY", label: "Каждый месяц" },
  { value: "FREQ=YEARLY", label: "Каждый год" },
];

/** Задержка автосохранения после последнего изменения, мс. */
const AUTOSAVE_DELAY_MS = 600;

interface DetailsFormState {
  title: string;
  description: string;
  dueDate: string;
  dueTime: string;
  priority: TaskPriority;
  pinned: boolean;
  listId: string;
  sectionId: string;
  rrule: string;
  tagNames: string[];
}

function formFromTask(task: TaskDto): DetailsFormState {
  return {
    title: task.title,
    description: task.description,
    dueDate: task.dueDate ?? "",
    dueTime: task.dueTime?.slice(0, 5) ?? "",
    priority: task.priority,
    pinned: task.pinned,
    listId: task.listId,
    sectionId: task.sectionId ?? "",
    rrule: task.rrule ?? "",
    tagNames: task.tags.map((tag) => tag.name),
  };
}

/** Diff формы с задачей → PATCH-полезная нагрузка; null = изменений нет. */
function buildPatch(
  task: TaskDto,
  form: DetailsFormState,
  timezone: string,
): Record<string, unknown> | null {
  const patch: Record<string, unknown> = {};
  const title = form.title.trim();
  // Пустое название не уходит на сервер — поле останется правиться.
  if (title.length > 0 && title !== task.title) patch.title = title;
  if (form.description !== task.description) patch.description = form.description;
  // Повтор требует даты: без явной даты отсчёт с сегодняшнего дня.
  const effectiveDueDate =
    form.dueDate === "" && form.rrule !== "" ? todayInZone(new Date(), timezone) : form.dueDate;
  if (effectiveDueDate !== (task.dueDate ?? "")) {
    patch.dueDate = effectiveDueDate === "" ? null : effectiveDueDate;
  }
  const effectiveDueTime = effectiveDueDate === "" ? "" : form.dueTime;
  if (effectiveDueTime !== (task.dueTime?.slice(0, 5) ?? "")) {
    patch.dueTime = effectiveDueTime === "" ? null : effectiveDueTime;
  }
  if (form.priority !== task.priority) patch.priority = form.priority;
  if (form.pinned !== task.pinned) patch.pinned = form.pinned;
  if (form.listId !== task.listId) {
    // Перенос в другой список сбрасывает секцию (секции принадлежат списку).
    patch.listId = form.listId;
    patch.sectionId = form.sectionId === "" ? null : form.sectionId;
  } else if (form.sectionId !== (task.sectionId ?? "")) {
    patch.sectionId = form.sectionId === "" ? null : form.sectionId;
  }
  if (form.rrule !== (task.rrule ?? "")) patch.rrule = form.rrule === "" ? null : form.rrule;
  const tagsChanged =
    [...form.tagNames].sort().join("\n") !==
    task.tags
      .map((tag) => tag.name)
      .sort()
      .join("\n");
  if (tagsChanged && form.tagNames.length <= 20) patch.tagNames = form.tagNames;
  return Object.keys(patch).length > 0 ? patch : null;
}

/**
 * Правая панель задачи: fixed поверх контента (не сжимает страницу),
 * изменения сохраняются автоматически, без кнопки «Сохранить».
 */
export function TaskDetails({ task, onClose }: TaskDetailsProps) {
  const sidebarQuery = useSidebarQuery();
  const tagsQuery = useTagsQuery();
  const update = useUpdateTask();
  const complete = useCompleteTask();
  const uncomplete = useUncompleteTask();
  const timezone = useUserTimezone();
  const prefersReducedMotion = useReducedMotion();

  const [form, setForm] = useState(() => formFromTask(task));
  const sectionsQuery = useSectionsQuery(form.listId);

  const sidebar = sidebarQuery.data;
  const allLists = sidebar
    ? [sidebar.inbox, ...sidebar.rootLists, ...sidebar.folders.flatMap((folder) => folder.lists)]
    : [];
  const sections = sectionsQuery.data ?? [];

  // Нестандартное правило (через api или quick-add) показываем отдельной опцией.
  const repeatOptions =
    form.rrule !== "" && !REPEAT_OPTIONS.some((option) => option.value === form.rrule)
      ? [{ value: form.rrule, label: rruleValueLabel(form.rrule) }, ...REPEAT_OPTIONS]
      : REPEAT_OPTIONS;

  const patch = useMemo(() => buildPatch(task, form, timezone), [task, form, timezone]);
  const patchRef = useRef(patch);
  patchRef.current = patch;

  // Автосейв: тихий PATCH через паузу после последней правки.
  useEffect(() => {
    if (!patch) return;
    const timer = setTimeout(() => {
      update.mutate({ taskId: task.id, ...patchRef.current! });
    }, AUTOSAVE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [patch, task.id, update]);

  // Смена задачи/закрытие панели: несохранённое уходит сразу (fire-and-forget).
  useEffect(
    () => () => {
      if (patchRef.current) {
        update.mutate({ taskId: task.id, ...patchRef.current });
      }
    },
    // Только при размонтировании: панель пересоздаётся key={task.id}.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  async function toggleComplete() {
    try {
      if (task.completedAt === null) {
        await complete.mutateAsync(task.id);
      } else {
        await uncomplete.mutateAsync(task.id);
      }
    } catch {
      // Ошибки мутаций видны через isError/error ниже.
    }
  }

  async function undoLastCompletion() {
    try {
      await uncomplete.mutateAsync(task.id);
    } catch {
      // Ошибки мутаций видны через isError/error ниже.
    }
  }

  /** Строки «YYYY-MM-DD» + «HH:mm» ⇄ Date (в локальной зоне браузера). */
  const dueDateTime =
    form.dueDate !== ""
      ? new Date(`${form.dueDate}T${form.dueTime !== "" ? form.dueTime : "00:00"}`)
      : undefined;

  function handleDateTimeSelect(next: Date | undefined) {
    if (!next) {
      setForm((state) => ({ ...state, dueDate: "", dueTime: "" }));
      return;
    }
    const year = next.getFullYear();
    const month = String(next.getMonth() + 1).padStart(2, "0");
    const day = String(next.getDate()).padStart(2, "0");
    setForm((state) => ({
      ...state,
      dueDate: `${year}-${month}-${day}`,
      dueTime: `${String(next.getHours()).padStart(2, "0")}:${String(next.getMinutes()).padStart(2, "0")}`,
    }));
  }

  function toggleTag(name: string) {
    setForm((state) => {
      const exists = state.tagNames.some((tag) => tag.toLowerCase() === name.toLowerCase());
      if (exists) {
        return { ...state, tagNames: state.tagNames.filter((tag) => tag !== name) };
      }
      if (state.tagNames.length >= 20) return state;
      return { ...state, tagNames: [...state.tagNames, name] };
    });
  }

  const saveError = update.isError ? errorMessage(update.error) : null;

  return (
    <motion.aside
      aria-label="Детали задачи"
      className="fixed top-0 right-0 z-40 flex h-dvh w-[340px] shrink-0 flex-col gap-4 overflow-y-auto rounded-l-xl border border-border bg-card p-4 shadow-lg max-md:inset-x-0 max-md:top-auto max-md:bottom-0 max-md:h-auto max-md:max-h-[80dvh] max-md:rounded-t-xl max-md:rounded-l-none max-md:border-t max-md:border-l-0"
      initial={prefersReducedMotion ? false : { opacity: 0, x: 16 }}
      animate={{ opacity: 1, x: 0 }}
      exit={prefersReducedMotion ? undefined : { opacity: 0, x: 16 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
    >
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold">Задача</h2>
        <button
          className="cursor-pointer rounded-full p-1 text-muted-foreground transition-colors hover:bg-control-hover hover:text-foreground"
          title="Закрыть"
          type="button"
          onClick={onClose}
        >
          <XIcon className="size-5" />
        </button>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="details-title">Название</Label>
        <Input
          id="details-title"
          value={form.title}
          onChange={(event) => setForm((state) => ({ ...state, title: event.target.value }))}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="details-description">Описание</Label>
        <Textarea
          id="details-description"
          rows={4}
          value={form.description}
          onChange={(event) => setForm((state) => ({ ...state, description: event.target.value }))}
          placeholder="Markdown-описание"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>Дата и время</Label>
        <DateTimePicker
          date={dueDateTime}
          onSelect={handleDateTimeSelect}
          placeholder="Без даты"
          clearable
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="details-priority">Приоритет</Label>
        <Select
          id="details-priority"
          options={TASK_PRIORITIES.map((value) => ({
            value,
            label: TASK_PRIORITY_LABELS_RU[value],
          }))}
          value={form.priority}
          onChange={(priority) => setForm((state) => ({ ...state, priority }))}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="details-list">Список</Label>
        <Select
          id="details-list"
          options={allLists.map((list) => ({ value: list.id, label: list.name }))}
          value={form.listId}
          onChange={(nextListId) =>
            setForm((state) => ({ ...state, listId: nextListId, sectionId: "" }))
          }
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="details-section">Секция</Label>
        <Select
          id="details-section"
          options={[
            { value: "", label: "Без секции" },
            ...sections.map((section) => ({ value: section.id, label: section.name })),
          ]}
          value={form.sectionId}
          onChange={(sectionId) => setForm((state) => ({ ...state, sectionId }))}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="details-repeat">Повтор</Label>
        <Select
          id="details-repeat"
          options={repeatOptions}
          value={form.rrule}
          onChange={(rrule) => setForm((state) => ({ ...state, rrule }))}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>Теги</Label>
        <MultiSelect
          ariaLabel="Теги задачи"
          placeholder="Нет тегов"
          searchPlaceholder="Найти или создать тег…"
          options={[
            ...(tagsQuery.data ?? []).map((tag) => ({
              value: tag.name,
              label: tag.name,
              selected: form.tagNames.some((name) => name.toLowerCase() === tag.name.toLowerCase()),
              leading: <EntityMarker icon={tag.icon} color={tag.color} />,
            })),
            // Тег создан через «Создать», но ещё не вернулся из запроса — рисуем чип сразу.
            ...form.tagNames
              .filter(
                (name) =>
                  !(tagsQuery.data ?? []).some(
                    (tag) => tag.name.toLowerCase() === name.toLowerCase(),
                  ),
              )
              .map((name) => ({
                value: name,
                label: name,
                selected: true,
                leading: <ColorDot color="gray" />,
              })),
          ]}
          onToggle={toggleTag}
          onCreate={(name) => toggleTag(name.trim())}
        />
      </div>

      <label className="flex items-center gap-2 text-sm">
        <Checkbox
          checked={form.pinned}
          onCheckedChange={(pinned) => setForm((state) => ({ ...state, pinned }))}
          aria-label="Закреплено"
        />
        Закреплено
      </label>

      {saveError ? <p className="text-sm text-destructive">{saveError}</p> : null}

      <div className="mt-auto flex flex-col gap-2">
        {task.rrule === null ? (
          <Button variant="secondary" onClick={() => void toggleComplete()}>
            {task.completedAt ? "Вернуть в работу" : "Завершить"}
          </Button>
        ) : (
          <>
            <Button variant="secondary" onClick={() => void toggleComplete()}>
              Завершить вхождение
            </Button>
            <Button variant="secondary" onClick={() => void undoLastCompletion()}>
              Отменить последнее завершение
            </Button>
          </>
        )}
      </div>
    </motion.aside>
  );
}
