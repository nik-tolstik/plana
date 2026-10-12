import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router";
import { AppProviders } from "@/app/providers";
import { router } from "@/app/routes";
import { initTheme } from "@/features/theme-switch";
import "@fontsource-variable/onest";
import "@/shared/styles/globals.css";

initTheme();

const container = document.getElementById("root");
if (!container) {
  throw new Error("Не найден элемент #root");
}

createRoot(container).render(
  <StrictMode>
    <AppProviders>
      <RouterProvider router={router} />
    </AppProviders>
  </StrictMode>,
);
