import { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import postgres from "postgres";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  addDays,
  authResponseSchema,
  habitEntrySchema,
  habitWithEntriesSchema,
  type AuthResponse,
  type HabitWithEntriesDto,
} from "@plana/shared";
import { AppModule } from "../../app.module";

const TEST_DB_URL = process.env.DATABASE_URL!;

describe("привычки: CRUD, отметки, стрики-данные, окно 60 дней (e2e)", () => {
  let app: INestApplication;
  let http: () => request.Agent;
  let session: AuthResponse;
  let stranger: AuthResponse;

  const email = `habits-${Date.now()}@example.com`;
  const strangerEmail = `habits-stranger-${Date.now()}@example.com`;
  const password = "password123";
  const auth = () => ({ Authorization: `Bearer ${session.accessToken}` });
  const strangerAuth = () => ({ Authorization: `Bearer ${stranger.accessToken}` });

  // Таймзона по умолчанию UTC.
  const today = new Date().toISOString().slice(0, 10);
  const yesterday = addDays(today, -1);

  async function createHabit(body: Record<string, unknown>): Promise<HabitWithEntriesDto> {
    const res = await http().post("/v1/habits").set(auth()).send(body).expect(201);
    return habitWithEntriesSchema.parse(res.body);
  }

  async function listHabits(): Promise<HabitWithEntriesDto[]> {
    const res = await http().get("/v1/habits").set(auth()).expect(200);
    return res.body.map((item: unknown) => habitWithEntriesSchema.parse(item));
  }

  beforeAll(async () => {
    const cleanup = postgres(TEST_DB_URL);
    await cleanup`delete from users where email like 'habits-%'`;
    await cleanup.end();

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix("v1");
    await app.init();
    http = () => request(app.getHttpServer());

    session = authResponseSchema.parse(
      (
        await http()
          .post("/v1/auth/register")
          .send({ email, password, name: "Привычки" })
          .expect(201)
      ).body,
    );
    stranger = authResponseSchema.parse(
      (
        await http()
          .post("/v1/auth/register")
          .send({ email: strangerEmail, password, name: "Чужой" })
          .expect(201)
      ).body,
    );
  });

  afterAll(async () => {
    await app.close();
  });

  it("POST /v1/habits — check по умолчанию, position с шагом 1024", async () => {
    const first = await createHabit({ name: "Зарядка" });
    expect(first.type).toBe("check");
    expect(first.targetValue).toBeNull();
    expect(first.daysOfWeek).toBe(127);
    expect(first.color).toBe("gray");
    expect(first.position).toBe(0);
    expect(first.entries).toEqual([]);

    const second = await createHabit({ name: "Вода", color: "blue", daysOfWeek: 62 });
    expect(second.position).toBe(1024);
    expect(second.color).toBe("blue");
    expect(second.daysOfWeek).toBe(62);
  });

  it("POST: number требует targetValue, check запрещает", async () => {
    await http().post("/v1/habits").set(auth()).send({ name: "Шаги", type: "number" }).expect(400);
    await http()
      .post("/v1/habits")
      .set(auth())
      .send({ name: "Брак", type: "check", targetValue: 5 })
      .expect(400);
    const steps = await createHabit({ name: "Стаканы воды", type: "number", targetValue: 8 });
    expect(steps.targetValue).toBe(8);
  });

  it("PUT entries/:date — идемпотентный upsert, границы value по типу", async () => {
    const check = await createHabit({ name: "Медитация" });

    const entry = habitEntrySchema.parse(
      (
        await http()
          .put(`/v1/habits/${check.id}/entries/${today}`)
          .set(auth())
          .send({ value: 1 })
          .expect(200)
      ).body,
    );
    expect(entry.value).toBe(1);

    // Повтор с другим значением — обновление, не дубликат.
    const updated = habitEntrySchema.parse(
      (
        await http()
          .put(`/v1/habits/${check.id}/entries/${today}`)
          .set(auth())
          .send({ value: 0 })
          .expect(200)
      ).body,
    );
    expect(updated.value).toBe(0);

    // check — только 0/1.
    await http()
      .put(`/v1/habits/${check.id}/entries/${today}`)
      .set(auth())
      .send({ value: 2 })
      .expect(400);

    const habits = await listHabits();
    const withEntries = habits.find((habit) => habit.id === check.id)!;
    expect(withEntries.entries).toEqual([{ date: today, value: 0 }]);

    // number: 0..targetValue*2.
    const steps = (await listHabits()).find((habit) => habit.name === "Стаканы воды")!;
    await http()
      .put(`/v1/habits/${steps.id}/entries/${today}`)
      .set(auth())
      .send({ value: 8 })
      .expect(200);
    await http()
      .put(`/v1/habits/${steps.id}/entries/${today}`)
      .set(auth())
      .send({ value: 17 })
      .expect(400);
  });

  it("отметки: будущий день 400, чужая привычка 404, битая дата 400", async () => {
    const check = await createHabit({ name: "Дневник" });
    await http()
      .put(`/v1/habits/${check.id}/entries/${addDays(today, 1)}`)
      .set(auth())
      .send({ value: 1 })
      .expect(400);

    const strangerHabit = (
      await http().post("/v1/habits").set(strangerAuth()).send({ name: "Чужая" }).expect(201)
    ).body;
    await http()
      .put(`/v1/habits/${strangerHabit.id}/entries/${today}`)
      .set(auth())
      .send({ value: 1 })
      .expect(404);

    await http()
      .put(`/v1/habits/${check.id}/entries/2026-13-40`)
      .set(auth())
      .send({ value: 1 })
      .expect(400);
  });

  it("GET /v1/habits — окно 60 дней: старые вхождения не возвращаются", async () => {
    const check = await createHabit({ name: "Окно" });
    const sql = postgres(TEST_DB_URL);
    // Вчера (в окне) и 70 дней назад (вне окна) — напрямую в БД.
    await sql`insert into habit_entries (habit_id, user_id, date, value)
      values (${check.id}, ${session.user.id}, ${yesterday}, 1),
             (${check.id}, ${session.user.id}, ${addDays(today, -70)}, 1)`;
    await sql.end();

    const habit = (await listHabits()).find((candidate) => candidate.id === check.id)!;
    expect(habit.entries).toEqual([{ date: yesterday, value: 1 }]);
  });

  it("PATCH: переименование, daysOfWeek, смена типа на number без цели — 400", async () => {
    const check = await createHabit({ name: "Бег" });
    const renamed = habitWithEntriesSchema.parse(
      (
        await http()
          .patch(`/v1/habits/${check.id}`)
          .set(auth())
          .send({ name: "Бег трусцой", daysOfWeek: 31 })
          .expect(200)
      ).body,
    );
    expect(renamed.name).toBe("Бег трусцой");
    expect(renamed.daysOfWeek).toBe(31);

    await http().patch(`/v1/habits/${check.id}`).set(auth()).send({ type: "number" }).expect(400);

    const converted = habitWithEntriesSchema.parse(
      (
        await http()
          .patch(`/v1/habits/${check.id}`)
          .set(auth())
          .send({ type: "number", targetValue: 3 })
          .expect(200)
      ).body,
    );
    expect(converted.type).toBe("number");
    expect(converted.targetValue).toBe(3);

    // position = целевой индекс.
    const moved = habitWithEntriesSchema.parse(
      (await http().patch(`/v1/habits/${check.id}`).set(auth()).send({ position: 0 }).expect(200))
        .body,
    );
    expect(moved.position).toBe(0);
  });

  it("архив: archivedAt ставится, отметки запрещены, восстановление", async () => {
    const check = await createHabit({ name: "Читать" });
    const archived = habitWithEntriesSchema.parse(
      (
        await http()
          .patch(`/v1/habits/${check.id}`)
          .set(auth())
          .send({ archived: true })
          .expect(200)
      ).body,
    );
    expect(archived.archivedAt).not.toBeNull();

    await http()
      .put(`/v1/habits/${check.id}/entries/${today}`)
      .set(auth())
      .send({ value: 1 })
      .expect(400);

    const restored = habitWithEntriesSchema.parse(
      (
        await http()
          .patch(`/v1/habits/${check.id}`)
          .set(auth())
          .send({ archived: false })
          .expect(200)
      ).body,
    );
    expect(restored.archivedAt).toBeNull();
  });

  it("DELETE entries/:date — снимает отметку (идемпотентно)", async () => {
    const check = await createHabit({ name: "Гитара" });
    await http()
      .put(`/v1/habits/${check.id}/entries/${yesterday}`)
      .set(auth())
      .send({ value: 1 })
      .expect(200);

    await http().delete(`/v1/habits/${check.id}/entries/${yesterday}`).set(auth()).expect(204);
    // Повторное удаление — тоже 204.
    await http().delete(`/v1/habits/${check.id}/entries/${yesterday}`).set(auth()).expect(204);

    const habit = (await listHabits()).find((candidate) => candidate.id === check.id)!;
    expect(habit.entries).toEqual([]);
  });

  it("DELETE /v1/habits/:id — физическое удаление с вхождениями", async () => {
    const check = await createHabit({ name: "Временная" });
    await http()
      .put(`/v1/habits/${check.id}/entries/${today}`)
      .set(auth())
      .send({ value: 1 })
      .expect(200);
    await http().delete(`/v1/habits/${check.id}`).set(auth()).expect(204);
    expect((await listHabits()).some((habit) => habit.id === check.id)).toBe(false);
    await http().patch(`/v1/habits/${check.id}`).set(auth()).send({ name: "X" }).expect(404);
  });
});
