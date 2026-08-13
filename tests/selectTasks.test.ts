import { expect, test } from "vitest";
import type { LeagueDataset, LeagueTask } from "../src/domain/leagues/types";
import {
  buildTaskViews,
  filterAndSortTaskViews,
  scopeTaskViewsToLocations,
  summarizeProgress,
} from "../src/domain/leagues/selectTasks";
import { buildDefaultLeagueState } from "../src/domain/storage/localStorage";

const manifest: LeagueDataset["manifest"] = {
  schemaVersion: 2,
  id: "test-league",
  game: "osrs",
  name: "Test League",
  shortName: "Test",
  edition: "Test",
  status: "complete",
  contentVersion: "test",
  source: { provider: "manual", page: "test" },
  rewardCurrencies: [{ id: "league-points", label: "League points", shortLabel: "pts" }],
  tiers: [
    { id: "easy", label: "Easy", order: 0, color: "green", rewards: [] },
    { id: "medium", label: "Medium", order: 1, color: "blue", rewards: [] },
  ],
  facets: [
    {
      id: "category",
      label: "Category",
      values: [
        { id: "skills", label: "Skills" },
        { id: "bosses", label: "Bosses" },
      ],
    },
  ],
  playerStats: [{ id: "fishing", label: "Fishing", group: "Skills", minimum: 1, maximum: 99, defaultValue: 1 }],
  mechanics: [],
};

function task(id: string, title: string, tierId: string, category: string, points: number): LeagueTask {
  return {
    id,
    leagueId: manifest.id,
    title,
    description: { plain: `${title} description` },
    tierId,
    rewards: [{ currencyId: "league-points", amount: points }],
    facets: { category: [category] },
    requirements: { parseStatus: "complete" },
    source: { provider: "manual", page: "test", externalId: id },
  };
}

const dataset: LeagueDataset = {
  manifest,
  tasks: [
    task("one", "Alpha", "easy", "skills", 10),
    task("two", "Bravo", "medium", "bosses", 30),
    task("three", "Charlie", "easy", "skills", 10),
  ],
};

test("completed and incomplete filters are exact opposites", () => {
  const state = buildDefaultLeagueState(manifest);
  state.completedTaskIds = ["two"];
  const views = buildTaskViews(dataset, state);
  const tierOrder = new Map([
    ["easy", 0],
    ["medium", 1],
  ]);

  const incomplete = filterAndSortTaskViews(views, { ...state.filters, completion: "incomplete" }, tierOrder);
  const complete = filterAndSortTaskViews(views, { ...state.filters, completion: "complete" }, tierOrder);

  expect(incomplete.map((view) => view.task.id)).toEqual(["one", "three"]);
  expect(complete.map((view) => view.task.id)).toEqual(["two"]);
});

test("combines facets and search without mutating the source list", () => {
  const state = buildDefaultLeagueState(manifest);
  const views = buildTaskViews(dataset, state);
  const result = filterAndSortTaskViews(
    views,
    { ...state.filters, search: "charlie", facets: { category: ["skills"] } },
    new Map([
      ["easy", 0],
      ["medium", 1],
    ]),
  );

  expect(result.map((view) => view.task.id)).toEqual(["three"]);
  expect(views).toHaveLength(3);
});

test("summarizes task and point progress", () => {
  const state = buildDefaultLeagueState(manifest);
  state.completedTaskIds = ["two"];
  expect(summarizeProgress(buildTaskViews(dataset, state))).toEqual({
    completed: 1,
    total: 3,
    percent: 33,
    pointsEarned: 30,
    pointsAvailable: 50,
  });
});

test("hidden tasks are excluded from normal results and progress", () => {
  const state = buildDefaultLeagueState(manifest);

  state.completedTaskIds = ["one", "two"];
  state.hiddenTaskIds = ["two"];

  const views = buildTaskViews(dataset, state);
  const tierOrder = new Map([
    ["easy", 0],
    ["medium", 1],
  ]);

  const visibleResults = filterAndSortTaskViews(views, state.filters, tierOrder);

  const hiddenResults = filterAndSortTaskViews(
    views,
    {
      ...state.filters,
      hiddenOnly: true,
    },
    tierOrder,
  );

  expect(visibleResults.map((view) => view.task.id)).toEqual(["one", "three"]);

  expect(hiddenResults.map((view) => view.task.id)).toEqual(["two"]);

  expect(summarizeProgress(views)).toEqual({
    completed: 1,
    total: 2,
    percent: 50,
    pointsEarned: 10,
    pointsAvailable: 20,
  });
});

