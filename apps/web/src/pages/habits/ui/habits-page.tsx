import { todayInZone } from "@plana/shared";
import { useHabitsQuery } from "@/entities/habit";
import { useUserTimezone } from "@/entities/user";
import { PageFade, Skeleton } from "@/shared/ui";
import { HabitForm, HabitsList } from "@/widgets/habits";

/** Трекер привычек: чек-ины, стрики и календарь месяца. */
export function HabitsPage() {
  const habitsQuery = useHabitsQuery();
  const timezone = useUserTimezone();
  const today = todayInZone(new Date(), timezone);
  const habits = habitsQuery.data ?? [];

  return (
    <PageFade className="min-w-0 max-w-[640px] flex-1 flex-col gap-3">
      <header>
        <h1 className="mb-3 text-xl font-semibold">Привычки</h1>
      </header>

      <HabitForm />

      {habitsQuery.isPending ? (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-40 w-full rounded-xl" />
          <Skeleton className="h-40 w-full rounded-xl" />
        </div>
      ) : null}
      {habitsQuery.isError ? (
        <p className="text-destructive">Не удалось загрузить привычки</p>
      ) : null}

      {habits.filter((habit) => habit.archivedAt === null).length === 0 &&
      !habitsQuery.isPending ? (
        <p className="py-8 text-center text-muted-foreground">
          {habits.length === 0
            ? "Привычек пока нет — добавьте первую: зарядка, вода, чтение"
            : "Активных привычек нет — все в архиве"}
        </p>
      ) : null}

      <HabitsList habits={habits} today={today} />
    </PageFade>
  );
}
