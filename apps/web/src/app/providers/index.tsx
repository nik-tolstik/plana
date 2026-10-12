import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState, type ReactNode } from "react";
import { initSession } from "@/features/auth";
import { watchSystemTheme } from "@/features/theme-switch";

export function AppProviders({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            retry: 1,
            refetchOnWindowFocus: true,
          },
        },
      }),
  );

  useEffect(() => {
    void initSession();
    return watchSystemTheme();
  }, []);

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
