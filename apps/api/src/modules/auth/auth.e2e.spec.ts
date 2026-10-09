import { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import postgres from "postgres";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { AppModule } from "../../app.module";
import { authResponseSchema, userSchema, type AuthResponse } from "@plana/shared";

const TEST_DB_URL = process.env.DATABASE_URL!;

describe("auth + me (e2e)", () => {
  let app: INestApplication;
  let http: () => request.Agent;
  const email = `e2e-${Date.now()}@example.com`;
  const password = "password123";
  let session: AuthResponse;

  beforeAll(async () => {
    const cleanup = postgres(TEST_DB_URL);
    await cleanup`delete from users`;
    await cleanup.end();

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix("v1");
    await app.init();
    http = () => request(app.getHttpServer());
  });

  afterAll(async () => {
    await app.close();
  });

  it("POST /v1/auth/register — регистрирует и возвращает сессию", async () => {
    const res = await http()
      .post("/v1/auth/register")
      .send({ email, password, name: "Тест" })
      .expect(201);
    session = authResponseSchema.parse(res.body);
    expect(session.user.email).toBe(email);
    expect(session.user.name).toBe("Тест");
  });

  it("POST /v1/auth/register — занятый email даёт 409", async () => {
    const res = await http()
      .post("/v1/auth/register")
      .send({ email, password, name: "Дубль" })
      .expect(409);
    expect(res.body.error.code).toBe("CONFLICT");
  });

  it("POST /v1/auth/register — короткий пароль даёт 400 с details", async () => {
    const res = await http()
      .post("/v1/auth/register")
      .send({ email: "other@example.com", password: "123", name: "Коротко" })
      .expect(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
    expect(res.body.error.details).toBeDefined();
  });

  it("POST /v1/auth/login — неверный пароль даёт 401", async () => {
    const res = await http()
      .post("/v1/auth/login")
      .send({ email, password: "wrong-password" })
      .expect(401);
    expect(res.body.error.code).toBe("UNAUTHORIZED");
  });

  it("POST /v1/auth/login — верный пароль возвращает сессию", async () => {
    const res = await http().post("/v1/auth/login").send({ email, password }).expect(201);
    const second = authResponseSchema.parse(res.body);
    expect(second.user.id).toBe(session.user.id);
  });

  it("GET /v1/me — без токена 401, с токеном — профиль", async () => {
    const anon = await http().get("/v1/me").expect(401);
    expect(anon.body.error.code).toBe("UNAUTHORIZED");

    const authed = await http()
      .get("/v1/me")
      .set("Authorization", `Bearer ${session.accessToken}`)
      .expect(200);
    expect(userSchema.parse(authed.body).id).toBe(session.user.id);
  });

  it("PATCH /v1/me — меняет тему, отклоняет битую таймзону", async () => {
    const ok = await http()
      .patch("/v1/me")
      .set("Authorization", `Bearer ${session.accessToken}`)
      .send({ theme: "dark", timezone: "Europe/Moscow" })
      .expect(200);
    expect(ok.body.theme).toBe("dark");
    expect(ok.body.timezone).toBe("Europe/Moscow");

    await http()
      .patch("/v1/me")
      .set("Authorization", `Bearer ${session.accessToken}`)
      .send({ timezone: "Not/AZone" })
      .expect(400);
  });

  it("POST /v1/auth/refresh — ротация: старый refresh больше не работает", async () => {
    const res = await http()
      .post("/v1/auth/refresh")
      .send({ refreshToken: session.refreshToken })
      .expect(201);
    const rotated = authResponseSchema.parse(res.body);
    expect(rotated.refreshToken).not.toBe(session.refreshToken);

    // Повторное использование отозванного токена отзывает ВСЕ сессии пользователя.
    await http().post("/v1/auth/refresh").send({ refreshToken: session.refreshToken }).expect(401);
    await http().post("/v1/auth/refresh").send({ refreshToken: rotated.refreshToken }).expect(401);
  });

  it("POST /v1/auth/login — новая сессия после отзыва всех", async () => {
    const res = await http().post("/v1/auth/login").send({ email, password }).expect(201);
    session = authResponseSchema.parse(res.body);

    await http()
      .post("/v1/auth/logout-all")
      .set("Authorization", `Bearer ${session.accessToken}`)
      .expect(201);
    await http().post("/v1/auth/refresh").send({ refreshToken: session.refreshToken }).expect(401);
  });
});
