import { QueryClient } from "@tanstack/react-query";

/**
 * Единственный QueryClient приложения. Живёт модулем, а не useState в
 * провайдере: кэш нужно чистить из не-React кода (logout, неудачный refresh),
 * а провайдер недоступен вне дерева компонентов.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: true,
    },
  },
});
