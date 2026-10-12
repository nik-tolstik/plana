import "@fontsource-variable/onest";

import type { Decorator, Preview } from "@storybook/react-vite";
import { useEffect } from "react";

import "../src/shared/styles/globals.css";

type StorybookTheme = "light" | "dark";

const preview: Preview = {
  globals: {
    theme: "light",
  },
  globalTypes: {
    theme: {
      description: "Тема дизайн-системы",
      toolbar: {
        title: "Тема",
        icon: "mirror",
        items: [
          { value: "light", title: "Светлая", right: "○" },
          { value: "dark", title: "Тёмная", right: "●" },
        ],
        dynamicTitle: true,
      },
    },
  },
  decorators: [
    ((Story, context) => {
      const theme = context.globals.theme as StorybookTheme;
      useEffect(() => {
        document.documentElement.classList.toggle("dark", theme === "dark");
        document.documentElement.classList.toggle("light", theme !== "dark");
      }, [theme]);
      return <Story />;
    }) satisfies Decorator,
  ],
};

export default preview;
