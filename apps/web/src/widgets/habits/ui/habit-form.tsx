import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { PlusIcon } from "lucide-react";
import { HABIT_COLORS, HABIT_TYPES, type HabitType, type ListColor } from "@plana/shared";
import { useCreateHabit } from "@/features/habit-manage";
import { errorMessage } from "@/shared/lib/error-message";
import { cn } from "@/shared/lib/cn";
import { HABIT_TYPE_LABELS_RU, HABIT_WEEKDAY_SHORT_RU } from "@/shared/lib/habit-label";
import { Button, Input, Label, Select } from "@/shared/ui";
import { ENTITY_COLORS } from "@/shared/ui";

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
  const prefersReducedMotion = useReducedMotion();

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

  return (
    <AnimatePresence initial={false}>
      {open ? (
        <motion.form
          key="habit-form"
          className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4"
          initial={prefersReducedMotion ? false : { height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          onSubmit={(event) => {
            event.preventDefault();
            void submit();
          }}
        >
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="habit-name">Название привычки</Label>
            <Input
              id="habit-name"
              autoFocus
              placeholder="Например: Зарядка"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="habit-type">Тип</Label>
              <Select
                id="habit-type"
                options={HABIT_TYPES.map((value) => ({
                  value,
                  label: HABIT_TYPE_LABELS_RU[value],
                }))}
                value={type}
                onChange={(next) => setType(next as HabitType)}
              />
            </div>
            {type === "number" ? (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="habit-target">Цель в день</Label>
                <Input
                  id="habit-target"
                  max="1000"
                  min="1"
                  type="number"
                  value={targetValue}
                  onChange={(event) => setTargetValue(event.target.value)}
                />
              </div>
            ) : null}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="habit-color">Цвет</Label>
              <Select
                id="habit-color"
                options={HABIT_COLORS.map((value) => ({
                  value,
                  label: COLOR_LABELS_RU[value],
                }))}
                value={color}
                onChange={(next) => setColor(next as ListColor)}
              />
              <span
                aria-hidden="true"
                className="mt-1 size-3 self-start rounded-full"
                style={{ background: ENTITY_COLORS[color] }}
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {HABIT_WEEKDAY_SHORT_RU.map((title, bit) => {
              const selected = days.includes(bit);
              return (
                <button
                  key={title}
                  type="button"
                  aria-pressed={selected}
                  className={cn(
                    "h-8 w-10 cursor-pointer rounded-md text-xs font-medium transition-colors",
                    selected
                      ? "bg-primary text-primary-foreground"
                      : "bg-control text-muted-foreground hover:bg-control-hover hover:text-foreground",
                  )}
                  onClick={() => toggleDay(bit)}
                >
                  {title}
                </button>
              );
            })}
          </div>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          <div className="flex gap-2">
            <Button disabled={create.isPending} type="submit">
              Создать
            </Button>
            <Button variant="ghost" onClick={() => setOpen(false)} type="button">
              Отмена
            </Button>
          </div>
        </motion.form>
      ) : (
        <motion.div key="habit-add" initial={false} exit={{ opacity: 0 }}>
          <Button
            variant="ghost"
            size="sm"
            className="justify-start text-muted-foreground hover:text-foreground"
            onClick={() => setOpen(true)}
          >
            <PlusIcon /> Привычка
          </Button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
