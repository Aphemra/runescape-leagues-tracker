import "./App.css";
import { useEffect, useMemo, useState } from "react";
import FiltersPanel from "./components/FiltersPanel";
import PlayerStatsModal from "./components/PlayerStatsModal";
import ProgressPanel from "./components/ProgressPanel";
import TaskCard from "./components/TaskCard";
import { DEFAULT_LEAGUE_ID, isKnownLeagueId, leagueCatalog, loadLeagueDataset } from "./data/leagues/catalog";
import { buildTaskViews, filterAndSortTaskViews, summarizeProgress } from "./domain/leagues/selectTasks";
import { countActiveFilters } from "./domain/leagues/filterState";
import { MilestoneProgress } from "./components/MilestoneProgress";
import type { LeagueDataset } from "./domain/leagues/types";
import {
  buildDefaultLeagueState,
  loadAppSettings,
  loadLeagueState,
  saveAppSettings,
  saveLeagueState,
} from "./domain/storage/localStorage";
import type { LeagueFilterState, LeagueUserState } from "./domain/storage/types";
import { migrateLegacyV1State } from "./migrations/legacyV1";

const INITIAL_TASK_LIMIT = 100;

function toggleId(ids: string[], id: string): string[] {
  return ids.includes(id) ? ids.filter((entry) => entry !== id) : [...ids, id];
}

