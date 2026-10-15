import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { RepeatIcon } from "lucide-react";
import { todayInZone, type TaskDto } from "@plana/shared";
import { useSidebarQuery } from "@/entities/list";
import { useUserTimezone } from "@/entities/user";
import { rruleValueLabel } from "@/shared/lib/rrule-label";
import { cn } from "@/shared/lib/cn";
import { Checkbox, ContextMenu } from "@/shared/ui";
import { InlineInput } from "./inline-input";
import { SubtasksBlock } from "./subtasks-block";
import { TaskDateChip, TaskPriorityChip, TaskTagsChip } from "./task-chips";
import { buildTaskRowMenu } from "./task-row-menu";
import { taskDueLabel } from "../model/grouping";
import { useTaskRowActions } from "../model/use-task-row-actions";
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

/** Строка задачи: чекбокс, название, чипы, подзадачи, инлайн-режимы. */
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
  const prefersReducedMotion = useReducedMotion();
  const sidebarQuery = useSidebarQuery();
  const timezone = useUserTimezone();

  const {
    expanded,
    setExpanded,
    titleDraft,
    setTitleDraft,
    draft,
    setDraft,
    error,
    completing,
    toggleComplete,
    remove,
    restoreFromTrash,
    patchTask,
    handleTitleEnter,
    handleTitleShiftEnter,
    handleTitleBlur,
    commitNewTask,
    commitNewTaskAsSubtask,
    commitNewSubtask,
  } = useTaskRowActions({ task, onEditingChange });

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

  const todayIso = todayInZone(new Date(), timezone);
  const allLists = sidebarQuery.data
    ? [
        sidebarQuery.data.inbox,
        ...sidebarQuery.data.rootLists,
        ...sidebarQuery.data.folders.flatMap((folder) => folder.lists),
      ]
    : [];
  const menuItems = buildTaskRowMenu({
    task,
    todayIso,
    dueLabel,
    allLists,
    toggleComplete,
    remove,
    restoreFromTrash,
    patchTask,
  });

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
                  className="shrink-0 cursor-pointer rounded-md px-1.5 py-1 text-xs text-muted-foreground transition-colors hover:bg-control-hover hover:text-foreground"
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
