import { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import postgres from "postgres";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  authResponseSchema,
  parsedQuickAddSchema,
  tagSchema,
  taskSchema,
  type AuthResponse,
  type ListDto,
  type SectionDto,
  type TagDto,
  type TaskDto,
} from "@plana/shared";
import { AppModule } from "../../app.module";

const TEST_DB_URL = process.env.DATABASE_URL!;

describe("теги, поиск, batch-операции, корзина 30 дней (e2e)", () => {
  let app: INestApplication;
  let http: () => request.Agent;
  let session: AuthResponse;
  let stranger: AuthResponse;

  let work: ListDto;
  let section: SectionDto;

  const email = `tags-${Date.now()}@example.com`;
  const strangerEmail = `tags-stranger-${Date.now()}@example.com`;
  const password = "password123";
  const auth = () => ({ Authorization: `Bearer ${session.accessToken}` });
  const strangerAuth = () => ({ Authorization: `Bearer ${stranger.accessToken}` });

  async function createTask(body: Record<string, unknown>): Promise<TaskDto> {
    const res = await http().post("/v1/tasks").set(auth()).send(body).expect(201);
    return taskSchema.parse(res.body);
  }

  async function listTags(): Promise<TagDto[]> {
    const res = await http().get("/v1/tags").set(auth()).expect(200);
    return res.body.map((item: unknown) => tagSchema.parse(item));
  }

  async function listTasks(query: string): Promise<TaskDto[]> {
    const res = await http().get(`/v1/tasks${query}`).set(auth()).expect(200);
    return res.body.items.map((item: unknown) => taskSchema.parse(item));
  }

  beforeAll(async () => {
    const cleanup = postgres(TEST_DB_URL);
    await cleanup`delete from users where email like 'tags-%'`;
    await cleanup.end();

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix("v1");
    await app.init();
    http = () => request(app.getHttpServer());

    session = authResponseSchema.parse(
      (await http().post("/v1/auth/register").send({ email, password, name: "Теги" }).expect(201))
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

    work = (await http().post("/v1/lists").set(auth()).send({ name: "Работа" }).expect(201)).body;

    section = (
      await http()
        .post(`/v1/lists/${work.id}/sections`)
        .set(auth())
        .send({ name: "Дела" })
        .expect(201)
    ).body;
  });

  afterAll(async () => {
    await app.close();
  });

  it("tagNames на создании: неявное создание тегов, tags в TaskDto", async () => {
    const task = await createTask({ title: "Отчёт", tagNames: ["Срочно", "Работа"] });
    expect(task.tags.map((tag) => tag.name).sort()).toEqual(["Работа", "Срочно"]);

    const tags = await listTags();
    expect(tags.map((tag) => tag.name)).toEqual(["Срочно", "Работа"]);
    expect(tags.every((tag) => tag.position >= 0)).toBe(true);
  });

  it("tagNames: дубликаты по lower(name) в одном запросе — 400", async () => {
    await http()
      .post("/v1/tasks")
      .set(auth())
      .send({ title: "Дубль", tagNames: ["Работа", "работа"] })
      .expect(400);
  });

  it("tagNames повторно использует существующий тег по lower(name)", async () => {
    const existing = (await listTags()).find((tag) => tag.name === "Работа");
    expect(existing).toBeDefined();
    const task = await createTask({ title: "Вторая", tagNames: ["РАБОТА"] });
    expect(task.tags.map((tag) => tag.id)).toEqual([existing!.id]);
    // Новый тег не создался.
    expect((await listTags()).length).toBe(2);
  });

  it("PATCH tagNames: полная замена, пустой массив снимает все теги", async () => {
    const task = await createTask({ title: "Замена", tagNames: ["Работа", "Срочно"] });
    const replaced = taskSchema.parse(
      (
        await http()
          .patch(`/v1/tasks/${task.id}`)
          .set(auth())
          .send({ tagNames: ["Дом"] })
          .expect(200)
      ).body,
    );
    expect(replaced.tags.map((tag) => tag.name)).toEqual(["Дом"]);

    const cleared = taskSchema.parse(
      (await http().patch(`/v1/tasks/${task.id}`).set(auth()).send({ tagNames: [] }).expect(200))
        .body,
    );
    expect(cleared.tags).toEqual([]);
  });

  it("GET/PATCH/DELETE /v1/tags: переименование, 409 при клэше, порядок, удаление", async () => {
    const urgent = (await listTags()).find((tag) => tag.name === "Срочно")!;
    const renamed = tagSchema.parse(
      (await http().patch(`/v1/tags/${urgent.id}`).set(auth()).send({ name: "Важное" }).expect(200))
        .body,
    );
    expect(renamed.name).toBe("Важное");

    // Имя (по lower) уже занято тегом «Работа».
    const workTag = (await listTags()).find((tag) => tag.name === "Работа")!;
    await http().patch(`/v1/tags/${workTag.id}`).set(auth()).send({ name: "РАБОТА" }).expect(409);

    // position = целевой индекс: «Работа» на индекс 0.
    const moved = tagSchema.parse(
      (await http().patch(`/v1/tags/${workTag.id}`).set(auth()).send({ position: 0 }).expect(200))
        .body,
    );
    expect(moved.position).toBe(0);
    expect((await listTags()).map((tag) => tag.name)).toEqual(["Работа", "Важное", "Дом"]);

    // Удаление тега снимает его с задач (FK cascade).
    const tagged = await createTask({ title: "С тегом", tagNames: ["Работа"] });
    await http().delete(`/v1/tags/${workTag.id}`).set(auth()).expect(204);
    const after = taskSchema.parse(
      (await http().get(`/v1/tasks/${tagged.id}`).set(auth()).expect(200)).body,
    );
    expect(after.tags).toEqual([]);

    // Чужой тег недоступен.
    const strangerTag = (
      await http()
        .post("/v1/tasks")
        .set(strangerAuth())
        .send({ title: "Чужая", tagNames: ["Личное"] })
        .expect(201)
    ).body.tags[0];
    await http().patch(`/v1/tags/${strangerTag.id}`).set(auth()).send({ name: "X" }).expect(404);
    await http().delete(`/v1/tags/${strangerTag.id}`).set(auth()).expect(404);
    expect((await http().get("/v1/tags").set(strangerAuth()).expect(200)).body.length).toBe(1);
  });

  it("поиск q: по заголовку и описанию, регистронезависимо, спецсимволы экранируются", async () => {
    await createTask({ title: "Купить кофе", description: "зёрна арабики" });
    await createTask({ title: "Купить молоко" });
    await createTask({ title: "План проекта" });

    expect((await listTasks(`?q=${encodeURIComponent("купить")}`)).length).toBe(2);
    expect((await listTasks(`?q=${encodeURIComponent("АРАБИКИ")}`)).length).toBe(1); // по описанию
    expect((await listTasks(`?q=${encodeURIComponent("проекта")}`)).length).toBe(1);
    expect((await listTasks(`?q=${encodeURIComponent("нетсовпадений")}`)).length).toBe(0);

    // % и _ — литералы, не маски: «к%фе» не должно находить «кофе».
    expect((await listTasks(`?q=${encodeURIComponent("к%фе")}`)).length).toBe(0);
    expect((await listTasks(`?q=${encodeURIComponent("к_фе")}`)).length).toBe(0);
  });

  it("фильтр tagId: только задачи с этим тегом", async () => {
    const homeTag = (await listTags()).find((tag) => tag.name === "Дом");
    expect(homeTag).toBeDefined();

    await createTask({ title: "Полить цветы", tagNames: ["Дом"] });
    const filtered = await listTasks(`?tagId=${homeTag!.id}`);
    expect(filtered.length).toBeGreaterThan(0);
    expect(filtered.every((task) => task.tags.some((tag) => tag.id === homeTag!.id))).toBe(true);
  });

  it("POST /v1/tasks/batch: complete/trash/restore/move, чужие id пропускаются", async () => {
    const first = await createTask({ title: "Batch 1" });
    const second = await createTask({ title: "Batch 2" });
    const third = await createTask({ title: "Batch 3" });
    const strangerTask = (
      await http().post("/v1/tasks").set(strangerAuth()).send({ title: "Чужая batch" }).expect(201)
    ).body;

    // complete: чужой id молча пропущен.
    const completed = (
      await http()
        .post("/v1/tasks/batch")
        .set(auth())
        .send({ taskIds: [first.id, second.id, strangerTask.id], action: "complete" })
        .expect(200)
    ).body;
    expect(completed).toEqual({ updated: 2 });
    const doneFirst = taskSchema.parse(
      (await http().get(`/v1/tasks/${first.id}`).set(auth()).expect(200)).body,
    );
    expect(doneFirst.completedAt).not.toBeNull();

    // trash: завершённые тоже можно отправить в корзину.
    const trashed = (
      await http()
        .post("/v1/tasks/batch")
        .set(auth())
        .send({ taskIds: [first.id, second.id, third.id], action: "trash" })
        .expect(200)
    ).body;
    expect(trashed).toEqual({ updated: 3 });
    const trashItems = await listTasks("?smart=trash");
    expect(trashItems.map((task) => task.id).sort()).toEqual(
      [first.id, second.id, third.id].sort(),
    );

    // restore частично; completedAt при этом сохраняется.
    const restored = (
      await http()
        .post("/v1/tasks/batch")
        .set(auth())
        .send({ taskIds: [second.id, third.id], action: "restore" })
        .expect(200)
    ).body;
    expect(restored).toEqual({ updated: 2 });
    expect((await listTasks("?smart=trash")).map((task) => task.id)).toEqual([first.id]);

    // move в список «Работа» без секции — в конец. Берём незавершённые.
    const fourth = await createTask({ title: "Batch 4" });
    const moved = (
      await http()
        .post("/v1/tasks/batch")
        .set(auth())
        .send({ taskIds: [third.id, fourth.id], action: "move", listId: work.id })
        .expect(200)
    ).body;
    expect(moved).toEqual({ updated: 2 });
    const workItems = await listTasks(`?listId=${work.id}`);
    expect(workItems.map((task) => task.id).sort()).toEqual([third.id, fourth.id].sort());
    expect(workItems.every((task) => task.sectionId === null)).toBe(true);

    // move в секцию.
    const movedSection = (
      await http()
        .post("/v1/tasks/batch")
        .set(auth())
        .send({ taskIds: [third.id], action: "move", listId: work.id, sectionId: section.id })
        .expect(200)
    ).body;
    expect(movedSection).toEqual({ updated: 1 });
    const thirdMoved = taskSchema.parse(
      (await http().get(`/v1/tasks/${third.id}`).set(auth()).expect(200)).body,
    );
    expect(thirdMoved.listId).toBe(work.id);
    expect(thirdMoved.sectionId).toBe(section.id);

    // move без listId — 400 (схема).
    await http()
      .post("/v1/tasks/batch")
      .set(auth())
      .send({ taskIds: [third.id], action: "move" })
      .expect(400);

    // Несуществующие id просто пропускаются.
    const noop = (
      await http()
        .post("/v1/tasks/batch")
        .set(auth())
        .send({ taskIds: ["00000000-0000-4000-8000-000000000000"], action: "trash" })
        .expect(200)
    ).body;
    expect(noop).toEqual({ updated: 0 });
  });

  it("lazy purge: задачи в корзине старше 30 дней удаляются при открытии корзины", async () => {
    const stale = await createTask({ title: "Старая из корзины" });
    await http().delete(`/v1/tasks/${stale.id}`).set(auth()).expect(204);
    expect((await listTasks("?smart=trash")).map((task) => task.id)).toContain(stale.id);

    // Симулируем прошедшие 31 день напрямую в БД.
    const db = postgres(TEST_DB_URL);
    await db`update tasks set trashed_at = now() - interval '31 days' where id = ${stale.id}`;
    await db.end();

    expect((await listTasks("?smart=trash")).map((task) => task.id)).not.toContain(stale.id);
    await http().get(`/v1/tasks/${stale.id}`).set(auth()).expect(404);
  });

  it("POST /v1/tasks/parse — хештеги вырезаются из заголовка", async () => {
    const res = await http()
      .post("/v1/tasks/parse")
      .set(auth())
      .send({ text: "Отчёт #работа завтра" })
      .expect(201);
    const parsed = parsedQuickAddSchema.parse(res.body);
    expect(parsed.title).toBe("Отчёт");
    expect(parsed.tags).toEqual(["работа"]);
  });
});