test("location-scoped progress excludes hidden tasks", () => {
  const regionDataset: LeagueDataset = {
    manifest,
    tasks: [
      {
        ...task("asgarnia-easy", "Asgarnia easy task", "easy", "skills", 10),
        facets: {
          category: ["skills"],
          location: ["asgarnia"],
        },
      },
      {
        ...task("asgarnia-medium", "Asgarnia medium task", "medium", "bosses", 30),
        facets: {
          category: ["bosses"],
          location: ["asgarnia"],
        },
      },
      {
        ...task("desert-easy", "Desert easy task", "easy", "skills", 10),
        facets: {
          category: ["skills"],
          location: ["desert"],
        },
      },
    ],
  };

  const state = buildDefaultLeagueState(manifest);

  state.completedTaskIds = ["asgarnia-easy", "asgarnia-medium", "desert-easy"];

  state.hiddenTaskIds = ["asgarnia-medium"];

  const activeViews = buildTaskViews(regionDataset, state).filter((view) => !view.isHidden);

  const asgarniaViews = scopeTaskViewsToLocations(activeViews, ["asgarnia"]);

  expect(asgarniaViews.map((view) => view.task.id)).toEqual(["asgarnia-easy"]);

  expect(summarizeProgress(asgarniaViews)).toEqual({
    completed: 1,
    total: 1,
    percent: 100,
    pointsEarned: 10,
    pointsAvailable: 10,
  });
});

test("skill filter includes requirements and use-only metadata", () => {
  const state = buildDefaultLeagueState(manifest);

  const requirementTask = task("requirement", "Catch a difficult fish", "medium", "skills", 30);

  requirementTask.requirements = {
    root: {
      kind: "stat",
      statId: "fishing",
      minimum: 60,
    },
    parseStatus: "complete",
  };

  const useOnlyTask = task("use-only", "Chop a basic tree", "easy", "skills", 10);

  useOnlyTask.extensions = {
    usesSkills: ["woodcutting"],
  };

  const skillDataset: LeagueDataset = {
    manifest,
    tasks: [requirementTask, useOnlyTask, task("unrelated", "Defeat a goblin", "easy", "bosses", 10)],
  };

  const views = buildTaskViews(skillDataset, state);
  const tierOrder = new Map([
    ["easy", 0],
    ["medium", 1],
  ]);

  const fishingResults = filterAndSortTaskViews(
    views,
    {
      ...state.filters,
      skillIds: ["fishing"],
    },
    tierOrder,
  );

  const woodcuttingResults = filterAndSortTaskViews(
    views,
    {
      ...state.filters,
      skillIds: ["woodcutting"],
    },
    tierOrder,
  );

  expect(fishingResults.map((view) => view.task.id)).toEqual(["requirement"]);

  expect(woodcuttingResults.map((view) => view.task.id)).toEqual(["use-only"]);
});

test("skill filter infers clear skill actions without Wiki metadata", () => {
  const woodcuttingManifest: LeagueDataset["manifest"] = {
    ...manifest,
    playerStats: [
      ...manifest.playerStats,
      {
        id: "woodcutting",
        label: "Woodcutting",
        group: "Gathering",
        minimum: 1,
        maximum: 110,
        virtualMaximum: 120,
        defaultValue: 1,
      },
    ],
  };

  const basicTreeTask = task("basic-tree", "Chop 10 basic trees", "easy", "skills", 10);

  const skillDataset: LeagueDataset = {
    manifest: woodcuttingManifest,
    tasks: [basicTreeTask],
  };

  const state = buildDefaultLeagueState(woodcuttingManifest);
  const views = buildTaskViews(skillDataset, state);

  const results = filterAndSortTaskViews(
    views,
    {
      ...state.filters,
      skillIds: ["woodcutting"],
    },
    new Map([["easy", 0]]),
  );

  expect(results.map((view) => view.task.id)).toEqual(["basic-tree"]);
});
