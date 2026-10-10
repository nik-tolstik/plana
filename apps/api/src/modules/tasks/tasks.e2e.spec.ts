import { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import postgres from "postgres";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  addDays,
  authResponseSchema,
  parsedQuickAddSchema,
  sectionSchema,
  subtaskSchema,
  taskSchema,
  type AuthResponse,
  type ListDto,
  type SectionDto,
  type SubtaskDto,
  type TaskDto,
} from "@plana/shared";
import { AppModule } from "../../app.module";

const TEST_DB_URL = process.env.DATABASE_URL!;

describe("задачи: CRUD, подзадачи, умные списки, quick-add (e2e)", () => {
  let app: INestApplication;
  let http: () => request.Agent;
  let session: AuthResponse;
  let stranger: AuthResponse;

  let inbox: ListDto;
  let work: ListDto;
  let section: SectionDto;

  // Таймзона пользователя по умолчанию UTC — «сегодня» считаем в UTC.
  const today = new Date().toISOString().slice(0, 10);
  const yesterday = addDays(today, -1);
  const tomorrow = addDays(today, 1);
  const inWeek = addDays(today, 7);
  const afterWeek = addDays(today, 8);

  const email = `tasks-${Date.now()}@example.com`;
  const strangerEmail = `tasks-stranger-${Date.now()}@example.com`;
  const password = "password123";
  const auth = () => ({ Authorization: `Bearer ${session.accessToken}` });

  async function createTask(body: Record<string, unknown>): Promise<TaskDto> {
    const res = await http().post("/v1/tasks").set(auth()).send(body).expect(201);
    return taskSchema.parse(res.body);
  }

  async function createSubtask(taskId: string, title: string): Promise<SubtaskDto> {
    const res = await http()
      .post(`/v1/tasks/${taskId}/subtasks`)
      .set(auth())
      .send({ title })
      .expect(201);
    return subtaskSchema.parse(res.body);
  }

  async function listTasks(query: string): Promise<TaskDto[]> {
    const res = await http().get(`/v1/tasks${query}`).set(auth()).expect(200);
    expect(typeof res.body.total).toBe("number");
    return res.body.items.map((item: unknown) => taskSchema.parse(item));
  }

  beforeAll(async () => {
    const cleanup = postgres(TEST_DB_URL);
    await cleanup`delete from users where email like 'tasks-%'`;
    await cleanup.end();

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix("v1");
    await app.init();
    http = () => request(app.getHttpServer());

    session = authResponseSchema.parse(
      (await http().post("/v1/auth/register").send({ email, password, name: "Задачи" }).expect(201))
        .body,
    );
    stranger = authResponseSchema.parse(
      (
        await http()
          .post("/v1/auth/register")
          .send({ email: strangerEmail, password, name: "Чужой" })
          .expect(201)
      ).body,
    );

    const sidebar = (await http().get("/v1/folders").set(auth()).expect(200)).body;
    inbox = sidebar.inbox;

    work = (await http().post("/v1/lists").set(auth()).send({ name: "Работа" }).expect(201)).body;

    section = sectionSchema.parse(
      (
        await http()
          .post(`/v1/lists/${work.id}/sections`)
          .set(auth())
          .send({ name: "В работе" })
          .expect(201)
      ).body,
    );
  });

  afterAll(async () => {
    await app.close();
  });

  it("POST /v1/tasks — по умолчанию в Inbox, с датой/временем/приоритетом", async () => {
    const plain = await createTask({ title: "Просто задача" });
    expect(plain.listId).toBe(inbox.id);
    expect(plain.sectionId).toBeNull();
    expect(plain.priority).toBe("none");
    expect(plain.dueDate).toBeNull();

    const rich = await createTask({
      title: "Созвон",
      description: "Обсудить релиз",
      priority: "high",
      dueDate: tomorrow,
      dueTime: "11:00",
      pinned: true,
      listId: work.id,
    });
    expect(rich.listId).toBe(work.id);
    expect(rich.priority).toBe("high");
    expect(rich.dueDate).toBe(tomorrow);
    expect(rich.dueTime).toBe("11:00:00");
    expect(rich.pinned).toBe(true);
  });

  it("POST /v1/tasks — валидация: время без даты и пустой заголовок", async () => {
    await http()
      .post("/v1/tasks")
      .set(auth())
      .send({ title: "Без даты", dueTime: "10:00" })
      .expect(400);
    await http().post("/v1/tasks").set(auth()).send({ title: "" }).expect(400);
  });

  it("POST /v1/tasks — чужой список и секция другого списка отклоняются", async () => {
    const strangerList = (
      await http()
        .post("/v1/lists")
        .set({ Authorization: `Bearer ${stranger.accessToken}` })
        .send({ name: "Чужой список" })
        .expect(201)
    ).body;

    await http()
      .post("/v1/tasks")
      .set(auth())
      .send({ title: "Задача", listId: strangerList.id })
      .expect(404);

    const homeList = (await http().post("/v1/lists").set(auth()).send({ name: "Дом" }).expect(201))
      .body;
    // Секция принадлежит «Работе», а задача — списку «Дом».
    await http()
      .post("/v1/tasks")
      .set(auth())
      .send({ title: "Задача", listId: homeList.id, sectionId: section.id })
      .expect(400);
  });

  it("POST /v1/tasks/parse — NLP-разбор без создания", async () => {
    const res = await http()
      .post("/v1/tasks/parse")
      .set(auth())
      .send({ text: `Созвон завтра в 17 !!` })
      .expect(201);
    const parsed = parsedQuickAddSchema.parse(res.body);
    expect(parsed).toEqual({
      title: "Созвон",
      dueDate: tomorrow,
      dueTime: "17:00",
      rrule: null,
      priority: "medium",
    });
  });

  it("подзадачи: создание, порядок, done, удаление", async () => {
    const parent = await createTask({ title: "Релиз" });
    const first = await createSubtask(parent.id, "Шаг 1");
    const second = await createSubtask(parent.id, "Шаг 2");
    expect(first.position).toBe(0);
    expect(second.position).toBe(1024);

    // Переставить «Шаг 2» на индекс 0.
    const moved = subtaskSchema.parse(
      (
        await http()
          .patch(`/v1/subtasks/${second.id}`)
          .set(auth())
          .send({ position: 0 })
          .expect(200)
      ).body,
    );
    expect(moved.position).toBe(0);

    const done = subtaskSchema.parse(
      (await http().patch(`/v1/subtasks/${first.id}`).set(auth()).send({ done: true }).expect(200))
        .body,
    );
    expect(done.done).toBe(true);

    const withSubtasks = taskSchema.parse(
      (await http().get(`/v1/tasks/${parent.id}`).set(auth()).expect(200)).body,
    );
    expect(withSubtasks.subtasks.map((s) => s.title)).toEqual(["Шаг 2", "Шаг 1"]);
    expect(withSubtasks.subtasks[1]?.done).toBe(true);

    await http().delete(`/v1/subtasks/${first.id}`).set(auth()).expect(204);
    const afterDelete = taskSchema.parse(
      (await http().get(`/v1/tasks/${parent.id}`).set(auth()).expect(200)).body,
    );
    expect(afterDelete.subtasks).toHaveLength(1);
  });

  it("GET /v1/tasks?smart — today/tomorrow/next7/all/completed/trash", async () => {
    await createTask({ title: "Просроченная", dueDate: yesterday });
    await createTask({ title: "На сегодня", dueDate: today });
    await createTask({ title: "На завтра", dueDate: tomorrow });
    await createTask({ title: "Через неделю", dueDate: inWeek });
    await createTask({ title: "После недели", dueDate: afterWeek });
    await createTask({ title: "Без даты" });

    const todayTitles = (await listTasks("?smart=today")).map((t) => t.title);
    expect(todayTitles).toContain("Просроченная"); // просроченные входят в «Сегодня»
    expect(todayTitles).toContain("На сегодня");
    expect(todayTitles).not.toContain("На завтра");

    const tomorrowTitles = (await listTasks("?smart=tomorrow")).map((t) => t.title);
    expect(tomorrowTitles).toContain("На завтра");
    expect(tomorrowTitles).not.toContain("На сегодня");

    const weekTitles = (await listTasks("?smart=next7")).map((t) => t.title);
    expect(weekTitles).toContain("На сегодня");
    expect(weekTitles).toContain("На завтра");
    expect(weekTitles).toContain("Через неделю"); // today+7 включительно
    expect(weekTitles).not.toContain("После недели");
    expect(weekTitles).not.toContain("Без даты");

    const allTitles = (await listTasks("?smart=all")).map((t) => t.title);
    expect(allTitles).toContain("Без даты");
    expect(allTitles).toContain("Просроченная");

    // Пагинация.
    const page = await http().get("/v1/tasks?smart=all&limit=2&offset=0").set(auth()).expect(200);
    expect(page.body.items).toHaveLength(2);
    expect(page.body.total).toBeGreaterThanOrEqual(allTitles.length);
  });

  it("GET /v1/tasks?listId — только задачи списка, отсортированные по position", async () => {
    const first = await createTask({ title: "A", listId: work.id, sectionId: section.id });
    const second = await createTask({ title: "B", listId: work.id });
    expect(first.sectionId).toBe(section.id);
    expect(second.sectionId).toBeNull();

    const items = await listTasks(`?listId=${work.id}`);
    const titles = items.filter((t) => !t.sectionId).map((t) => t.title);
    expect(titles).toContain("B");

    // Чужой список — 404.
    const strangerList = (
      await http()
        .post("/v1/lists")
        .set({ Authorization: `Bearer ${stranger.accessToken}` })
        .send({ name: "Чужой" })
        .expect(201)
    ).body;
    await http().get(`/v1/tasks?listId=${strangerList.id}`).set(auth()).expect(404);
  });

  it("PATCH /v1/tasks/:id — переименование, позиция с перенумерацией, перемещение", async () => {
    const order = (await http().post("/v1/lists").set(auth()).send({ name: "Порядок" }).expect(201))
      .body;
    const a = await createTask({ title: "Первая", listId: order.id });
    const b = await createTask({ title: "Вторая", listId: order.id });
    const c = await createTask({ title: "Третья", listId: order.id });

    // «Третья» на индекс 0: позиции [0, 1024, 2048].
    await http().patch(`/v1/tasks/${c.id}`).set(auth()).send({ position: 0 }).expect(200);
    const items = await listTasks(`?listId=${order.id}`);
    const positions = new Map(items.map((t) => [t.title, t.position]));
    expect(positions.get("Третья")).toBe(0);
    expect(positions.get("Первая")).toBe(1024);
    expect(positions.get("Вторая")).toBe(2048);

    const renamed = taskSchema.parse(
      (
        await http()
          .patch(`/v1/tasks/${a.id}`)
          .set(auth())
          .send({ title: "Переименованная", priority: "low" })
          .expect(200)
      ).body,
    );
    expect(renamed.title).toBe("Переименованная");
    expect(renamed.priority).toBe("low");

    // Перемещение в Inbox.
    const moved = taskSchema.parse(
      (await http().patch(`/v1/tasks/${b.id}`).set(auth()).send({ listId: inbox.id }).expect(200))
        .body,
    );
    expect(moved.listId).toBe(inbox.id);

    // Пустой patch — 400.
    await http().patch(`/v1/tasks/${a.id}`).set(auth()).send({}).expect(400);
  });

  it("complete/uncomplete — завершение и возврат", async () => {
    const task = await createTask({ title: "Будет закрыта" });
    const completed = taskSchema.parse(
      (await http().post(`/v1/tasks/${task.id}/complete`).set(auth()).expect(200)).body,
    );
    expect(completed.completedAt).not.toBeNull();

    const completedList = await listTasks("?smart=completed");
    expect(completedList.map((t) => t.title)).toContain("Будет закрыта");
    const allList = await listTasks("?smart=all");
    expect(allList.map((t) => t.title)).not.toContain("Будет закрыта");

    // Повторный complete идемпотентен.
    await http().post(`/v1/tasks/${task.id}/complete`).set(auth()).expect(200);

    const reopened = taskSchema.parse(
      (await http().post(`/v1/tasks/${task.id}/uncomplete`).set(auth()).expect(200)).body,
    );
    expect(reopened.completedAt).toBeNull();
  });

  it("корзина: trash → restore → purge", async () => {
    const task = await createTask({ title: "В корзину" });
    await http().delete(`/v1/tasks/${task.id}`).set(auth()).expect(204);

    const trash = await listTasks("?smart=trash");
    expect(trash.map((t) => t.title)).toContain("В корзину");
    const all = await listTasks("?smart=all");
    expect(all.map((t) => t.title)).not.toContain("В корзину");

    const restored = taskSchema.parse(
      (await http().post(`/v1/tasks/${task.id}/restore`).set(auth()).expect(200)).body,
    );
    expect(restored.trashedAt).toBeNull();

    // Повторный restore уже не находит задачу.
    await http().post(`/v1/tasks/${task.id}/restore`).set(auth()).expect(404);

    await http().delete(`/v1/tasks/${task.id}?purge=true`).set(auth()).expect(204);
    await http().get(`/v1/tasks/${task.id}`).set(auth()).expect(404);
  });

  it("чужая задача — 404 на чтение, правку, завершение", async () => {
    const strangerTask = (
      await http()
        .post("/v1/tasks")
        .set({ Authorization: `Bearer ${stranger.accessToken}` })
        .send({ title: "Не трогать" })
        .expect(201)
    ).body;

    await http().get(`/v1/tasks/${strangerTask.id}`).set(auth()).expect(404);
    await http()
      .patch(`/v1/tasks/${strangerTask.id}`)
      .set(auth())
      .send({ title: "Взлом" })
      .expect(404);
    await http().post(`/v1/tasks/${strangerTask.id}/complete`).set(auth()).expect(404);
    await http().delete(`/v1/tasks/${strangerTask.id}`).set(auth()).expect(404);
  });

  it("GET /v1/lists/:id/sections — секции списка", async () => {
    const res = await http().get(`/v1/lists/${work.id}/sections`).set(auth()).expect(200);
    const items: SectionDto[] = res.body.map((item: unknown) => sectionSchema.parse(item));
    expect(items.map((s) => s.name)).toEqual(["В работе"]);
  });
});
