import "./App.css";
import { useEffect, useMemo, useState } from "react";
import tasksData from "./data/tasks.json";
import TaskCard from "./components/TaskCard";
import type { PlayerSkills, SkillName, Task, TaskTier } from "./types/task";

const tasks = tasksData as Task[];

const COMPLETED_TASKS_STORAGE_KEY = "osrs-leagues-completed-tasks";
const PLAYER_SKILLS_STORAGE_KEY = "osrs-leagues-player-skills";
const FILTERS_STORAGE_KEY = "osrs-leagues-filters";

const TIER_ORDER: TaskTier[] = ["easy", "medium", "hard", "elite", "master"];
const REGION_ORDER = ["global", "varlamore", "karamja", "kourend", "asgarnia", "kandarin"] as const;

const SKILL_NAMES: SkillName[] = [
  "attack",
  "hitpoints",
  "mining",
  "strength",
  "agility",
  "smithing",
  "defence",
  "herblore",
  "fishing",
  "ranged",
  "thieving",
  "cooking",
  "prayer",
  "crafting",
  "firemaking",
  "magic",
  "fletching",
  "woodcutting",
  "runecraft",
  "slayer",
  "farming",
  "construction",
  "hunter",
];

type SortField = "name" | "tier" | "region";
type SortDirection = "asc" | "desc";

type TaskWithMeta = {
  task: Task;
  taskId: string;
  index: number;
  isCompleted: boolean;
  isCompletable: boolean;
};

type SavedFilters = {
  selectedRegions: string[];
  selectedTier: "all" | TaskTier;
  hideCompleted: boolean;
  hideUncompletable: boolean;
  sortField: SortField;
  sortDirection: SortDirection;
};

type RegionTierProgressEntry = {
  region: string;
  totalCompleted: number;
  totalTasks: number;
  totalPercent: number;
  tiers: Array<{
    tier: TaskTier;
    completed: number;
    total: number;
    percent: number;
  }>;
};

function getTaskId(task: Task, index: number): string {
  return `${task.region}-${task.name}-${index}`;
}

function toTitleCase(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function getSkillIconPath(skill: string): string {
  return `/icons/skills/${skill.toLowerCase()}.png`;
}

function buildDefaultSkills(): PlayerSkills {
  return {
    attack: 1,
    strength: 1,
    defence: 1,
    ranged: 1,
    prayer: 1,
    magic: 1,
    runecraft: 1,
    construction: 1,
    hitpoints: 10,
    agility: 1,
    herblore: 1,
    thieving: 1,
    crafting: 1,
    fletching: 1,
    slayer: 1,
    hunter: 1,
    mining: 1,
    smithing: 1,
    fishing: 1,
    cooking: 1,
    firemaking: 1,
    woodcutting: 1,
    farming: 1,
  };
}

function buildDefaultFilters(): SavedFilters {
  return {
    selectedRegions: [],
    selectedTier: "all",
    hideCompleted: false,
    hideUncompletable: false,
    sortField: "name",
    sortDirection: "asc",
  };
}

function normalizeLoadedSkills(raw: unknown): PlayerSkills {
  const defaults = buildDefaultSkills();

  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return defaults;
  }

  const loaded = raw as Partial<Record<SkillName, unknown>>;
  const normalized: PlayerSkills = { ...defaults };

  for (const skill of Object.keys(defaults) as SkillName[]) {
    const value = loaded[skill];
    if (typeof value === "number" && Number.isFinite(value)) {
      normalized[skill] = Math.min(99, Math.max(1, Math.floor(value)));
    }
  }

  return normalized;
}