function makeExport(state: LeagueUserState, leagueName: string): void {
  const payload = JSON.stringify(
    { app: "RuneScape Leagues Tracker", leagueName, exportedAt: new Date().toISOString(), state },
    null,
    2,
  );
  const url = URL.createObjectURL(new Blob([payload], { type: "application/json" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${state.leagueId}-save.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export default function App() {
  const [selectedLeagueId, setSelectedLeagueId] = useState(() => {
    const saved = loadAppSettings(DEFAULT_LEAGUE_ID).selectedLeagueId;
    return isKnownLeagueId(saved) ? saved : DEFAULT_LEAGUE_ID;
  });
  const [dataset, setDataset] = useState<LeagueDataset | null>(null);
  const [leagueState, setLeagueState] = useState<LeagueUserState | null>(null);
  const [loadError, setLoadError] = useState("");
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [isStatsOpen, setIsStatsOpen] = useState(false);
  const [visibleLimit, setVisibleLimit] = useState(INITIAL_TASK_LIMIT);

  const catalogEntry = leagueCatalog.find((entry) => entry.id === selectedLeagueId) ?? leagueCatalog[0];

  useEffect(() => {
    saveAppSettings({ schemaVersion: 2, selectedLeagueId });
    let active = true;

    loadLeagueDataset(selectedLeagueId)
      .then((nextDataset) => {
        if (!active) return;
        const saved = loadLeagueState(nextDataset.manifest);
        const migrated =
          !saved && selectedLeagueId === "osrs-demonic-pacts-2026"
            ? migrateLegacyV1State(nextDataset.manifest, nextDataset.tasks)
            : null;
        const nextState = saved ?? migrated ?? buildDefaultLeagueState(nextDataset.manifest);
        if (migrated) saveLeagueState(migrated);
        setDataset(nextDataset);
        setLeagueState(nextState);
      })
      .catch((error: unknown) => {
        if (!active) return;
        setLoadError(error instanceof Error ? error.message : "The league dataset could not be loaded.");
      });

    return () => {
      active = false;
    };
  }, [selectedLeagueId]);

  useEffect(() => {
    if (leagueState) saveLeagueState(leagueState);
  }, [leagueState]);

  const taskViews = useMemo(
    () => (dataset && leagueState ? buildTaskViews(dataset, leagueState) : []),
    [dataset, leagueState],
  );
  const tierOrder = useMemo(
    () => new Map(dataset?.manifest.tiers.map((tier) => [tier.id, tier.order]) ?? []),
    [dataset],
  );
  const filteredViews = useMemo(
    () => (leagueState ? filterAndSortTaskViews(taskViews, leagueState.filters, tierOrder) : []),
    [leagueState, taskViews, tierOrder],
  );
  const progress = useMemo(() => summarizeProgress(taskViews), [taskViews]);
  const progressionTracks = dataset?.manifest.progressionTracks ?? [];
  const visibleViews = filteredViews.slice(0, visibleLimit);
  const activeFilterCount = leagueState ? countActiveFilters(leagueState.filters) : 0;

  function updateState(updater: (current: LeagueUserState) => LeagueUserState) {
    setLeagueState((current) => (current ? updater(current) : current));
  }

  function updateFilters(filters: LeagueFilterState) {
    setVisibleLimit(INITIAL_TASK_LIMIT);
    updateState((current) => ({ ...current, filters }));
  }

  function clearSearchAndFilters() {
    if (!leagueState) return;
    updateFilters({
      ...leagueState.filters,
      search: "",
      tierIds: [],
      skillIds: [],
      facets: {},
      completion: "all",
      requirements: "all",
      favoritesOnly: false,
    });
  }

  if (loadError) {
    return (
      <main className="status-screen">
        <p className="eyebrow">Dataset error</p>
        <h1>Could not open {catalogEntry.name}</h1>
        <pre>{loadError}</pre>
        <button className="primary-button" type="button" onClick={() => window.location.reload()}>
          Reload app
        </button>
      </main>
    );
  }

  if (!dataset || !leagueState) {
    return (
      <main className="status-screen" aria-live="polite">
        <div className="loader" aria-hidden="true" />
        <p>Loading {catalogEntry.name} tasks…</p>
      </main>
    );
  }

  const { manifest } = dataset;

  return (
    <div className={`app-shell app-shell--${manifest.game}`}>
      <header className="topbar">
        <div className="topbar__main">
          <div className="brand">
            <span className="brand__mark" aria-hidden="true">
              L
            </span>
            <div>
              <p>RuneScape</p>
              <strong>League Ledger</strong>
            </div>
          </div>

          <label className="league-picker">
            <span>Active league</span>
            <select
              value={selectedLeagueId}
              onChange={(event) => {
                setDataset(null);
                setLeagueState(null);
                setLoadError("");
                setSelectedLeagueId(event.target.value);
                setVisibleLimit(INITIAL_TASK_LIMIT);
                setIsFiltersOpen(false);
                setIsStatsOpen(false);
              }}
            >
              {leagueCatalog.map((entry) => (
                <option value={entry.id} key={entry.id}>
                  {entry.gameLabel} · {entry.edition} - {entry.name}
                </option>
              ))}
            </select>
          </label>

          <div className="topbar__actions">
            <button className="secondary-button" type="button" onClick={() => setIsStatsOpen(true)}>
              Player levels
            </button>
            <button
              className="secondary-button topbar__export"
              type="button"
              onClick={() => makeExport(leagueState, manifest.name)}
            >
              Export save
            </button>
          </div>
        </div>

        <div className="topbar__context">
          <div className="league-heading">
            <div>
              <span className={`game-chip game-chip--${manifest.game}`}>
                {manifest.game === "osrs" ? "Old School" : "RuneScape"}
              </span>

              {manifest.status === "partial" && <span className="status-chip">Published so far</span>}
            </div>

            <h1>
              {manifest.shortName} <span>{manifest.edition}</span>
            </h1>
          </div>

          <div className="searchbar">
            <label className="search-input">
              <span className="search-input__icon" aria-hidden="true">
                ⌕
              </span>

              <span className="sr-only">Search tasks</span>

              <input
                type="search"
                value={leagueState.filters.search}
                placeholder="Search task, description, location, or requirement…"
                onChange={(event) =>
                  updateFilters({
                    ...leagueState.filters,
                    search: event.target.value,
                  })
                }
              />
            </label>

            <button className="secondary-button filter-button" type="button" onClick={() => setIsFiltersOpen(true)}>
              Filters
              {activeFilterCount > 0 && <span>{activeFilterCount}</span>}
            </button>
          </div>

          <div className="overall-progress">
            <div className="overall-progress__labels">
              <span>
                <strong>{progress.completed.toLocaleString()}</strong> / {progress.total.toLocaleString()} tasks
              </span>

              <span>
                <strong>{progress.pointsEarned.toLocaleString()}</strong> pts · {progress.percent}%
              </span>
            </div>

            <div className="progress-track progress-track--large" aria-label={`${progress.percent}% complete`}>
              <span style={{ width: `${progress.percent}%` }} />
            </div>
          </div>

          {progressionTracks.length > 0 && (
            <div className="overall-progress__milestones">
              {progressionTracks.map((track) => (
                <MilestoneProgress key={track.id} track={track} points={progress.pointsEarned} />
              ))}
            </div>
          )}
        </div>
      </header>

      {manifest.status === "partial" && (
        <div className="publication-notice" role="status">
          <span aria-hidden="true">i</span>
          <p>
            <strong>{manifest.expectedTaskCount?.toLocaleString()} tasks are available.</strong> This checked-in
            snapshot will expand when the Wiki publishes the remaining tiers.
          </p>
        </div>
      )}

      <main className="workspace">
        <aside className={`filters-shell${isFiltersOpen ? " filters-shell--open" : ""}`}>
          <button
            className="filters-shell__backdrop"
            type="button"
            aria-label="Close filters"
            onClick={() => setIsFiltersOpen(false)}
          />
          <div className="filters-shell__content">
            <FiltersPanel
              manifest={manifest}
              filters={leagueState.filters}
              shownCount={filteredViews.length}
              totalCount={taskViews.length}
              onChange={updateFilters}
              onClose={() => setIsFiltersOpen(false)}
            />
            <ProgressPanel
              manifest={manifest}
              views={taskViews}
              selectedLocationIds={leagueState.filters.facets.location ?? []}
            />
          </div>
        </aside>

        <section className="task-results" aria-labelledby="task-results-title">
          <div className="task-results__header">
            <div>
              <p className="eyebrow">Task list</p>
              <h2 id="task-results-title">{filteredViews.length.toLocaleString()} matching tasks</h2>
            </div>
            <p>{progress.completed.toLocaleString()} complete overall</p>
          </div>

          {visibleViews.length > 0 ? (
            <div className="task-list">
              {visibleViews.map((view) => (
                <TaskCard
                  key={view.task.id}
                  task={view.task}
                  manifest={manifest}
                  isCompleted={view.isCompleted}
                  isFavorite={view.isFavorite}
                  requirementStatus={view.requirementStatus}
                  note={leagueState.taskNotes[view.task.id] ?? ""}
                  onToggleComplete={(taskId) =>
                    updateState((current) => ({
                      ...current,
                      completedTaskIds: toggleId(current.completedTaskIds, taskId),
                    }))
                  }
                  onToggleFavorite={(taskId) =>
                    updateState((current) => ({
                      ...current,
                      favoriteTaskIds: toggleId(current.favoriteTaskIds, taskId),
                    }))
                  }
                  onNoteChange={(taskId, note) =>
                    updateState((current) => ({ ...current, taskNotes: { ...current.taskNotes, [taskId]: note } }))
                  }
                />
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <span aria-hidden="true">⌕</span>
              <h3>No tasks match</h3>
              <p>Try a broader search or clear the active filters.</p>
              <button className="primary-button" type="button" onClick={clearSearchAndFilters}>
                Show all tasks
              </button>
            </div>
          )}

          {visibleViews.length < filteredViews.length && (
            <button
              className="load-more"
              type="button"
              onClick={() => setVisibleLimit((limit) => limit + INITIAL_TASK_LIMIT)}
            >
              Show {Math.min(INITIAL_TASK_LIMIT, filteredViews.length - visibleViews.length)} more
              <span>
                {visibleViews.length.toLocaleString()} of {filteredViews.length.toLocaleString()} shown
              </span>
            </button>
          )}

          <footer className="data-credit">
            Task data from the{" "}
            <a href={manifest.source.url} target="_blank" rel="noreferrer">
              RuneScape Wiki
            </a>
            , revision {manifest.source.revision ?? "unknown"}, under {manifest.source.license ?? "its stated license"}.
          </footer>
        </section>
      </main>

      {isStatsOpen && (
        <PlayerStatsModal
          manifest={manifest}
          stats={leagueState.stats}
          maxedStatIds={leagueState.maxedStatIds}
          onChange={(statId, value) =>
            updateState((current) => ({
              ...current,
              stats: {
                ...current.stats,
                [statId]: value,
              },
            }))
          }
          onToggleMaxed={(statId) =>
            updateState((current) => ({
              ...current,
              maxedStatIds: toggleId(current.maxedStatIds, statId),
            }))
          }
          onClose={() => setIsStatsOpen(false)}
        />
      )}
    </div>
  );
}
