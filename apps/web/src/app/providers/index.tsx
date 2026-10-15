import { QueryClientProvider } from "@tanstack/react-query";
import { useEffect, type ReactNode } from "react";
import { initSession } from "@/features/auth";
import { watchSystemTheme } from "@/features/theme-switch";
import { queryClient } from "@/shared/lib/query-client";

export function AppProviders({ children }: { children: ReactNode }) {
  useEffect(() => {
    void initSession();
    return watchSystemTheme();
  }, []);

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
