import { useQuery } from "@tanstack/react-query";
import { apiListSections } from "../api/list-api";
import { structureKeys } from "./keys";

export function useSectionsQuery(listId: string | undefined) {
  return useQuery({
    queryKey: structureKeys.sections(listId ?? "none"),
    queryFn: () => apiListSections(listId!),
    enabled: listId !== undefined,
    staleTime: 60_000,
  });
}
