import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  CalendarIcon,
  CheckIcon,
  FlagIcon,
  ListIcon,
  RepeatIcon,
  RotateCcwIcon,
  TrashIcon,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
  TASK_PRIORITIES,
  TASK_PRIORITY_LABELS_RU,
  addDays,
  rruleValueLabel,
  todayInZone,
  type PatchTaskDto,
  type TaskDto,
} from "@plana/shared";
import { useSidebarQuery } from "@/entities/list";
import { useUserTimezone } from "@/entities/task";
import {
  useCompleteTask,
  useCreateSubtask,
  useCreateTask,
  useRestoreTask,
  useTrashTask,
  useUncompleteTask,
  useUpdateTask,
} from "@/features/task-manage";
import { errorMessage } from "@/shared/lib/error-message";
import { cn } from "@/shared/lib/cn";
import { PRIORITY_CLASS } from "@/shared/lib/priority-class";
import { Checkbox, ContextMenu, EntityMarker, type ContextMenuItem } from "@/shared/ui";
import { TaskDateChip, TaskPriorityChip, TaskTagsChip } from "./task-chips";
import { SubtasksBlock } from "./subtasks-block";
import { taskDueLabel } from "../model/grouping";
import type { TaskEditingState } from "../model/editing";
import { TASK_DRAG_MIME, type TaskDragProps } from "../model/use-drag-reorder";

interface TaskRowProps {
  task: TaskDto;
  today: string;
  /** Дата уже прошла — подсветить. */
  showOverdue?: boolean;
  /** Страница задаёт дату («Сегодня»/«Завтра») — чип даты избыточен. */
  hideDateChip?: boolean;
  onOpenDetails: (taskId: string) => void;
  /** Перетаскивание (только страницы списков). */
  dnd?: TaskDragProps;
  /** Инлайн-ввод (владелец состояния — TaskListView). */
  editing?: TaskEditingState | null;
  onEditingChange?: (editing: TaskEditingState | null) => void;
}

/**
 * Управляемая однострочная (растущая по контенту) строка ввода инлайн-режимов.
 * Фокус и каретка в конец при монтировании.
 */
function InlineInput({
  className,
  value,
  placeholder,
  ariaLabel,
  autoFocus = true,
  onChange,
  onCommit,
  onShiftEnter,
  onCancel,
  onBlur,
}: {
  className?: string;
  value: string;
  placeholder: string;
  ariaLabel: string;
  autoFocus?: boolean;
  onChange: (value: string) => void;
  onCommit: () => void;
  onShiftEnter?: () => void;
  onCancel: () => void;
  onBlur?: () => void;
}) {
  const ref = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node || !autoFocus) return;
    node.focus();
    node.setSelectionRange(node.value.length, node.value.length);
    node.style.height = "auto";
    node.style.height = `${node.scrollHeight}px`;
  }, [autoFocus]);

  return (
    <textarea
      ref={ref}
      rows={1}
      aria-label={ariaLabel}
      placeholder={placeholder}
      value={value}
      onChange={(event) => {
        onChange(event.target.value);
        event.target.style.height = "auto";
        event.target.style.height = `${event.target.scrollHeight}px`;
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          if (event.shiftKey && onShiftEnter) {
            onShiftEnter();
            return;
          }
          onCommit();
        }
        if (event.key === "Escape") {
          event.preventDefault();
          onCancel();
        }
      }}
      onBlur={() => onBlur?.()}
      className={cn(
        // px-0 + leading-6: метрики совпадают со статичной кнопкой названия —
        // текст не сдвигается при входе/выходе из правки.
        "w-full resize-none rounded-md bg-transparent px-0 text-sm leading-6 text-foreground outline-none placeholder:text-muted-foreground",
        className,
      )}
    />
  );
}

