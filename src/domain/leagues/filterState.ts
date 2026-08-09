import type { LeagueFilterState } from "../storage/types";

export function countActiveFilters(filters: LeagueFilterState): number {
  return (
    filters.tierIds.length +
    Object.values(filters.facets).filter((values) => values.length > 0).length +
    (filters.completion === "all" ? 0 : 1) +
    (filters.requirements === "all" ? 0 : 1) +
    (filters.favoritesOnly ? 1 : 0)
  );
}
