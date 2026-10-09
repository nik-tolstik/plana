import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { AppProviders } from "@/app/providers";
import { router } from "@/app/routes";
import { RouterProvider } from "react-router";
import "@/shared/styles/global.css";

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
