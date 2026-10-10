import { type ReactNode } from "react";
import { Navigate, createBrowserRouter, Outlet } from "react-router";
import { AppLayout } from "@/app/layouts/app-layout";
import { useSessionStore } from "@/entities/user";
import { HabitsPage } from "@/pages/habits";
import { HomePage } from "@/pages/home";
import { ListPage } from "@/pages/list";
import { LoginPage } from "@/pages/login";
import { SearchPage } from "@/pages/search";
import { SettingsPage } from "@/pages/settings";
import { SmartPage } from "@/pages/smart";
import { TagPage } from "@/pages/tag";

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
        <AppLayout />
      </RequireAuth>
    ),
    children: [
      { path: "/", element: <HomePage /> },
      { path: "/list/:listId", element: <ListPage /> },
      { path: "/inbox", element: <SmartPage smart="inbox" /> },
      { path: "/today", element: <SmartPage smart="today" /> },
      { path: "/tomorrow", element: <SmartPage smart="tomorrow" /> },
      { path: "/next7", element: <SmartPage smart="next7" /> },
      { path: "/all", element: <SmartPage smart="all" /> },
      { path: "/completed", element: <SmartPage smart="completed" /> },
      { path: "/trash", element: <SmartPage smart="trash" /> },
      { path: "/search", element: <SearchPage /> },
      { path: "/tag/:tagId", element: <TagPage /> },
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
