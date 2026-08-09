import type { LeagueManifest } from "../leagues/types";
import { normalizeStats } from "../leagues/requirements";
import type { AppSettings, LeagueFilterState, LeagueUserState } from "./types";

export const STORAGE_PREFIX = "runescape-leagues-tracker:v2";

function canUseStorage(): boolean {
  return typeof localStorage !== "undefined";
}

function leagueStateKey(leagueId: string): string {
  return `${STORAGE_PREFIX}:league:${leagueId}`;
}

function buildDefaultFilters(): LeagueFilterState {
  return {
    search: "",
    tierIds: [],
    facets: {},
    completion: "all",
    requirements: "all",
    favoritesOnly: false,
    sortField: "title",
    sortDirection: "asc",
  };
}

export function buildDefaultLeagueState(manifest: LeagueManifest): LeagueUserState {
  return {
    schemaVersion: 2,
    leagueId: manifest.id,
    completedTaskIds: [],
    favoriteTaskIds: [],
    taskNotes: {},
    stats: normalizeStats(manifest, undefined),
    filters: buildDefaultFilters(),
    updatedAt: new Date().toISOString(),
  };
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === "string") : [];
}

function normalizeFilters(raw: unknown): LeagueFilterState {
  const defaults = buildDefaultFilters();
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return defaults;
  const value = raw as Partial<LeagueFilterState>;
  const rawFacets = value.facets && typeof value.facets === "object" && !Array.isArray(value.facets) ? value.facets : {};

  return {
    search: typeof value.search === "string" ? value.search : defaults.search,
    tierIds: stringArray(value.tierIds),
    facets: Object.fromEntries(Object.entries(rawFacets).map(([key, entries]) => [key, stringArray(entries)])),
    completion: value.completion === "complete" || value.completion === "incomplete" ? value.completion : "all",
    requirements: value.requirements === "met" || value.requirements === "unmet" || value.requirements === "unknown" ? value.requirements : "all",
    favoritesOnly: typeof value.favoritesOnly === "boolean" ? value.favoritesOnly : false,
    sortField: value.sortField === "tier" || value.sortField === "points" ? value.sortField : "title",
    sortDirection: value.sortDirection === "desc" ? "desc" : "asc",
  };
}

export function loadLeagueState(manifest: LeagueManifest): LeagueUserState | null {
  if (!canUseStorage()) return null;

  try {
    const saved = localStorage.getItem(leagueStateKey(manifest.id));
    if (!saved) return null;
    const raw = JSON.parse(saved) as Partial<LeagueUserState>;
    if (raw.schemaVersion !== 2 || raw.leagueId !== manifest.id) return null;

    return {
      schemaVersion: 2,
      leagueId: manifest.id,
      completedTaskIds: stringArray(raw.completedTaskIds),
      favoriteTaskIds: stringArray(raw.favoriteTaskIds),
      taskNotes:
        raw.taskNotes && typeof raw.taskNotes === "object" && !Array.isArray(raw.taskNotes)
          ? Object.fromEntries(Object.entries(raw.taskNotes).filter((entry): entry is [string, string] => typeof entry[1] === "string"))
          : {},
      stats: normalizeStats(manifest, raw.stats),
      filters: normalizeFilters(raw.filters),
      updatedAt: typeof raw.updatedAt === "string" ? raw.updatedAt : new Date().toISOString(),
    };
  } catch (error) {
    console.error(`Failed to load state for ${manifest.id}.`, error);
    return null;
  }
}

export function saveLeagueState(state: LeagueUserState): void {
  if (!canUseStorage()) return;

  try {
    localStorage.setItem(leagueStateKey(state.leagueId), JSON.stringify({ ...state, updatedAt: new Date().toISOString() }));
  } catch (error) {
    console.error(`Failed to save state for ${state.leagueId}.`, error);
  }
}

export function loadAppSettings(defaultLeagueId: string): AppSettings {
  if (!canUseStorage()) return { schemaVersion: 2, selectedLeagueId: defaultLeagueId };

  try {
    const saved = localStorage.getItem(`${STORAGE_PREFIX}:settings`);
    if (!saved) return { schemaVersion: 2, selectedLeagueId: defaultLeagueId };
    const raw = JSON.parse(saved) as Partial<AppSettings>;
    return {
      schemaVersion: 2,
      selectedLeagueId: typeof raw.selectedLeagueId === "string" ? raw.selectedLeagueId : defaultLeagueId,
    };
  } catch (error) {
    console.error("Failed to load app settings.", error);
    return { schemaVersion: 2, selectedLeagueId: defaultLeagueId };
  }
}

export function saveAppSettings(settings: AppSettings): void {
  if (!canUseStorage()) return;

  try {
    localStorage.setItem(`${STORAGE_PREFIX}:settings`, JSON.stringify(settings));
  } catch (error) {
    console.error("Failed to save app settings.", error);
  }
}
