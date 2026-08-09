import type { LeagueManifest, LeagueTask } from "../domain/leagues/types";
import { buildDefaultLeagueState } from "../domain/storage/localStorage";
import type { LeagueUserState } from "../domain/storage/types";

const LEGACY_COMPLETED_KEY = "osrs-leagues-completed-tasks";
const LEGACY_SKILLS_KEY = "osrs-leagues-player-skills";
const LEGACY_FILTERS_KEY = "osrs-leagues-filters";

function parseSavedValue(key: string): unknown {
  if (typeof localStorage === "undefined") return undefined;
  const saved = localStorage.getItem(key);
  if (!saved) return undefined;

  try {
    return JSON.parse(saved) as unknown;
  } catch (error) {
    console.error(`Failed to parse legacy storage key ${key}.`, error);
    return undefined;
  }
}

export function migrateLegacyV1State(manifest: LeagueManifest, tasks: LeagueTask[]): LeagueUserState | null {
  if (typeof localStorage === "undefined") return null;

  const rawCompleted = parseSavedValue(LEGACY_COMPLETED_KEY);
  const rawSkills = parseSavedValue(LEGACY_SKILLS_KEY);
  const rawFilters = parseSavedValue(LEGACY_FILTERS_KEY);

  if (rawCompleted === undefined && rawSkills === undefined && rawFilters === undefined) return null;

  const migrated = buildDefaultLeagueState(manifest);

  if (rawCompleted && typeof rawCompleted === "object" && !Array.isArray(rawCompleted)) {
    const completed = rawCompleted as Record<string, unknown>;
    migrated.completedTaskIds = tasks
      .filter((task) => task.source.legacyIds?.some((legacyId) => completed[legacyId] === true))
      .map((task) => task.id);
  }

  if (rawSkills && typeof rawSkills === "object" && !Array.isArray(rawSkills)) {
    const skills = rawSkills as Record<string, unknown>;
    for (const definition of manifest.playerStats) {
      const value = skills[definition.id];
      if (typeof value !== "number" || !Number.isFinite(value)) continue;
      migrated.stats[definition.id] = Math.min(definition.maximum, Math.max(definition.minimum, Math.floor(value)));
    }
  }

  if (rawFilters && typeof rawFilters === "object" && !Array.isArray(rawFilters)) {
    const filters = rawFilters as Record<string, unknown>;
    migrated.filters.tierIds =
      typeof filters.selectedTier === "string" && filters.selectedTier !== "all" ? [filters.selectedTier] : [];
    migrated.filters.completion = filters.hideCompleted === true ? "incomplete" : "all";
    migrated.filters.requirements = filters.hideUncompletable === true ? "met" : "all";
    migrated.filters.sortField = filters.sortField === "tier" ? "tier" : "title";
    migrated.filters.sortDirection = filters.sortDirection === "desc" ? "desc" : "asc";

    if (Array.isArray(filters.selectedRegions)) {
      const regions = filters.selectedRegions.filter((entry): entry is string => typeof entry === "string");
      if (regions.length > 0) migrated.filters.facets.location = regions;
    }
  }

  return migrated;
}