function normalizeLoadedFilters(raw: unknown): SavedFilters {
  const defaults = buildDefaultFilters();

  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return defaults;
  }

  const loaded = raw as Partial<SavedFilters>;

  return {
    selectedRegions: Array.isArray(loaded.selectedRegions)
      ? loaded.selectedRegions.filter((value): value is string => typeof value === "string")
      : defaults.selectedRegions,
    selectedTier:
      loaded.selectedTier === "all" || TIER_ORDER.includes(loaded.selectedTier as TaskTier)
        ? (loaded.selectedTier as "all" | TaskTier)
        : defaults.selectedTier,
    hideCompleted: typeof loaded.hideCompleted === "boolean" ? loaded.hideCompleted : defaults.hideCompleted,
    hideUncompletable: typeof loaded.hideUncompletable === "boolean" ? loaded.hideUncompletable : defaults.hideUncompletable,
    sortField: loaded.sortField === "name" || loaded.sortField === "tier" || loaded.sortField === "region" ? loaded.sortField : defaults.sortField,
    sortDirection: loaded.sortDirection === "asc" || loaded.sortDirection === "desc" ? loaded.sortDirection : defaults.sortDirection,
  };
}

function loadCompletedTasks(): Record<string, boolean> {
  try {
    const saved = localStorage.getItem(COMPLETED_TASKS_STORAGE_KEY);
    if (!saved) return {};
    return JSON.parse(saved) as Record<string, boolean>;
  } catch (error) {
    console.error("Failed to load completed tasks from localStorage.", error);
    return {};
  }
}

function loadPlayerSkills(): PlayerSkills {
  try {
    const saved = localStorage.getItem(PLAYER_SKILLS_STORAGE_KEY);
    if (!saved) return buildDefaultSkills();
    return normalizeLoadedSkills(JSON.parse(saved));
  } catch (error) {
    console.error("Failed to load player skills from localStorage.", error);
    return buildDefaultSkills();
  }
}

function loadFilters(): SavedFilters {
  try {
    const saved = localStorage.getItem(FILTERS_STORAGE_KEY);
    if (!saved) return buildDefaultFilters();
    return normalizeLoadedFilters(JSON.parse(saved));
  } catch (error) {
    console.error("Failed to load filters from localStorage.", error);
    return buildDefaultFilters();
  }
}

function isTaskCompletable(task: Task, playerSkills: PlayerSkills): boolean {
  for (const [skill, level] of Object.entries(task.requirements.skills)) {
    const skillName = skill as SkillName;
    const requiredLevel = Number(level);
    const playerLevel = playerSkills[skillName] ?? 1;

    if (playerLevel < requiredLevel) {
      return false;
    }
  }

  return true;
}

function compareTier(a: TaskTier, b: TaskTier): number {
  return TIER_ORDER.indexOf(a) - TIER_ORDER.indexOf(b);
}

function compareRegion(a: string, b: string): number {
  const aIndex = REGION_ORDER.indexOf(a as (typeof REGION_ORDER)[number]);
  const bIndex = REGION_ORDER.indexOf(b as (typeof REGION_ORDER)[number]);

  const normalizedA = aIndex === -1 ? Number.MAX_SAFE_INTEGER : aIndex;
  const normalizedB = bIndex === -1 ? Number.MAX_SAFE_INTEGER : bIndex;

  if (normalizedA !== normalizedB) {
    return normalizedA - normalizedB;
  }

  return a.localeCompare(b);
}

function compareTasks(a: TaskWithMeta, b: TaskWithMeta, sortField: SortField, sortDirection: SortDirection): number {
  let result = 0;

  if (sortField === "name") {
    result = a.task.name.localeCompare(b.task.name);
  } else if (sortField === "tier") {
    result = compareTier(a.task.tier, b.task.tier);
    if (result === 0) {
      result = a.task.name.localeCompare(b.task.name);
    }
  } else if (sortField === "region") {
    result = compareRegion(a.task.region, b.task.region);
    if (result === 0) {
      result = a.task.name.localeCompare(b.task.name);
    }
  }

  return sortDirection === "asc" ? result : result * -1;
}

function getProgressStats(items: TaskWithMeta[]) {
  const completed = items.filter((item) => item.isCompleted).length;
  const total = items.length;
  const percent = total === 0 ? 100 : Math.round((completed / total) * 100);

  return { completed, total, percent };
}

