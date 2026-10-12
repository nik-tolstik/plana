import path from "node:path";
import type { StorybookConfig } from "@storybook/react-vite";
import { mergeConfig } from "vite";

const config: StorybookConfig = {
  stories: ["../src/**/*.stories.@(ts|tsx)"],
  addons: ["@storybook/addon-docs", "@storybook/addon-a11y"],
  framework: {
    name: "@storybook/react-vite",
    options: {},
  },
  viteFinal: async (config) =>
    mergeConfig(config, {
      resolve: {
        alias: {
          "@": path.resolve(process.cwd(), "src"),
          "@plana/shared": path.resolve(process.cwd(), "../../packages/shared/src/index.ts"),
        },
      },
    }),
};

export default config;
