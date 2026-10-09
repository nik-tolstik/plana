import { createBrowserRouter } from "react-router";
import { HabitsPage } from "@/pages/habits";
import { HomePage } from "@/pages/home";
import { LoginPage } from "@/pages/login";
import { SettingsPage } from "@/pages/settings";

export const router = createBrowserRouter([
  { path: "/", element: <HomePage /> },
  { path: "/habits", element: <HabitsPage /> },
  { path: "/settings", element: <SettingsPage /> },
  { path: "/login", element: <LoginPage /> },
]);
