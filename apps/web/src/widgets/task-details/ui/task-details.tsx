import { useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { XIcon } from "lucide-react";
import {
  TASK_PRIORITIES,
  TASK_PRIORITY_LABELS_RU,
  rruleValueLabel,
  todayInZone,
  type TaskDto,
} from "@plana/shared";
import { useSectionsQuery, useSidebarQuery } from "@/entities/list";
import { useTagsQuery } from "@/entities/tag";
import { useUserTimezone } from "@/entities/task";
import {
  useCompleteTask,
  useTrashTask,
  useUncompleteTask,
  useUpdateTask,
} from "@/features/task-manage";
import { errorMessage } from "@/shared/lib/error-message";
import { Button, Checkbox, Input, Label, Select, Textarea } from "@/shared/ui";

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

/** Правая панель редактирования задачи (desktop; на мобильном — поверх списка). */
export function TaskDetails({ task, onClose }: TaskDetailsProps) {
  const sidebarQuery = useSidebarQuery();
  const tagsQuery = useTagsQuery();
  const update = useUpdateTask();
  const complete = useCompleteTask();
  const uncomplete = useUncompleteTask();
  const trash = useTrashTask();
  const timezone = useUserTimezone();
  const prefersReducedMotion = useReducedMotion();

  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description);
  const [dueDate, setDueDate] = useState(task.dueDate ?? "");
  const [dueTime, setDueTime] = useState(task.dueTime?.slice(0, 5) ?? "");
  const [priority, setPriority] = useState(task.priority);
  const [pinned, setPinned] = useState(task.pinned);
  const [listId, setListId] = useState(task.listId);
  const [sectionId, setSectionId] = useState(task.sectionId ?? "");
  const [rrule, setRrule] = useState(task.rrule ?? "");
  const [tagNames, setTagNames] = useState<string[]>(task.tags.map((tag) => tag.name));
  const [tagInput, setTagInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const sectionsQuery = useSectionsQuery(listId);

  const sidebar = sidebarQuery.data;
  const allLists = sidebar
    ? [sidebar.inbox, ...sidebar.rootLists, ...sidebar.folders.flatMap((folder) => folder.lists)]
    : [];
  const sections = sectionsQuery.data ?? [];

  // Нестандартное правило (через api или quick-add) показываем отдельной опцией.
  const repeatOptions =
    rrule !== "" && !REPEAT_OPTIONS.some((option) => option.value === rrule)
      ? [{ value: rrule, label: rruleValueLabel(rrule) }, ...REPEAT_OPTIONS]
      : REPEAT_OPTIONS;

  const tagsChanged =
    [...tagNames].sort().join("\n") !==
    task.tags
      .map((tag) => tag.name)
      .sort()
      .join("\n");

  function addTag(raw: string) {
    const name = raw.trim().replace(/^#/, "");
    if (name.length === 0) return;
    if (tagNames.some((existing) => existing.toLowerCase() === name.toLowerCase())) {
      setTagInput("");
      return;
    }
    if (tagNames.length >= 20) {
      setError("Максимум 20 тегов на задачу");
      return;
    }
    setError(null);
    setTagNames([...tagNames, name]);
    setTagInput("");
  }

  async function save() {
    if (title.trim().length === 0) {
      setError("Название не может быть пустым");
      return;
    }
    // Повтор требует даты: без явной даты отсчёт с сегодняшнего дня.
    const effectiveDueDate =
      dueDate === "" && rrule !== "" ? todayInZone(new Date(), timezone) : dueDate;
    try {
      await update.mutateAsync({
        taskId: task.id,
        title: title.trim(),
        description,
        dueDate: effectiveDueDate === "" ? null : effectiveDueDate,
        dueTime: effectiveDueDate === "" || dueTime === "" ? null : dueTime,
        priority,
        pinned,
        ...(listId !== task.listId ? { listId } : {}),
        ...(sectionId !== (task.sectionId ?? "")
          ? { sectionId: sectionId === "" ? null : sectionId }
          : {}),
        ...(rrule !== (task.rrule ?? "") ? { rrule: rrule === "" ? null : rrule } : {}),
        ...(tagsChanged ? { tagNames } : {}),
      });
      setError(null);
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    } catch (cause) {
      setError(errorMessage(cause));
    }
  }

  async function toggleComplete() {
    try {
      if (task.completedAt === null) {
        await complete.mutateAsync(task.id);
      } else {
        await uncomplete.mutateAsync(task.id);
      }
    } catch (cause) {
      setError(errorMessage(cause));
    }
  }

  async function undoLastCompletion() {
    try {
      await uncomplete.mutateAsync(task.id);
    } catch (cause) {
      setError(errorMessage(cause));
    }
  }

  async function remove() {
    try {
      await trash.mutateAsync(task.id);
      onClose();
    } catch (cause) {
      setError(errorMessage(cause));
    }
  }

  return (
    <motion.aside
      aria-label="Детали задачи"
      className="sticky top-6 flex w-[320px] shrink-0 flex-col gap-4 rounded-xl border border-border bg-card p-4 shadow-sm max-md:fixed max-md:inset-x-0 max-md:bottom-0 max-md:z-40 max-md:w-auto max-md:rounded-t-xl max-md:shadow-lg"
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
          value={title}
          onChange={(event) => setTitle(event.target.value)}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="details-description">Описание</Label>
        <Textarea
          id="details-description"
          rows={4}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Markdown-описание"
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="details-date">Дата</Label>
          <Input
            id="details-date"
            type="date"
            value={dueDate}
            onChange={(event) => setDueDate(event.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="details-time">Время</Label>
          <Input
            id="details-time"
            type="time"
            value={dueTime}
            onChange={(event) => setDueTime(event.target.value)}
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="details-priority">Приоритет</Label>
        <Select
          id="details-priority"
          value={priority}
          onChange={(event) => setPriority(event.target.value as TaskDto["priority"])}
        >
          {TASK_PRIORITIES.map((value) => (
            <option key={value} value={value}>
              {TASK_PRIORITY_LABELS_RU[value]}
            </option>
          ))}
        </Select>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="details-list">Список</Label>
        <Select
          id="details-list"
          value={listId}
          onChange={(event) => {
            setListId(event.target.value);
            setSectionId("");
          }}
        >
          {allLists.map((list) => (
            <option key={list.id} value={list.id}>
              {list.name}
            </option>
          ))}
        </Select>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="details-section">Секция</Label>
        <Select
          id="details-section"
          value={sectionId}
          onChange={(event) => setSectionId(event.target.value)}
        >
          <option value="">Без секции</option>
          {sections.map((section) => (
            <option key={section.id} value={section.id}>
              {section.name}
            </option>
          ))}
        </Select>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="details-repeat">Повтор</Label>
        <Select
          id="details-repeat"
          value={rrule}
          onChange={(event) => setRrule(event.target.value)}
        >
          {repeatOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="details-tag-input">Теги</Label>
        <div className="flex flex-wrap items-center gap-1.5">
          {tagNames.map((name) => (
            <span
              className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-xs font-medium"
              key={name}
            >
              #{name}
              <button
                aria-label={`Убрать тег ${name}`}
                title="Убрать тег"
                type="button"
                className="cursor-pointer rounded-sm p-0.5 text-muted-foreground transition-colors hover:text-foreground"
                onClick={() => setTagNames(tagNames.filter((tag) => tag !== name))}
              >
                <XIcon className="size-3" />
              </button>
            </span>
          ))}
          <Input
            className="min-h-8 w-32 flex-1"
            id="details-tag-input"
            aria-label="Добавить тег"
            list="tag-options"
            placeholder="Добавить тег…"
            value={tagInput}
            onChange={(event) => setTagInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === ",") {
                event.preventDefault();
                addTag(tagInput);
              }
            }}
            onBlur={() => addTag(tagInput)}
          />
          <datalist id="tag-options">
            {(tagsQuery.data ?? [])
              .filter(
                (tag) => !tagNames.some((name) => name.toLowerCase() === tag.name.toLowerCase()),
              )
              .map((tag) => (
                <option key={tag.id} value={tag.name} />
              ))}
          </datalist>
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <Checkbox checked={pinned} onCheckedChange={setPinned} aria-label="Закреплено" />
        Закреплено
      </label>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {saved ? <p className="text-sm text-success">Сохранено</p> : null}

      <div className="mt-auto flex flex-col gap-2">
        <Button onClick={() => void save()} disabled={update.isPending}>
          Сохранить
        </Button>
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
        <Button variant="danger" onClick={() => void remove()}>
          В корзину
        </Button>
      </div>
    </motion.aside>
  );
}
