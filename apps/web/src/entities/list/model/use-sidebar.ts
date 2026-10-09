import { useQuery } from "@tanstack/react-query";
import { apiGetSidebar } from "../api/list-api";
import { structureKeys } from "./keys";

export function useSidebarQuery() {
  return useQuery({
    queryKey: structureKeys.sidebar,
    queryFn: apiGetSidebar,
    staleTime: 60_000,
  });
}
