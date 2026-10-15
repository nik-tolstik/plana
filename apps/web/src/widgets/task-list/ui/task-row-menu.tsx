import {
  CalendarIcon,
  CheckIcon,
  FlagIcon,
  ListIcon,
  RotateCcwIcon,
  TrashIcon,
} from "lucide-react";
import {
  TASK_PRIORITIES,
  addDays,
  type ListDto,
  type PatchTaskDto,
  type TaskDto,
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
}

interface TaskRowMenuArgs extends TaskRowMenuActions {
  task: TaskDto;
  /** Сегодня в таймзоне пользователя — для пресетов даты. */
  todayIso: string;
  /** Подпись текущей дедлайна (для подсказки в пункте «Дата»). */
  dueLabel: string | null;
  /** Все списки пользователя (Inbox + корень + папки). */
  allLists: ListDto[];
}

/** Пункты контекстного меню строки: завершение, дата, приоритет, список, корзина. */
export function buildTaskRowMenu({
  task,
  todayIso,
  dueLabel,
  allLists,
  toggleComplete,
  remove,
  restoreFromTrash,
  patchTask,
}: TaskRowMenuArgs): ContextMenuItem[] {
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

  return menuItems;
}
