import { type ReactNode } from "react";
import { Navigate, createBrowserRouter, Outlet } from "react-router";
import { useSessionStore } from "@/entities/user";
import { HabitsPage } from "@/pages/habits";
import { HomePage } from "@/pages/home";
import { LoginPage } from "@/pages/login";
import { SettingsPage } from "@/pages/settings";

function RequireAuth({ children }: { children: ReactNode }) {
  const status = useSessionStore((state) => state.status);
  if (status === "loading") {
    return <p>Загрузка…</p>;
  }
  if (status === "anon") {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}

function RedirectIfAuthed({ children }: { children: ReactNode }) {
  const status = useSessionStore((state) => state.status);
  if (status === "authed") {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}

export const router = createBrowserRouter([
  {
    element: (
      <RequireAuth>
        <Outlet />
      </RequireAuth>
    ),
    children: [
      { path: "/", element: <HomePage /> },
      { path: "/habits", element: <HabitsPage /> },
      { path: "/settings", element: <SettingsPage /> },
    ],
  },
  {
    element: (
      <RedirectIfAuthed>
        <Outlet />
      </RedirectIfAuthed>
    ),
    children: [{ path: "/login", element: <LoginPage /> }],
  },
]);
