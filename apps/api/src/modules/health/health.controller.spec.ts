import { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { AppModule } from "../../app.module";

describe("GET /v1/health", () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix("v1");
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it("отвечает status=ok без авторизации", async () => {
    const response = await request(app.getHttpServer()).get("/v1/health").expect(200);

    expect(response.body).toEqual(
      expect.objectContaining({
        status: "ok",
      }),
    );
  });
});
