import { useQuery } from "@tanstack/react-query";
import { apiGetTags } from "../api/tag-api";
import { tagKeys } from "./keys";

/** Теги пользователя; меняются редко — staleTime 60 секунд. */
export function useTagsQuery() {
  return useQuery({
    queryKey: tagKeys.all,
    queryFn: apiGetTags,
    staleTime: 60_000,
  });
}
