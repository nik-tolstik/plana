import { Outlet } from "react-router";
import { Sidebar } from "@/widgets/sidebar";

/** Каркас приложения: сайдбар слева, контент страницы справа; на мобильном — колонкой. */
export function AppLayout() {
  return (
    <div className="flex min-h-dvh max-md:flex-col">
      <Sidebar />
      <main className="max-w-[860px] min-w-0 flex-1 px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
