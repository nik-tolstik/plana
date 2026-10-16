import {
  CalendarOffIcon,
  CalendarRangeIcon,
  CheckIcon,
  FlagIcon,
  ListIcon,
  ListPlusIcon,
  RotateCcwIcon,
  SunIcon,
  SunriseIcon,
  TrashIcon,
} from "lucide-react";
import {
  addDays,
  type ListDto,
  type PatchTaskDto,
  type TaskDto,
  type TaskPriority,
} from "@plana/shared";
import { cn } from "@/shared/lib/cn";
import { PRIORITY_CLASS } from "@/shared/lib/priority-class";
import { TASK_PRIORITY_LABELS_RU } from "@/shared/lib/priority-labels";
import { EntityMarker, type ContextMenuItem } from "@/shared/ui";

/** Действия строки, которые контекстное меню вызывает по выбору пункта. */
export interface TaskRowMenuActions {
  toggleComplete: () => void;
  remove: () => void;
  restoreFromTrash: () => void;
  patchTask: (input: PatchTaskDto) => void;
  /** Раскрыть строку и включить ввод новой подзадачи. */
  startSubtask: () => void;
}

interface TaskRowMenuArgs extends TaskRowMenuActions {
  task: TaskDto;
  /** Сегодня в таймзоне пользователя — для пресетов даты. */
  todayIso: string;
  /** Все списки пользователя (Inbox + корень + папки). */
  allLists: ListDto[];
}

/** Порядок как в меню TickTick: от высокого к «без приоритета». */
const MENU_PRIORITY_ORDER: TaskPriority[] = ["high", "medium", "low", "none"];

/**
 * Пункты контекстного меню строки: ряды быстрых кнопок (дата, приоритет),
 * затем действия — завершение, подзадача, перенос по спискам, корзина.
 */
export function buildTaskRowMenu({
  task,
  todayIso,
  allLists,
  toggleComplete,
  remove,
  restoreFromTrash,
  patchTask,
  startSubtask,
}: TaskRowMenuArgs): ContextMenuItem[] {
  const currentList = allLists.find((list) => list.id === task.listId);
  const tomorrow = addDays(todayIso, 1);
  const nextWeek = addDays(todayIso, 7);

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
      { separator: true, label: "" },
      {
        label: "Дата",
        quickOptions: [
          {
            key: "today",
            label: "Сегодня",
            icon: <SunIcon className="size-4" />,
            active: task.dueDate === todayIso,
            onSelect: () => void patchTask({ dueDate: todayIso }),
          },
          {
            key: "tomorrow",
            label: "Завтра",
            icon: <SunriseIcon className="size-4" />,
            active: task.dueDate === tomorrow,
            onSelect: () => void patchTask({ dueDate: tomorrow }),
          },
          {
            key: "next-week",
            label: "Следующая неделя",
            icon: <CalendarRangeIcon className="size-4" />,
            active: task.dueDate === nextWeek,
            onSelect: () => void patchTask({ dueDate: nextWeek }),
          },
          {
            key: "no-date",
            label: "Без даты",
            icon: <CalendarOffIcon className="size-4" />,
            active: task.dueDate === null,
            onSelect: () => void patchTask({ dueDate: null }),
          },
        ],
      },
      {
        label: "Приоритет",
        quickOptions: MENU_PRIORITY_ORDER.map((priority) => ({
          key: priority,
          label: TASK_PRIORITY_LABELS_RU[priority],
          icon: (
            <FlagIcon
              className={cn(
                "size-4",
                priority === "none" ? undefined : "fill-current",
                PRIORITY_CLASS[priority] || undefined,
              )}
            />
          ),
          active: task.priority === priority,
          onSelect: () => void patchTask({ priority }),
        })),
      },
      { separator: true, label: "" },
      {
        label: "Добавить подзадачу",
        icon: <ListPlusIcon className="size-4" />,
        onSelect: startSubtask,
      },
      {
        label: "Переместить в",
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

  return menuItems;
}
