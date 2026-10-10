import { useState } from "react";
import {
  TASK_PRIORITIES,
  TASK_PRIORITY_LABELS_RU,
  rruleValueLabel,
  todayInZone,
  type TaskDto,
} from "@plana/shared";
import { useSectionsQuery, useSidebarQuery } from "@/entities/list";
import { useUserTimezone } from "@/entities/task";
import {
  useCompleteTask,
  useTrashTask,
  useUncompleteTask,
  useUpdateTask,
} from "@/features/task-manage";
import { errorMessage } from "@/shared/lib/error-message";

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
  const update = useUpdateTask();
  const complete = useCompleteTask();
  const uncomplete = useUncompleteTask();
  const trash = useTrashTask();
  const timezone = useUserTimezone();

  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description);
  const [dueDate, setDueDate] = useState(task.dueDate ?? "");
  const [dueTime, setDueTime] = useState(task.dueTime?.slice(0, 5) ?? "");
  const [priority, setPriority] = useState(task.priority);
  const [pinned, setPinned] = useState(task.pinned);
  const [listId, setListId] = useState(task.listId);
  const [sectionId, setSectionId] = useState(task.sectionId ?? "");
  const [rrule, setRrule] = useState(task.rrule ?? "");
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
    <aside aria-label="Детали задачи" className="details-panel">
      <div className="details-header">
        <h2 className="details-heading">Задача</h2>
        <button className="icon-btn" title="Закрыть" type="button" onClick={onClose}>
          ✕
        </button>
      </div>

      <label className="details-field">
        Название
        <input value={title} onChange={(event) => setTitle(event.target.value)} />
      </label>

      <label className="details-field">
        Описание
        <textarea
          rows={4}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Markdown-описание"
        />
      </label>

      <div className="details-row">
        <label className="details-field">
          Дата
          <input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} />
        </label>
        <label className="details-field">
          Время
          <input type="time" value={dueTime} onChange={(event) => setDueTime(event.target.value)} />
        </label>
      </div>

      <label className="details-field">
        Приоритет
        <select
          value={priority}
          onChange={(event) => setPriority(event.target.value as TaskDto["priority"])}
        >
          {TASK_PRIORITIES.map((value) => (
            <option key={value} value={value}>
              {TASK_PRIORITY_LABELS_RU[value]}
            </option>
          ))}
        </select>
      </label>

      <label className="details-field">
        Список
        <select
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
        </select>
      </label>

      <label className="details-field">
        Секция
        <select value={sectionId} onChange={(event) => setSectionId(event.target.value)}>
          <option value="">Без секции</option>
          {sections.map((section) => (
            <option key={section.id} value={section.id}>
              {section.name}
            </option>
          ))}
        </select>
      </label>

      <label className="details-field">
        Повтор
        <select value={rrule} onChange={(event) => setRrule(event.target.value)}>
          {repeatOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      <label className="details-check">
        <input
          type="checkbox"
          checked={pinned}
          onChange={(event) => setPinned(event.target.checked)}
        />
        Закреплено
      </label>

      {error && <p className="sidebar-error">{error}</p>}
      {saved && <p className="details-saved">Сохранено</p>}

      <div className="details-actions">
        <button
          className="btn"
          type="button"
          onClick={() => void save()}
          disabled={update.isPending}
        >
          Сохранить
        </button>
        {task.rrule === null ? (
          <button className="btn" type="button" onClick={() => void toggleComplete()}>
            {task.completedAt ? "Вернуть в работу" : "Завершить"}
          </button>
        ) : (
          <>
            <button className="btn" type="button" onClick={() => void toggleComplete()}>
              Завершить вхождение
            </button>
            <button className="btn" type="button" onClick={() => void undoLastCompletion()}>
              Отменить последнее завершение
            </button>
          </>
        )}
        <button className="btn danger" type="button" onClick={() => void remove()}>
          В корзину
        </button>
      </div>
    </aside>
  );
}
