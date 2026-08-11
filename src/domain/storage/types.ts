export type CompletionFilter = "all" | "incomplete" | "complete";

export type RequirementFilter = "all" | "met" | "unmet" | "unknown";

export type TaskSortField = "title" | "tier" | "points";

export type SortDirection = "asc" | "desc";

export type LeagueFilterState = {
  search: string;
  tierIds: string[];
  skillIds: string[];
  facets: Record<string, string[]>;
  completion: CompletionFilter;
  requirements: RequirementFilter;
  favoritesOnly: boolean;
  hiddenOnly: boolean;
  sortField: TaskSortField;
  sortDirection: SortDirection;
};

export type LeagueUserState = {
  schemaVersion: 2;
  leagueId: string;
  completedTaskIds: string[];
  favoriteTaskIds: string[];
  hiddenTaskIds: string[];
  taskNotes: Record<string, string>;
  stats: Record<string, number>;
  maxedStatIds: string[];
  filters: LeagueFilterState;
  updatedAt: string;
};

export type AppSettings = {
  schemaVersion: 2;
  selectedLeagueId: string;
};
