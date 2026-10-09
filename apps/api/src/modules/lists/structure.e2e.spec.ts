import { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import postgres from "postgres";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  authResponseSchema,
  folderSchema,
  listSchema,
  sectionSchema,
  sidebarDtoSchema,
  type AuthResponse,
  type FolderDto,
  type ListDto,
  type SidebarDto,
} from "@plana/shared";
import { AppModule } from "../../app.module";

const TEST_DB_URL = process.env.DATABASE_URL!;

describe("структура: папки, списки, секции (e2e)", () => {
  let app: INestApplication;
  let http: () => request.Agent;
  let session: AuthResponse;

  let work: FolderDto;
  let personal: FolderDto;
  let project: ListDto;
  let home: ListDto;

  const email = `structure-${Date.now()}@example.com`;
  const password = "password123";
  const auth = () => ({ Authorization: `Bearer ${session.accessToken}` });

  async function getSidebar(): Promise<SidebarDto> {
    const res = await http().get("/v1/folders").set(auth()).expect(200);
    return sidebarDtoSchema.parse(res.body);
  }

  beforeAll(async () => {
    const cleanup = postgres(TEST_DB_URL);
    await cleanup`delete from users where email like 'structure-%'`;
    await cleanup.end();

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix("v1");
    await app.init();
    http = () => request(app.getHttpServer());

    const res = await http()
      .post("/v1/auth/register")
      .send({ email, password, name: "Структура" })
      .expect(201);
    session = authResponseSchema.parse(res.body);
  });

  afterAll(async () => {
    await app.close();
  });

  it("GET /v1/folders — у нового пользователя только Inbox", async () => {
    const sidebar = await getSidebar();
    expect(sidebar.inbox.kind).toBe("inbox");
    expect(sidebar.rootLists).toHaveLength(0);
    expect(sidebar.folders).toHaveLength(0);
  });

  it("POST /v1/folders и /v1/lists — папки со списками и корневые списки", async () => {
    work = folderSchema.parse(
      (await http().post("/v1/folders").set(auth()).send({ name: "Работа" }).expect(201)).body,
    );
    personal = folderSchema.parse(
      (await http().post("/v1/folders").set(auth()).send({ name: "Личное" }).expect(201)).body,
    );
    expect(work.position).toBe(0);
    expect(personal.position).toBe(1024);

    project = listSchema.parse(
      (
        await http()
          .post("/v1/lists")
          .set(auth())
          .send({ name: "Проект", color: "blue", emoji: "🚀", folderId: work.id })
          .expect(201)
      ).body,
    );
    home = listSchema.parse(
      (await http().post("/v1/lists").set(auth()).send({ name: "Дом" }).expect(201)).body,
    );
    expect(project.folderId).toBe(work.id);
    expect(home.folderId).toBeNull();

    const sidebar = await getSidebar();
    expect(sidebar.folders.map((f) => f.name)).toEqual(["Работа", "Личное"]);
    expect(sidebar.folders.find((f) => f.name === "Работа")?.lists.map((l) => l.name)).toEqual([
      "Проект",
    ]);
    expect(sidebar.rootLists.map((l) => l.name)).toEqual(["Дом"]);
  });

  it("POST /v1/lists с чужим folderId даёт 404", async () => {
    const res = await http()
      .post("/v1/lists")
      .set(auth())
      .send({ name: "Хак", folderId: "11111111-1111-4111-8111-111111111111" })
      .expect(404);
    expect(res.body.error.code).toBe("NOT_FOUND");
  });

  it("PATCH /v1/lists/:id — переименование, цвет, перенос между папками с позицией", async () => {
    const renamed = listSchema.parse(
      (
        await http()
          .patch(`/v1/lists/${project.id}`)
          .set(auth())
          .send({ name: "Проект X", color: "teal" })
          .expect(200)
      ).body,
    );
    expect(renamed.name).toBe("Проект X");
    expect(renamed.color).toBe("teal");

    await http()
      .post("/v1/lists")
      .set(auth())
      .send({ name: "Календарь", folderId: personal.id })
      .expect(201);

    const moved = listSchema.parse(
      (
        await http()
          .patch(`/v1/lists/${project.id}`)
          .set(auth())
          .send({ folderId: personal.id, position: 1 })
          .expect(200)
      ).body,
    );
    expect(moved.folderId).toBe(personal.id);

    // В "Личном" теперь Календарь (0) и Проект X (1) — позиции перенумерованы с шагом 1024.
    const sidebar = await getSidebar();
    const personalFolder = sidebar.folders.find((f) => f.id === personal.id);
    expect(personalFolder?.lists.map((l) => l.name)).toEqual(["Календарь", "Проект X"]);
    expect(personalFolder?.lists.map((l) => l.position)).toEqual([0, 1024]);
  });

  it("PATCH /v1/folders/:id — перестановка папок по индексу", async () => {
    const moved = folderSchema.parse(
      (
        await http()
          .patch(`/v1/folders/${personal.id}`)
          .set(auth())
          .send({ position: 0 })
          .expect(200)
      ).body,
    );
    expect(moved.position).toBe(0);

    const sidebar = await getSidebar();
    expect(sidebar.folders.map((f) => f.name)).toEqual(["Личное", "Работа"]);
    expect(sidebar.folders.map((f) => f.position)).toEqual([0, 1024]);
  });

  it("Inbox защищён: переименование, перенос и удаление дают 409", async () => {
    const inboxId = (await getSidebar()).inbox.id;

    const rename = await http()
      .patch(`/v1/lists/${inboxId}`)
      .set(auth())
      .send({ name: "Мой входящий" })
      .expect(409);
    expect(rename.body.error.code).toBe("CONFLICT");

    await http().patch(`/v1/lists/${inboxId}`).set(auth()).send({ folderId: work.id }).expect(409);

    await http().delete(`/v1/lists/${inboxId}`).set(auth()).expect(409);
  });

  it("DELETE /v1/lists/:id — в корзину, restore возвращает", async () => {
    await http().delete(`/v1/lists/${home.id}`).set(auth()).expect(204);
    let sidebar = await getSidebar();
    expect(sidebar.rootLists.map((l) => l.id)).not.toContain(home.id);

    const restored = listSchema.parse(
      (await http().post(`/v1/lists/${home.id}/restore`).set(auth()).expect(200)).body,
    );
    expect(restored.trashedAt).toBeNull();

    sidebar = await getSidebar();
    expect(sidebar.rootLists.map((l) => l.id)).toContain(home.id);
  });

  it("DELETE /v1/folders/:id — списки папки выходят в корень", async () => {
    const temp = folderSchema.parse(
      (await http().post("/v1/folders").set(auth()).send({ name: "Временная" }).expect(201)).body,
    );
    const inner = listSchema.parse(
      (
        await http()
          .post("/v1/lists")
          .set(auth())
          .send({ name: "Внутри", folderId: temp.id })
          .expect(201)
      ).body,
    );

    await http().delete(`/v1/folders/${temp.id}`).set(auth()).expect(204);

    const sidebar = await getSidebar();
    expect(sidebar.folders.map((f) => f.id)).not.toContain(temp.id);
    const moved = sidebar.rootLists.find((l) => l.id === inner.id);
    expect(moved?.folderId).toBeNull();
  });

  it("секции: создание, переименование, перестановка, удаление", async () => {
    const first = sectionSchema.parse(
      (
        await http()
          .post(`/v1/lists/${home.id}/sections`)
          .set(auth())
          .send({ name: "Покупки" })
          .expect(201)
      ).body,
    );
    const second = sectionSchema.parse(
      (
        await http()
          .post(`/v1/lists/${home.id}/sections`)
          .set(auth())
          .send({ name: "Звонки" })
          .expect(201)
      ).body,
    );
    expect(first.position).toBe(0);
    expect(second.position).toBe(1024);

    const moved = sectionSchema.parse(
      (
        await http()
          .patch(`/v1/sections/${second.id}`)
          .set(auth())
          .send({ position: 0, name: "Звонки X" })
          .expect(200)
      ).body,
    );
    expect(moved.name).toBe("Звонки X");
    expect(moved.position).toBe(0);

    const back = sectionSchema.parse(
      (await http().patch(`/v1/sections/${first.id}`).set(auth()).send({ position: 0 }).expect(200))
        .body,
    );
    expect(back.position).toBe(0);

    await http().delete(`/v1/sections/${second.id}`).set(auth()).expect(204);
    await http().delete(`/v1/sections/${second.id}`).set(auth()).expect(404);
  });

  it("чужие сущности недоступны: 404 вместо 403", async () => {
    const res = await http()
      .post("/v1/auth/register")
      .send({
        email: `structure-other-${Date.now()}@example.com`,
        password,
        name: "Чужой",
      })
      .expect(201);
    const other = authResponseSchema.parse(res.body);
    const otherAuth = { Authorization: `Bearer ${other.accessToken}` };

    const patchForeign = await http()
      .patch(`/v1/lists/${home.id}`)
      .set(otherAuth)
      .send({ name: "Украдено" })
      .expect(404);
    expect(patchForeign.body.error.code).toBe("NOT_FOUND");

    await http()
      .post("/v1/lists")
      .set(otherAuth)
      .send({ name: "Хак", folderId: work.id })
      .expect(404);

    const otherSidebar = sidebarDtoSchema.parse(
      (await http().get("/v1/folders").set(otherAuth).expect(200)).body,
    );
    expect(otherSidebar.rootLists).toHaveLength(0);
  });

  it("валидация: пустое имя 400 с details, пустой PATCH 400", async () => {
    const create = await http().post("/v1/lists").set(auth()).send({ name: "   " }).expect(400);
    expect(create.body.error.code).toBe("VALIDATION_ERROR");
    expect(create.body.error.details).toBeDefined();

    await http().patch(`/v1/lists/${home.id}`).set(auth()).send({}).expect(400);
  });
});
