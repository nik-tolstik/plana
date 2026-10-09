import "dotenv/config";
import { Logger } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { env } from "./config/env";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix("v1");

  const origins = env.CLIENT_ORIGIN.split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
  app.enableCors({ origin: origins, credentials: true });

  await app.listen(env.PORT);
  new Logger("Bootstrap").log(`API: http://localhost:${env.PORT}/v1/health`);
}

void bootstrap();
