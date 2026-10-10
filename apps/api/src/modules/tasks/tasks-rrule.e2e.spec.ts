import { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import postgres from "postgres";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  addDays,
  authResponseSchema,
  taskSchema,
  type AuthResponse,
  type TaskDto,
} from "@plana/shared";
import { AppModule } from "../../app.module";

const TEST_DB_URL = process.env.DATABASE_URL!;

describe("повторяющиеся задачи: RRULE (e2e)", () => {
  let app: INestApplication;
  let http: () => request.Agent;
  let session: AuthResponse;

  // Таймзона пользователя по умолчанию UTC — «сегодня» считаем в UTC.
  const today = new Date().toISOString().slice(0, 10);
  const yesterday = addDays(today, -1);
  const tomorrow = addDays(today, 1);

  const email = `rrule-${Date.now()}@example.com`;
  const password = "password123";
  const auth = () => ({ Authorization: `Bearer ${session.accessToken}` });

  async function createTask(body: Record<string, unknown>): Promise<TaskDto> {
    const res = await http().post("/v1/tasks").set(auth()).send(body).expect(201);
    return taskSchema.parse(res.body);
  }

  async function completeTask(taskId: string): Promise<TaskDto> {
    const res = await http().post(`/v1/tasks/${taskId}/complete`).set(auth()).expect(200);
    return taskSchema.parse(res.body);
  }

  async function uncompleteTask(taskId: string): Promise<TaskDto> {
    const res = await http().post(`/v1/tasks/${taskId}/uncomplete`).set(auth()).expect(200);
    return taskSchema.parse(res.body);
  }

  beforeAll(async () => {
    const cleanup = postgres(TEST_DB_URL);
    await cleanup`delete from users where email like 'rrule-%'`;
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
          .send({ email, password, name: "Повторы" })
          .expect(201)
      ).body,
    );
  });

  afterAll(async () => {
    await app.close();
  });

  it("создание с повтором: rruleStartDate = dueDate; валидация", async () => {
    const task = await createTask({ title: "Зарядка", dueDate: today, rrule: "FREQ=DAILY" });
    expect(task.rrule).toBe("FREQ=DAILY");
    expect(task.rruleStartDate).toBe(today);

    await http()
      .post("/v1/tasks")
      .set(auth())
      .send({ title: "Без даты", rrule: "FREQ=DAILY" })
      .expect(400);
    await http()
      .post("/v1/tasks")
      .set(auth())
      .send({ title: "Мусор", dueDate: today, rrule: "FREQ=HOURLY" })
      .expect(400);
    await http()
      .post("/v1/tasks")
      .set(auth())
      .send({ title: "Мусор", dueDate: today, rrule: "FREQ=MONTHLY;BYDAY=MO" })
      .expect(400);
  });

  it("ежедневный повтор: завершение сдвигает дату, откат возвращает вхождение", async () => {
    const task = await createTask({ title: "Ежедневная", dueDate: today, rrule: "FREQ=DAILY" });

    const first = await completeTask(task.id);
    expect(first.dueDate).toBe(tomorrow);
    expect(first.completedAt).toBeNull();

    const second = await completeTask(task.id);
    expect(second.dueDate).toBe(addDays(today, 2));

    const undoOnce = await uncompleteTask(task.id);
    expect(undoOnce.dueDate).toBe(tomorrow);

    const undoTwice = await uncompleteTask(task.id);
    expect(undoTwice.dueDate).toBe(today);

    // История пуста — откат ничего не меняет.
    const undoNoop = await uncompleteTask(task.id);
    expect(undoNoop.dueDate).toBe(today);
  });

  it("просроченное вхождение пропускается: следующее после сегодня", async () => {
    const task = await createTask({
      title: "Просроченная",
      dueDate: yesterday,
      rrule: "FREQ=DAILY",
    });
    const result = await completeTask(task.id);
    expect(result.dueDate).toBe(tomorrow);
  });

  it("недельный BYDAY: пн → пт той же недели", async () => {
    // 2027-01-04 — понедельник.
    const task = await createTask({
      title: "Пн/Пт",
      dueDate: "2027-01-04",
      rrule: "FREQ=WEEKLY;BYDAY=MO,FR",
    });
    const result = await completeTask(task.id);
    expect(result.dueDate).toBe("2027-01-08");
    const undone = await uncompleteTask(task.id);
    expect(undone.dueDate).toBe("2027-01-04");
  });

  it("месячный повтор: 31 января → 28 февраля", async () => {
    const task = await createTask({
      title: "Месячная",
      dueDate: "2027-01-31",
      rrule: "FREQ=MONTHLY",
    });
    const result = await completeTask(task.id);
    expect(result.dueDate).toBe("2027-02-28");
  });

  it("COUNT исчерпывается: последнее вхождение закрывает задачу", async () => {
    const task = await createTask({
      title: "Двухразовая",
      dueDate: "2027-03-01",
      rrule: "FREQ=DAILY;COUNT=2",
    });
    const first = await completeTask(task.id);
    expect(first.dueDate).toBe("2027-03-02");
    expect(first.completedAt).toBeNull();

    const second = await completeTask(task.id);
    expect(second.completedAt).not.toBeNull();
    expect(second.dueDate).toBe("2027-03-02");

    const undone = await uncompleteTask(task.id);
    expect(undone.completedAt).toBeNull();
    expect(undone.dueDate).toBe("2027-03-02");
  });

  it("UNTIL включительно: после последнего дня задача закрывается", async () => {
    const task = await createTask({
      title: "До среды",
      dueDate: "2027-03-01",
      rrule: "FREQ=DAILY;UNTIL=2027-03-02",
    });
    const first = await completeTask(task.id);
    expect(first.dueDate).toBe("2027-03-02");
    const second = await completeTask(task.id);
    expect(second.completedAt).not.toBeNull();
  });

  it("правка: смена даты перезапускает шаблон и чистит историю", async () => {
    const task = await createTask({ title: "Перенос", dueDate: today, rrule: "FREQ=DAILY" });
    await completeTask(task.id); // dueDate → завтра, вхождение в истории

    const res = await http()
      .patch(`/v1/tasks/${task.id}`)
      .set(auth())
      .send({ dueDate: "2027-06-01" })
      .expect(200);
    const moved = taskSchema.parse(res.body);
    expect(moved.rruleStartDate).toBe("2027-06-01");

    const undone = await uncompleteTask(task.id);
    expect(undone.dueDate).toBe("2027-06-01"); // истории нет — откат ничего не меняет
  });

  it("правка: снять повтор; повтор на задачу без даты нельзя", async () => {
    const task = await createTask({ title: "Снять повтор", dueDate: today, rrule: "FREQ=DAILY" });
    const res = await http()
      .patch(`/v1/tasks/${task.id}`)
      .set(auth())
      .send({ rrule: null })
      .expect(200);
    const cleared = taskSchema.parse(res.body);
    expect(cleared.rrule).toBeNull();
    expect(cleared.rruleStartDate).toBeNull();

    const noDate = await createTask({ title: "Без даты" });
    await http()
      .patch(`/v1/tasks/${noDate.id}`)
      .set(auth())
      .send({ rrule: "FREQ=DAILY" })
      .expect(400);
  });

  it("parse: повторы в quick-add", async () => {
    const res = await http()
      .post("/v1/tasks/parse")
      .set(auth())
      .send({ text: "Полив цветов каждый день" })
      .expect(201);
    expect(res.body).toMatchObject({ title: "Полив цветов", dueDate: today, rrule: "FREQ=DAILY" });

    const weekdays = await http()
      .post("/v1/tasks/parse")
      .set(auth())
      .send({ text: "Статус по будням в 10" })
      .expect(201);
    expect(weekdays.body).toMatchObject({
      title: "Статус",
      dueTime: "10:00",
      rrule: "FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR",
    });
  });
});
