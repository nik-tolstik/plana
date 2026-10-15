import { useEffect, useMemo, useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { XIcon } from "lucide-react";
import { TASK_PRIORITIES, todayInZone, type TaskDto, type TaskPriority } from "@plana/shared";
import { useSidebarQuery } from "@/entities/list";
import { useTagsQuery } from "@/entities/tag";
import { useUserTimezone } from "@/entities/user";
import { useCompleteTask, useUncompleteTask, useUpdateTask } from "@/features/task-manage";
import { errorMessage } from "@/shared/lib/error-message";
import { TASK_PRIORITY_LABELS_RU } from "@/shared/lib/priority-labels";
import { rruleValueLabel } from "@/shared/lib/rrule-label";
import {
  Button,
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
  listId: string;
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
    listId: task.listId,
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
  if (form.listId !== task.listId) {
    // Перенос в другой список сбрасывает секцию (секции принадлежат списку).
    patch.listId = form.listId;
    patch.sectionId = null;
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

  const sidebar = sidebarQuery.data;
  const allLists = sidebar
    ? [sidebar.inbox, ...sidebar.rootLists, ...sidebar.folders.flatMap((folder) => folder.lists)]
    : [];

  // Нестандартное правило (через api или quick-add) показываем отдельной опцией.
  const repeatOptions =
    form.rrule !== "" && !REPEAT_OPTIONS.some((option) => option.value === form.rrule)
      ? [{ value: form.rrule, label: rruleValueLabel(form.rrule) }, ...REPEAT_OPTIONS]
      : REPEAT_OPTIONS;

  const patch = useMemo(() => buildPatch(task, form, timezone), [task, form, timezone]);
  const patchRef = useRef(patch);
  patchRef.current = patch;

  // Внешние правки задачи (чипы в строке, другое устройство) подтягиваются
  // в форму, когда локальных несохранённых правок нет — иначе автосейв
  // панели откатил бы чужое изменение своими старыми значениями полей.
  useEffect(() => {
    if (patch === null) {
      setForm(formFromTask(task));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [task]);

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

  // Фаза закрытия: проигрываем уход и размонтируемся сами. AnimatePresence
  // на странице списка не подходит: его exit в этой структуре иногда не
  // удаляет элемент из DOM (панель навсегда остаётся с opacity:0 и ловит клики).
  const [closing, setClosing] = useState(false);
  const asideRef = useRef<HTMLElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  function requestClose() {
    if (closing) return;
    // Без фокуса окна rAF и таймеры замирают — анимацию закрытия не проиграть,
    // закрываем сразу. Клик реального пользователя всегда даёт фокус.
    if (prefersReducedMotion || !document.hasFocus()) {
      onClose();
      return;
    }
    setClosing(true);
  }

  // Страховка: размонтируем по таймеру, даже если событие завершения
  // анимации не пришло (замороженный rAF в фоне, webview без кадров).
  // onClose через ref: пересоздание колбэка ререндером не сбрасывает таймер.
  useEffect(() => {
    if (!closing) return;
    const timer = setTimeout(() => onCloseRef.current(), 350);
    return () => clearTimeout(timer);
  }, [closing]);

  // Клик/тап вне панели закрывает её. Поповеры и диалоги рендерятся
  // в портале вне aside — их клики игнорируем, иначе закрывали бы панель.
  useEffect(() => {
    if (closing) return;
    function onPointerDown(event: PointerEvent) {
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (asideRef.current?.contains(target)) return;
      if (target.closest('[data-slot="popover-content"], [role="dialog"]')) return;
      requestClose();
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [closing, prefersReducedMotion]);

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
      ref={asideRef}
      aria-label="Детали задачи"
      className="fixed top-0 right-0 z-40 flex h-dvh w-[340px] shrink-0 flex-col gap-4 overflow-y-auto rounded-l-xl border border-border bg-card p-4 shadow-lg max-md:inset-x-0 max-md:top-auto max-md:bottom-0 max-md:h-auto max-md:max-h-[80dvh] max-md:rounded-t-xl max-md:rounded-l-none max-md:border-t max-md:border-l-0"
      initial={prefersReducedMotion ? false : { opacity: 0, x: 16 }}
      animate={closing ? { opacity: 0, x: 16 } : { opacity: 1, x: 0 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      onAnimationComplete={() => {
        if (closing) onClose();
      }}
    >
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold">Задача</h2>
        <button
          className="cursor-pointer rounded-full p-1 text-muted-foreground transition-colors hover:bg-control-hover hover:text-foreground"
          title="Закрыть"
          type="button"
          onClick={requestClose}
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
          onChange={(nextListId) => setForm((state) => ({ ...state, listId: nextListId }))}
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
