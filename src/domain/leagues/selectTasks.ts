import type { LeagueDataset, LeagueTask } from "./types";
import { evaluateRequirements, type RequirementEvaluation } from "./requirements";
import type { LeagueFilterState, LeagueUserState } from "../storage/types";
import { getTaskSkillIds } from "./taskSkills";

export type TaskView = {
  task: LeagueTask;
  originalIndex: number;
  isCompleted: boolean;
  isFavorite: boolean;
  isHidden: boolean;
  requirementStatus: RequirementEvaluation;
  skillIds: string[];
  points: number;
};

export type ProgressSummary = {
  completed: number;
  total: number;
  percent: number;
  pointsEarned: number;
  pointsAvailable: number;
};

function taskPoints(task: LeagueTask): number {
  return task.rewards.reduce((total, reward) => total + reward.amount, 0);
}

function searchableText(task: LeagueTask): string {
  return [
    task.title,
    task.description.plain,
    task.tierId,
    ...Object.values(task.facets).flat(),
    task.requirements.raw?.skills ?? "",
    task.requirements.raw?.other ?? "",
  ]
    .join(" ")
    .toLocaleLowerCase();
}

export function buildTaskViews(dataset: LeagueDataset, state: LeagueUserState): TaskView[] {
  const completed = new Set(state.completedTaskIds);
  const favorites = new Set(state.favoriteTaskIds);
  const hidden = new Set(state.hiddenTaskIds);
  const maxedStats = new Set(state.maxedStatIds);
  const effectiveStats = { ...state.stats };

  for (const stat of dataset.manifest.playerStats) {
    if (maxedStats.has(stat.id)) {
      effectiveStats[stat.id] = stat.maximum;
    }
  }

  return dataset.tasks.map((task, originalIndex) => ({
    task,
    originalIndex,
    isCompleted: completed.has(task.id),
    isFavorite: favorites.has(task.id),
    isHidden: hidden.has(task.id),
    requirementStatus: evaluateRequirements(task.requirements, {
      stats: effectiveStats,
    }),
    skillIds: getTaskSkillIds(task, dataset.manifest),
    points: taskPoints(task),
  }));
}

export function filterAndSortTaskViews(
  views: TaskView[],
  filters: LeagueFilterState,
  tierOrder: Map<string, number>,
): TaskView[] {
  const search = filters.search.trim().toLocaleLowerCase();
  const tierIds = new Set(filters.tierIds);
  const skillIds = new Set(filters.skillIds);
  const selectedFacets = Object.entries(filters.facets).filter(([, values]) => values.length > 0);

  const filtered = views.filter((view) => {
    if (filters.hiddenOnly !== view.isHidden) return false;

    if (filters.completion === "complete" && !view.isCompleted) return false;
    if (filters.completion === "incomplete" && view.isCompleted) return false;
    if (filters.requirements !== "all" && view.requirementStatus !== filters.requirements) return false;
    if (filters.favoritesOnly && !view.isFavorite) return false;
    if (tierIds.size > 0 && !tierIds.has(view.task.tierId)) {
      return false;
    }

    if (skillIds.size > 0 && !view.skillIds.some((skillId) => skillIds.has(skillId))) {
      return false;
    }

    for (const [facetId, selectedValues] of selectedFacets) {
      const taskValues = view.task.facets[facetId] ?? [];
      if (!selectedValues.some((value) => taskValues.includes(value))) return false;
    }

    return !search || searchableText(view.task).includes(search);
  });

  return filtered.sort((left, right) => {
    let comparison = 0;
    if (filters.sortField === "title") comparison = left.task.title.localeCompare(right.task.title);
    if (filters.sortField === "tier") {
      comparison =
        (tierOrder.get(left.task.tierId) ?? Number.MAX_SAFE_INTEGER) -
        (tierOrder.get(right.task.tierId) ?? Number.MAX_SAFE_INTEGER);
    }
    if (filters.sortField === "points") comparison = left.points - right.points;
    if (comparison === 0) comparison = left.task.title.localeCompare(right.task.title);
    if (comparison === 0) comparison = left.originalIndex - right.originalIndex;
    return filters.sortDirection === "desc" ? comparison * -1 : comparison;
  });
}

export function scopeTaskViewsToLocations(views: TaskView[], selectedLocationIds: string[]): TaskView[] {
  if (selectedLocationIds.length === 0) {
    return views;
  }

  const selectedLocations = new Set(selectedLocationIds);

  return views.filter((view) =>
    (view.task.facets.location ?? []).some((locationId) => selectedLocations.has(locationId)),
  );
}

export function summarizeProgress(views: TaskView[]): ProgressSummary {
  const includedViews = views.filter((view) => !view.isHidden);

  const completedViews = includedViews.filter((view) => view.isCompleted);

  const pointsAvailable = includedViews.reduce((total, view) => total + view.points, 0);

  const pointsEarned = completedViews.reduce((total, view) => total + view.points, 0);

  return {
    completed: completedViews.length,
    total: includedViews.length,
    percent: includedViews.length === 0 ? 0 : Math.round((completedViews.length / includedViews.length) * 100),
    pointsEarned,
    pointsAvailable,
  };
}
