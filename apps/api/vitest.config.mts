import swc from "unplugin-swc";
import { defineConfig } from "vitest/config";

// unplugin-swc нужен для emitDecoratorMetadata: esbuild/vitest из коробки
// не умеет метаданные декораторов, которые требует DI в NestJS.
export default defineConfig({
  plugins: [swc.vite()],
  test: {
    environment: "node",
    include: ["src/**/*.spec.ts"],
    globalSetup: "./src/test/global-setup.ts",
    env: {
      DATABASE_URL: process.env.DATABASE_URL ?? "postgres://plana:plana@localhost:55434/plana_test",
      JWT_SECRET: process.env.JWT_SECRET ?? "test-jwt-secret-0123456789abcdef0123456789abcdef",
      APP_VERSION: "test",
    },
  },
});
