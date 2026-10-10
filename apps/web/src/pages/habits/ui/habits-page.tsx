import { todayInZone } from "@plana/shared";
import { useHabitsQuery } from "@/entities/habit";
import { useUserTimezone } from "@/entities/task";
import { HabitForm, HabitsList } from "@/widgets/habits";

/** Трекер привычек: чек-ины, стрики и календарь месяца. */
export function HabitsPage() {
  const habitsQuery = useHabitsQuery();
  const timezone = useUserTimezone();
  const today = todayInZone(new Date(), timezone);
  const habits = habitsQuery.data ?? [];

  return (
    <div className="page-columns">
      <div className="page-main">
        <header className="page-header">
          <h1>Привычки</h1>
        </header>

        <HabitForm />

        {habitsQuery.isPending && <p className="page-status">Загрузка…</p>}
        {habitsQuery.isError && <p className="page-error">Не удалось загрузить привычки</p>}

        {habits.filter((habit) => habit.archivedAt === null).length === 0 &&
          !habitsQuery.isPending && (
            <p className="tasks-empty">
              {habits.length === 0
                ? "Привычек пока нет — добавьте первую: зарядка, вода, чтение"
                : "Активных привычек нет — все в архиве"}
            </p>
          )}

        <HabitsList habits={habits} today={today} />
      </div>
    </div>
  );
}
