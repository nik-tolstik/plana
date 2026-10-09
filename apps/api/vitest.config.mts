import swc from "unplugin-swc";
import { defineConfig } from "vitest/config";

// unplugin-swc нужен для emitDecoratorMetadata: esbuild/vitest из коробки
// не умеет метаданные декораторов, которые требует DI в NestJS.
export default defineConfig({
  plugins: [swc.vite()],
  test: {
    environment: "node",
    include: ["src/**/*.spec.ts"],
  },
});
