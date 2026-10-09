import { Outlet } from "react-router";
import { Sidebar } from "@/widgets/sidebar";

/** Каркас приложения: сайдбар слева, контент страницы справа. */
export function AppLayout() {
  return (
    <div className="app-layout">
      <Sidebar />
      <main className="app-main">
        <Outlet />
      </main>
    </div>
  );
}