function calculateCombatLevel(skills: PlayerSkills): number {
  const defence = skills.defence;
  const hitpoints = skills.hitpoints;
  const prayer = skills.prayer;
  const attack = skills.attack;
  const strength = skills.strength;
  const ranged = skills.ranged;
  const magic = skills.magic;

  const base = 0.25 * (defence + hitpoints + Math.floor(prayer / 2));
  const melee = 0.325 * (attack + strength);
  const ranger = 0.325 * Math.floor((3 * ranged) / 2);
  const mage = 0.325 * Math.floor((3 * magic) / 2);

  return Math.floor(base + Math.max(melee, ranger, mage));
}

export default function App() {
  const initialFilters = loadFilters();

  const [completedTaskIds, setCompletedTaskIds] = useState<Record<string, boolean>>(loadCompletedTasks);
  const [playerSkills, setPlayerSkills] = useState<PlayerSkills>(loadPlayerSkills);

  const [searchText, setSearchText] = useState("");
  const [selectedRegions, setSelectedRegions] = useState<string[]>(initialFilters.selectedRegions);
  const [selectedTier, setSelectedTier] = useState<"all" | TaskTier>(initialFilters.selectedTier);
  const [hideCompleted, setHideCompleted] = useState(initialFilters.hideCompleted);
  const [hideUncompletable, setHideUncompletable] = useState(initialFilters.hideUncompletable);
  const [sortField, setSortField] = useState<SortField>(initialFilters.sortField);
  const [sortDirection, setSortDirection] = useState<SortDirection>(initialFilters.sortDirection);
  const [isSkillModalOpen, setIsSkillModalOpen] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(COMPLETED_TASKS_STORAGE_KEY, JSON.stringify(completedTaskIds));
    } catch (error) {
      console.error("Failed to save completed tasks to localStorage.", error);
    }
  }, [completedTaskIds]);

  useEffect(() => {
    try {
      localStorage.setItem(PLAYER_SKILLS_STORAGE_KEY, JSON.stringify(playerSkills));
    } catch (error) {
      console.error("Failed to save player skills to localStorage.", error);
    }
  }, [playerSkills]);

  useEffect(() => {
    try {
      const filtersToSave: SavedFilters = {
        selectedRegions,
        selectedTier,
        hideCompleted,
        hideUncompletable,
        sortField,
        sortDirection,
      };

      localStorage.setItem(FILTERS_STORAGE_KEY, JSON.stringify(filtersToSave));
    } catch (error) {
      console.error("Failed to save filters to localStorage.", error);
    }
  }, [selectedRegions, selectedTier, hideCompleted, hideUncompletable, sortField, sortDirection]);

  function toggleTaskComplete(taskId: string) {
    setCompletedTaskIds((current) => ({
      ...current,
      [taskId]: !current[taskId],
    }));
  }

  function handleRegionChange(region: string, checked: boolean) {
    setSelectedRegions((current) => {
      if (checked) {
        if (current.includes(region)) {
          return current;
        }
        return [...current, region];
      }

      return current.filter((value) => value !== region);
    });
  }

  function handleSkillChange(skill: SkillName, value: string) {
    const numericValue = Number(value);

    setPlayerSkills((current) => ({
      ...current,
      [skill]: Number.isFinite(numericValue) ? Math.min(99, Math.max(1, Math.floor(numericValue))) : 1,
    }));
  }

  const regions = useMemo(() => {
    const unique = [...new Set(tasks.map((task) => task.region))];
    return unique.sort(compareRegion);
  }, []);

  const enrichedTasks = useMemo<TaskWithMeta[]>(() => {
    return tasks.map((task, index) => {
      const taskId = getTaskId(task, index);
      const isCompleted = !!completedTaskIds[taskId];
      const isCompletable = isTaskCompletable(task, playerSkills);

      return {
        task,
        taskId,
        index,
        isCompleted,
        isCompletable,
      };
    });
  }, [completedTaskIds, playerSkills]);

  const filteredTasks = useMemo(() => {
    const normalizedSearch = searchText.trim().toLowerCase();

    const results = enrichedTasks.filter((entry) => {
      const { task, isCompleted, isCompletable } = entry;

      if (hideCompleted && isCompleted) {
        return false;
      }

      if (hideUncompletable && !isCompletable) {
        return false;
      }

      if (selectedRegions.length > 0 && !selectedRegions.includes(task.region)) {
        return false;
      }

      if (selectedTier !== "all" && task.tier !== selectedTier) {
        return false;
      }

      if (!normalizedSearch) {
        return true;
      }

      const haystack = [task.name, task.description, task.region, task.tier, ...task.requirements.quests, ...Object.keys(task.requirements.skills)]
        .join(" ")
        .toLowerCase();

      return haystack.includes(normalizedSearch);
    });

    return [...results].sort((a, b) => compareTasks(a, b, sortField, sortDirection));
  }, [enrichedTasks, searchText, selectedRegions, selectedTier, hideCompleted, hideUncompletable, sortField, sortDirection]);

  const completedCount = useMemo(() => {
    return enrichedTasks.filter((item) => item.isCompleted).length;
  }, [enrichedTasks]);

  const globalProgress = useMemo(() => {
    return getProgressStats(enrichedTasks);
  }, [enrichedTasks]);

  const regionTierProgress = useMemo<RegionTierProgressEntry[]>(() => {
    return regions.map((region) => {
      const regionTasks = enrichedTasks.filter((item) => item.task.region === region);

      const totalCompleted = regionTasks.filter((item) => item.isCompleted).length;
      const totalTasks = regionTasks.length;
      const totalPercent = totalTasks === 0 ? 0 : Math.round((totalCompleted / totalTasks) * 100);

      const tiers = TIER_ORDER.map((tier) => {
        const tierTasks = regionTasks.filter((item) => item.task.tier === tier);
        const completed = tierTasks.filter((item) => item.isCompleted).length;
        const total = tierTasks.length;
        const percent = total === 0 ? 100 : Math.round((completed / total) * 100);

        return {
          tier,
          completed,
          total,
          percent,
        };
      });

      return {
        region,
        totalCompleted,
        totalTasks,
        totalPercent,
        tiers,
      };
    });
  }, [regions, enrichedTasks]);

  const totalLevel = useMemo(() => {
    return SKILL_NAMES.reduce((sum, skill) => sum + playerSkills[skill], 0);
  }, [playerSkills]);

  const combatLevel = useMemo(() => {
    return calculateCombatLevel(playerSkills);
  }, [playerSkills]);

  return (
    <main className="app">
      <header className="app__toolbar">
        <div className="app__toolbar-top">
          <div className="app__title-row">
            <h1 className="app__title">OSRS Leagues 6 Task Tracker</h1>

            <button className="app__skills-button" type="button" onClick={() => setIsSkillModalOpen(true)}>
              Edit skill levels
            </button>
          </div>

          <div className="app__summary-row">
            <div className="app__stats">
              <span>{tasks.length} tasks</span>
              <span>{completedCount} completed</span>
              <span>{filteredTasks.length} shown</span>
            </div>

            <div className="app__global-progress">
              <div className="app__global-progress-top">
                <span>Global Progress</span>
                <span>
                  {globalProgress.percent}% · {globalProgress.completed}/{globalProgress.total}
                </span>
              </div>
              <div className="progress-bar">
                <div className="progress-bar__fill" style={{ width: `${globalProgress.percent}%` }} />
              </div>
            </div>
          </div>
        </div>

        <div className="app__search-row">
          <input
            className="app__search"
            type="text"
            placeholder="Search by name, description, region, quest, or skill..."
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
          />
        </div>

        <div className="app__filters">
          <div className="app__filter app__filter--regions">
            <span>Regions</span>
            <div className="app__multi-select">
              {regions.map((region) => {
                const checked = selectedRegions.includes(region);

                return (
                  <label key={region} className="app__multi-option">
                    <input type="checkbox" checked={checked} onChange={(event) => handleRegionChange(region, event.target.checked)} />
                    <span>{toTitleCase(region)}</span>
                  </label>
                );
              })}
            </div>
          </div>

          <label className="app__filter">
            <span>Tier</span>
            <select value={selectedTier} onChange={(event) => setSelectedTier(event.target.value as "all" | TaskTier)}>
              <option value="all">All tiers</option>
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
              <option value="elite">Elite</option>
              <option value="master">Master</option>
            </select>
          </label>

          <label className="app__filter">
            <span>Sort by</span>
            <select value={sortField} onChange={(event) => setSortField(event.target.value as SortField)}>
              <option value="name">Name</option>
              <option value="tier">Tier</option>
              <option value="region">Region</option>
            </select>
          </label>

          <label className="app__filter">
            <span>Direction</span>
            <select value={sortDirection} onChange={(event) => setSortDirection(event.target.value as SortDirection)}>
              <option value="asc">Ascending</option>
              <option value="desc">Descending</option>
            </select>
          </label>

          <div className="app__toggle-group">
            <label className="app__checkbox-filter">
              <input type="checkbox" checked={hideCompleted} onChange={(event) => setHideCompleted(event.target.checked)} />
              <span>Hide completed</span>
            </label>

            <label className="app__checkbox-filter">
              <input type="checkbox" checked={hideUncompletable} onChange={(event) => setHideUncompletable(event.target.checked)} />
              <span>Hide uncompletable</span>
            </label>
          </div>
        </div>

        <div className="app__progress-section app__progress-section--combined">
          <div className="app__progress-group">
            <h2 className="app__progress-title">Region Progress</h2>

            <div className="combined-progress-list">
              {regionTierProgress.map((entry) => (
                <div key={entry.region} className="combined-progress-card">
                  <div className="combined-progress-card__top">
                    <span className="combined-progress-card__title">{toTitleCase(entry.region)}</span>
                    <span className="combined-progress-card__summary">
                      {entry.totalPercent}% · {entry.totalCompleted}/{entry.totalTasks}
                    </span>
                  </div>

                  <div className="tier-segment-bar">
                    {entry.tiers.map((tierEntry) => {
                      return (
                        <div
                          key={tierEntry.tier}
                          className={`tier-segment tier-segment--${tierEntry.tier} ${tierEntry.percent === 100 ? "tier-segment--complete" : ""}`}
                          title={
                            tierEntry.total === 0
                              ? `${toTitleCase(tierEntry.tier)}: No tasks`
                              : `${toTitleCase(tierEntry.tier)}: ${tierEntry.percent}% · ${tierEntry.completed}/${tierEntry.total}`
                          }
                        >
                          <div className="tier-segment__fill" style={{ width: `${tierEntry.percent}%` }} />

                          <div className="tier-segment__label">
                            <span className="tier-segment__label-name">{toTitleCase(tierEntry.tier)}</span>
                            <span className="tier-segment__label-count">
                              {tierEntry.completed}/{tierEntry.total}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </header>

      <section className="task-list">
        {filteredTasks.map((entry) => (
          <TaskCard
            key={entry.taskId}
            task={entry.task}
            taskId={entry.taskId}
            isCompleted={entry.isCompleted}
            isCompletable={entry.isCompletable}
            onToggleComplete={toggleTaskComplete}
          />
        ))}
      </section>

      {isSkillModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsSkillModalOpen(false)}>
          <div className="modal modal--skills" onClick={(event) => event.stopPropagation()}>
            <div className="modal__header modal__header--skills">
              <div className="modal__title-group">
                <h2>Skill Levels</h2>
                <span className="modal__substat">
                  Combat: <span className="modal__substat__combat_level">{combatLevel}</span>
                </span>
              </div>

              <button type="button" className="modal__close" onClick={() => setIsSkillModalOpen(false)} aria-label="Close skill modal">
                ✕
              </button>
            </div>

            <div className="skill-grid">
              {SKILL_NAMES.map((skill) => (
                <label key={skill} className="skill-grid__item">
                  <img className="skill-grid__icon" src={getSkillIconPath(skill)} alt={skill} title={toTitleCase(skill)} />

                  <input
                    type="number"
                    min={1}
                    max={99}
                    value={playerSkills[skill]}
                    onChange={(event) => handleSkillChange(skill, event.target.value)}
                  />
                </label>
              ))}

              <div className="skill-grid__total">
                <span className="skill-grid__total-label">Total level</span>
                <span className="skill-grid__total-value">{totalLevel}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
