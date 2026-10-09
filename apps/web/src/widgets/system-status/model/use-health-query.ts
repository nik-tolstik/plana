import { useQuery } from "@tanstack/react-query";
import { fetchHealth } from "@/shared/api/health";

export const healthQueryKeys = {
  all: ["health"] as const,
};

export function useHealthQuery() {
  return useQuery({
    queryKey: healthQueryKeys.all,
    queryFn: fetchHealth,
    refetchInterval: 60_000,
  });
}
