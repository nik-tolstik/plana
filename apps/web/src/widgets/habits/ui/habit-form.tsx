import { useState } from "react";
import {
  HABIT_COLORS,
  HABIT_TYPE_LABELS_RU,
  HABIT_TYPES,
  type HabitType,
  type ListColor,
} from "@plana/shared";
import { useCreateHabit } from "@/features/habit-manage";
import { errorMessage } from "@/shared/lib/error-message";
import { HABIT_WEEKDAY_SHORT_RU } from "@plana/shared";

const COLOR_LABELS_RU: Record<ListColor, string> = {
  gray: "Серый",
  red: "Красный",
  orange: "Оранжевый",
  yellow: "Жёлтый",
  green: "Зелёный",
  teal: "Бирюзовый",
  blue: "Синий",
  violet: "Фиолетовый",
  pink: "Розовый",
};

/** Форма новой привычки: название, тип, цель, дни недели, цвет. */
export function HabitForm() {
  const create = useCreateHabit();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState<HabitType>("check");
  const [targetValue, setTargetValue] = useState("8");
  const [days, setDays] = useState<number[]>([0, 1, 2, 3, 4, 5, 6]);
  const [color, setColor] = useState<ListColor>("blue");
  const [error, setError] = useState<string | null>(null);

  function toggleDay(bit: number) {
    setDays((current) =>
      current.includes(bit) ? current.filter((day) => day !== bit) : [...current, bit],
    );
  }

  async function submit() {
    const trimmed = name.trim();
    if (trimmed.length === 0) {
      setError("Введите название привычки");
      return;
    }
    if (days.length === 0) {
      setError("Выберите хотя бы один день недели");
      return;
    }
    try {
      await create.mutateAsync({
        name: trimmed,
        type,
        ...(type === "number" ? { targetValue: Number(targetValue) || 1 } : {}),
        daysOfWeek: days.reduce((mask, bit) => mask | (1 << bit), 0),
        color,
      });
      setName("");
      setError(null);
      setOpen(false);
    } catch (cause) {
      setError(errorMessage(cause));
    }
  }

  if (!open) {
    return (
      <button className="add-btn" type="button" onClick={() => setOpen(true)}>
        + Привычка
      </button>
    );
  }

  return (
    <form
      className="habit-form"
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
    >
      <input
        aria-label="Название привычки"
        autoFocus
        placeholder="Например: Зарядка"
        value={name}
        onChange={(event) => setName(event.target.value)}
      />

      <div className="habit-form-row">
        <label>
          Тип
          <select value={type} onChange={(event) => setType(event.target.value as HabitType)}>
            {HABIT_TYPES.map((value) => (
              <option key={value} value={value}>
                {HABIT_TYPE_LABELS_RU[value]}
              </option>
            ))}
          </select>
        </label>
        {type === "number" && (
          <label>
            Цель в день
            <input
              max="1000"
              min="1"
              type="number"
              value={targetValue}
              onChange={(event) => setTargetValue(event.target.value)}
            />
          </label>
        )}
        <label>
          Цвет
          <select value={color} onChange={(event) => setColor(event.target.value as ListColor)}>
            {HABIT_COLORS.map((value) => (
              <option key={value} value={value}>
                {COLOR_LABELS_RU[value]}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="habit-form-days">
        {HABIT_WEEKDAY_SHORT_RU.map((title, bit) => (
          <label key={title} className="habit-day-toggle">
            <input checked={days.includes(bit)} type="checkbox" onChange={() => toggleDay(bit)} />
            {title}
          </label>
        ))}
      </div>

      {error && <p className="sidebar-error">{error}</p>}

      <div className="habit-form-actions">
        <button disabled={create.isPending} type="submit">
          Создать
        </button>
        <button onClick={() => setOpen(false)} type="button">
          Отмена
        </button>
      </div>
    </form>
  );
}