export function TaskRow({
  task,
  today,
  showOverdue = true,
  hideDateChip = false,
  onOpenDetails,
  dnd,
  editing = null,
  onEditingChange = () => undefined,
}: TaskRowProps) {
  const [expanded, setExpanded] = useState(false);
  const [titleDraft, setTitleDraft] = useState(task.title);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  // Завершение: сначала проигрываем галочку и схлопывание строки,
  // только потом PATCH — иначе задача исчезает из списка раньше анимации.
  const [completing, setCompleting] = useState(false);
  const prefersReducedMotion = useReducedMotion();
  const sidebarQuery = useSidebarQuery();
  const timezone = useUserTimezone();
  const complete = useCompleteTask();
  const uncomplete = useUncompleteTask();
  const trash = useTrashTask();
  const restore = useRestoreTask();
  const update = useUpdateTask();
  const createTask = useCreateTask();
  const createSubtask = useCreateSubtask();

  // Смена задачи (invalidate) сбрасывает черновик названия.
  useEffect(() => {
    setTitleDraft(task.title);
  }, [task.title]);

  const mode = editing?.taskId === task.id ? editing.mode : null;
  const doneCount = task.subtasks.filter((subtask) => subtask.done).length;
  const dueLabel = taskDueLabel(task, today);
  const overdue =
    showOverdue &&
    task.dueDate !== null &&
    task.dueDate < today &&
    task.completedAt === null &&
    task.trashedAt === null;
  const done = completing || task.completedAt !== null;
  const overZone = dnd?.over?.id === task.id && dnd.draggingId !== task.id ? dnd.over.zone : null;

  async function toggleComplete() {
    try {
      if (task.completedAt === null) {
        setCompleting(true);
        if (!prefersReducedMotion) {
          // Галочка + схлопывание строки успевают проиграться до PATCH.
          await new Promise((resolve) => setTimeout(resolve, 450));
        }
        await complete.mutateAsync(task.id);
        setCompleting(false);
      } else {
        await uncomplete.mutateAsync(task.id);
      }
    } catch (cause) {
      setCompleting(false);
      setError(errorMessage(cause));
    }
  }

  async function remove() {
    try {
      await trash.mutateAsync(task.id);
    } catch (cause) {
      setError(errorMessage(cause));
    }
  }

  async function restoreFromTrash() {
    try {
      await restore.mutateAsync(task.id);
    } catch (cause) {
      setError(errorMessage(cause));
    }
  }

  /** Сохранить отредактированное название (если менялось). */
  async function commitTitle() {
    const trimmed = titleDraft.trim();
    if (trimmed.length === 0 || trimmed === task.title) {
      setTitleDraft(task.title);
      return;
    }
    try {
      await update.mutateAsync({ taskId: task.id, title: trimmed });
    } catch (cause) {
      setError(errorMessage(cause));
      setTitleDraft(task.title);
    }
  }

  /** Enter в правке названия: сохранить и продолжить строкой новой задачи. */
  function handleTitleEnter() {
    void commitTitle();
    setDraft("");
    onEditingChange({ taskId: task.id, mode: "new-task" });
  }

  /** Shift+Enter в праве названия: сохранить и продолжить строкой подзадачи. */
  function handleTitleShiftEnter() {
    void commitTitle();
    setDraft("");
    setExpanded(true);
    onEditingChange({ taskId: task.id, mode: "new-subtask" });
  }

  /** Blur названия: просто сохранить и выйти из правки (без открытия панели). */
  function handleTitleBlur() {
    void commitTitle();
    onEditingChange(null);
  }

  /** Enter в строке новой задачи: создать под текущей, ввод переезжает в неё. */
  async function commitNewTask() {
    const trimmed = draft.trim();
    if (trimmed.length === 0) {
      onEditingChange(null);
      return;
    }
    try {
      const created = await createTask.mutateAsync({
        title: trimmed,
        // Контекст текущей строки: тот же список/секция/дата.
        listId: task.listId,
        sectionId: task.sectionId,
        dueDate: task.dueDate,
        afterTaskId: task.id,
      });
      setDraft("");
      onEditingChange({ taskId: created.id, mode: "new-task" });
    } catch (cause) {
      setError(errorMessage(cause));
    }
  }

  /** Shift+Enter в строке новой задачи: этот текст станет подзадачей текущей. */
  async function commitNewTaskAsSubtask() {
    const trimmed = draft.trim();
    if (trimmed.length === 0) {
      onEditingChange(null);
      return;
    }
    try {
      await createSubtask.mutateAsync({ taskId: task.id, title: trimmed });
      setDraft("");
      setExpanded(true);
      onEditingChange({ taskId: task.id, mode: "new-subtask" });
    } catch (cause) {
      setError(errorMessage(cause));
    }
  }

  async function commitNewSubtask() {
    const trimmed = draft.trim();
    if (trimmed.length === 0) {
      onEditingChange(null);
      return;
    }
    try {
      await createSubtask.mutateAsync({ taskId: task.id, title: trimmed });
      setDraft("");
      // Остаемся в режиме: можно вводить следующую подзадачу.
    } catch (cause) {
      setError(errorMessage(cause));
    }
  }

  /** Общий PATCH для действий контекстного меню (дата/приоритет/список). */
  async function patchTask(input: PatchTaskDto) {
    try {
      await update.mutateAsync({ taskId: task.id, ...input });
    } catch (cause) {
      setError(errorMessage(cause));
    }
  }

  const todayIso = todayInZone(new Date(), timezone);
  const allLists = sidebarQuery.data
    ? [
        sidebarQuery.data.inbox,
        ...sidebarQuery.data.rootLists,
        ...sidebarQuery.data.folders.flatMap((folder) => folder.lists),
      ]
    : [];
  const currentList = allLists.find((list) => list.id === task.listId);

  const menuItems: ContextMenuItem[] = [
    {
      label: task.completedAt ? "Вернуть в работу" : "Завершить",
      icon: task.completedAt ? (
        <RotateCcwIcon className="size-4" />
      ) : (
        <CheckIcon className="size-4" />
      ),
      onSelect: () => void toggleComplete(),
    },
  ];

  if (task.trashedAt === null) {
    menuItems.push(
      {
        label: "Дата",
        icon: <CalendarIcon className="size-4" />,
        hint: dueLabel ?? "нет",
        submenu: [
          {
            label: "Сегодня",
            icon: task.dueDate === todayIso ? <CheckIcon className="size-4" /> : undefined,
            onSelect: () => void patchTask({ dueDate: todayIso }),
          },
          {
            label: "Завтра",
            icon:
              task.dueDate === addDays(todayIso, 1) ? <CheckIcon className="size-4" /> : undefined,
            onSelect: () => void patchTask({ dueDate: addDays(todayIso, 1) }),
          },
          {
            label: "Следующая неделя",
            icon:
              task.dueDate === addDays(todayIso, 7) ? <CheckIcon className="size-4" /> : undefined,
            onSelect: () => void patchTask({ dueDate: addDays(todayIso, 7) }),
          },
          {
            label: "Без даты",
            icon: task.dueDate === null ? <CheckIcon className="size-4" /> : undefined,
            onSelect: () => void patchTask({ dueDate: null }),
          },
        ],
      },
      {
        label: "Приоритет",
        icon: <FlagIcon className="size-4" />,
        hint: TASK_PRIORITY_LABELS_RU[task.priority],
        submenu: TASK_PRIORITIES.map((priority) => ({
          label: TASK_PRIORITY_LABELS_RU[priority],
          icon:
            priority === task.priority ? (
              <FlagIcon className={cn("size-4 fill-current", PRIORITY_CLASS[priority])} />
            ) : undefined,
          onSelect: () => void patchTask({ priority }),
        })),
      },
      {
        label: "Список",
        icon: <ListIcon className="size-4" />,
        hint: currentList?.name,
        submenu: allLists.map((list) => ({
          label: list.name,
          icon:
            list.id === task.listId ? (
              <CheckIcon className="size-4" />
            ) : (
              <EntityMarker icon={list.icon} color={list.color} />
            ),
          onSelect: () =>
            void patchTask(list.id === task.listId ? {} : { listId: list.id, sectionId: null }),
        })),
      },
    );
  }

  menuItems.push(
    task.trashedAt
      ? {
          label: "Восстановить",
          icon: <RotateCcwIcon className="size-4" />,
          onSelect: () => void restoreFromTrash(),
        }
      : {
          label: "Удалить",
          icon: <TrashIcon className="size-4" />,
          danger: true,
          onSelect: () => void remove(),
        },
  );

  return (
    // li — обычный (не motion): HTML5 drag-события не должны перехватываться
    // motion-жестами; перестановки и уход строки анимирует вложенный motion.div.
    // Действия над задачей — в контекстном меню по правому клику.
    <ContextMenu items={menuItems}>
      {(menuProps) => (
        <li
          {...menuProps}
          // Клик по строке вне названия и контролов открывает панель деталей.
          // Чипы (тег/дата/приоритет) помечены data-task-chip: их поповеры
          // рендерятся в портале, а сам триггер гасит всплытие — фильтр
          // отсекает случаи, когда событие всё же дошло до строки.
          onClick={(event) => {
            if (mode === null) {
              const target = event.target;
              if (target instanceof Element && target.closest("[data-task-chip]")) return;
              onOpenDetails(task.id);
            }
          }}
          className={cn(
            "group relative flex flex-col rounded-lg",
            task.completedAt !== null && "opacity-60",
            dnd?.draggingId === task.id && "opacity-40",
            overZone === "inside" && "bg-surface-selected",
          )}
          // Строка всегда тащится (кроме правки): перенос между списками
          // броском на сайдбар доступен и на умных страницах.
          draggable={mode === null}
          onDragStart={(event) => {
            if (dnd) {
              dnd.onDragStart(task, event);
              return;
            }
            event.dataTransfer.effectAllowed = "move";
            event.dataTransfer.setData(TASK_DRAG_MIME, task.id);
            event.dataTransfer.setData("text/plain", task.id);
          }}
          onDragOver={dnd?.onDragOver ? (event) => dnd.onDragOver(task, event) : undefined}
          onDrop={dnd?.onDrop ? (event) => dnd.onDrop(task, event) : undefined}
          onDragEnd={dnd?.onDragEnd}
        >
          {/* Линии вставки при перетаскивании; центральная зона подсвечивает строку. */}
          {overZone === "before" ? (
            <span className="pointer-events-none absolute inset-x-1 top-0 z-10 h-0.5 rounded-full bg-primary" />
          ) : null}
          {overZone === "after" ? (
            <span className="pointer-events-none absolute inset-x-1 bottom-0 z-10 h-0.5 rounded-full bg-primary" />
          ) : null}
          <motion.div
            // layout: перестановка DnD переезжает плавно, а не скачком.
            layout={!prefersReducedMotion}
            className="flex flex-col"
            initial={false}
            animate={
              completing && !prefersReducedMotion
                ? { height: 0, opacity: 0 }
                : { height: "auto", opacity: 1 }
            }
            transition={{ duration: 0.22, ease: "easeOut" }}
          >
            <div className="flex items-center gap-2 px-2 py-1.5">
              <Checkbox
                size="lg"
                checked={done}
                onCheckedChange={() => void toggleComplete()}
                onClick={(event) => event.stopPropagation()}
                aria-label={task.completedAt ? "Вернуть в работу" : "Завершить"}
              />
              {mode === "title" ? (
                <InlineInput
                  className="min-h-6 flex-1 py-0"
                  value={titleDraft}
                  placeholder="Название задачи"
                  ariaLabel="Редактирование названия задачи"
                  onChange={setTitleDraft}
                  onCommit={handleTitleEnter}
                  onShiftEnter={handleTitleShiftEnter}
                  onCancel={() => {
                    setTitleDraft(task.title);
                    onEditingChange(null);
                  }}
                  onBlur={handleTitleBlur}
                />
              ) : (
                <button
                  className={cn(
                    // Ширина по тексту: клик мимо названия падает на строку и
                    // открывает панель деталей, а не режим правки.
                    // text-sm + leading-6 = метрики инлайн-редактора (без сдвига).
                    "min-w-0 cursor-text truncate text-left text-sm leading-6",
                    done && "line-through decoration-muted-foreground",
                  )}
                  type="button"
                  title="Нажмите, чтобы переименовать"
                  onClick={(event) => {
                    event.stopPropagation();
                    setTitleDraft(task.title);
                    onEditingChange({ taskId: task.id, mode: "title" });
                  }}
                >
                  {task.title}
                </button>
              )}

              {/* Распорка: индикаторы прижаты вправо, клик по ней открывает панель. */}
              <span aria-hidden className="min-w-0 flex-1" />
              <TaskTagsChip task={task} onPatch={(input) => void patchTask(input)} />
              <TaskPriorityChip task={task} onPatch={(input) => void patchTask(input)} />
              {task.rrule !== null ? (
                <RepeatIcon
                  className="size-3.5 shrink-0 text-muted-foreground"
                  aria-label={rruleValueLabel(task.rrule)}
                />
              ) : null}
              {hideDateChip ? null : (
                <TaskDateChip
                  task={task}
                  overdue={overdue}
                  label={dueLabel}
                  onPatch={(input) => void patchTask(input)}
                />
              )}
              {/* Счётчик-переключатель блока подзадач; пустой блок не показываем —
                  подзадачи добавляются Shift+Enter в правке названия. */}
              {task.subtasks.length > 0 ? (
                <button
                  className="shrink-0 cursor-pointer rounded-md px-1.5 py-1 text-xs text-muted-foreground transition-colors hover:bg-surface-control-hover hover:text-foreground"
                  title="Подзадачи"
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    setExpanded((value) => !value);
                  }}
                >
                  {doneCount}/{task.subtasks.length}
                </button>
              ) : null}
            </div>

            {mode === "new-task" ? (
              <div className="flex items-center gap-2 px-2 pb-1.5">
                <span aria-hidden className="w-6 shrink-0" />
                <InlineInput
                  className="min-h-6 flex-1 py-0"
                  value={draft}
                  placeholder="Новая задача — Enter, подзадача — Shift+Enter"
                  ariaLabel="Новая задача"
                  onChange={setDraft}
                  onCommit={() => void commitNewTask()}
                  onShiftEnter={() => void commitNewTaskAsSubtask()}
                  onCancel={() => onEditingChange(null)}
                  onBlur={() => {
                    if (draft.trim().length === 0) {
                      onEditingChange(null);
                    } else {
                      void commitNewTask();
                    }
                  }}
                />
              </div>
            ) : null}

            <AnimatePresence initial={false}>
              {expanded || mode === "new-subtask" ? (
                <motion.div
                  key="subtasks"
                  initial={prefersReducedMotion ? false : { height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.18, ease: "easeOut" }}
                  className="overflow-hidden"
                >
                  {/* Клик по блоку подзадач не должен открывать панель задачи. */}
                  <div onClick={(event) => event.stopPropagation()}>
                    <SubtasksBlock task={task} />
                  </div>
                  {mode === "new-subtask" ? (
                    <div className="flex items-center gap-2 px-4 pb-2">
                      <InlineInput
                        className="min-h-6 flex-1 py-0"
                        value={draft}
                        placeholder="Новая подзадача — Enter добавляет, Escape закрывает"
                        ariaLabel="Новая подзадача"
                        onChange={setDraft}
                        onCommit={() => void commitNewSubtask()}
                        onCancel={() => onEditingChange(null)}
                        onBlur={() => {
                          if (draft.trim().length === 0) {
                            onEditingChange(null);
                          } else {
                            void commitNewSubtask();
                          }
                        }}
                      />
                    </div>
                  ) : null}
                </motion.div>
              ) : null}
            </AnimatePresence>
            {error ? <p className="px-2 pb-1 text-xs text-destructive">{error}</p> : null}
          </motion.div>
        </li>
      )}
    </ContextMenu>
  );
}
