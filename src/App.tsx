import "./App.css";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { domToPng, waitUntilLoad } from "modern-screenshot";
import FiltersPanel from "./components/FiltersPanel";
import DifficultyProgressPanel from "./components/DifficultyProgressPanel";
import PlayerStatsModal from "./components/PlayerStatsModal";
import ShareProgressCard from "./components/ShareProgressCard";
import ProgressPanel from "./components/ProgressPanel";
import TaskCard from "./components/TaskCard";
import { DEFAULT_LEAGUE_ID, isKnownLeagueId, leagueCatalog, loadLeagueDataset } from "./data/leagues/catalog";
import {
  buildTaskViews,
  filterAndSortTaskViews,
  scopeTaskViewsToLocations,
  summarizeProgress,
} from "./domain/leagues/selectTasks";
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

type ShareCaptureRequest = {
  id: number;
  username: string;
  filename: string;
};

function safeFilenamePart(value: string): string {
  return (
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "account"
  );
}

function toggleId(ids: string[], id: string): string[] {
  return ids.includes(id) ? ids.filter((entry) => entry !== id) : [...ids, id];
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
  const [shareCapture, setShareCapture] = useState<ShareCaptureRequest | null>(null);
  const [isCapturingShare, setIsCapturingShare] = useState(false);
  const shareCardRef = useRef<HTMLElement>(null);

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

  useEffect(() => {
    if (!shareCapture || !shareCardRef.current) return;

    const captureNode = shareCardRef.current;
    const captureFilename = shareCapture.filename;
    let cancelled = false;

    async function captureShareCard() {
      try {
        await document.fonts.ready;

        await waitUntilLoad(captureNode, {
          timeout: 10_000,
        });

        await new Promise<void>((resolve) => {
          requestAnimationFrame(() => {
            requestAnimationFrame(() => resolve());
          });
        });

        if (cancelled) return;

        const dataUrl = await domToPng(captureNode, {
          scale: 2,
        });

        if (cancelled) return;

        const anchor = document.createElement("a");
        anchor.href = dataUrl;
        anchor.download = captureFilename;

        document.body.append(anchor);
        anchor.click();
        anchor.remove();
      } catch (error: unknown) {
        if (!cancelled) {
          console.error("Could not generate the progression image.", error);

          window.alert(
            error instanceof Error
              ? `Could not generate the progression image: ${error.message}`
              : "Could not generate the progression image.",
          );
        }
      } finally {
        if (!cancelled) {
          setShareCapture(null);
          setIsCapturingShare(false);
        }
      }
    }

    void captureShareCard();

    return () => {
      cancelled = true;
    };
  }, [shareCapture]);

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
  const activeTaskViews = useMemo(() => taskViews.filter((view) => !view.isHidden), [taskViews]);

  const hiddenTaskCount = taskViews.length - activeTaskViews.length;

  const selectedLocationIds = useMemo(
    () => leagueState?.filters.facets.location ?? [],
    [leagueState?.filters.facets.location],
  );

  const selectedRegionTaskViews = useMemo(
    () => scopeTaskViewsToLocations(activeTaskViews, selectedLocationIds),
    [activeTaskViews, selectedLocationIds],
  );

  const taskProgress = useMemo(() => summarizeProgress(selectedRegionTaskViews), [selectedRegionTaskViews]);

  const accountProgress = useMemo(() => summarizeProgress(activeTaskViews), [activeTaskViews]);

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
      hiddenOnly: false,
    });
  }

  function requestShareImage() {
    if (!dataset || isCapturingShare) return;

    const enteredUsername = window.prompt("Enter the account name to display on the progression image:", "");

    if (enteredUsername === null) return;

    const username = enteredUsername.trim();

    if (!username) {
      window.alert("Enter an account name before generating the image.");
      return;
    }

    setIsCapturingShare(true);
    setShareCapture({
      id: Date.now(),
      username,
      filename: `${dataset.manifest.id}-${safeFilenamePart(username)}-progress.png`,
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
                setShareCapture(null);
                setIsCapturingShare(false);
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
              className="secondary-button topbar__share"
              type="button"
              disabled={isCapturingShare}
              onClick={requestShareImage}
            >
              {isCapturingShare ? "Creating image…" : "Share image"}
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

          <div className="overall-progress">
            <div className="overall-progress__labels">
              <span>
                <strong>{taskProgress.completed.toLocaleString()}</strong> / {taskProgress.total.toLocaleString()} tasks
              </span>

              <span>
                <strong>{accountProgress.pointsEarned.toLocaleString()}</strong> pts · {taskProgress.percent}%
              </span>
            </div>

            <div
              className="progress-track progress-track--large"
              aria-label={`${taskProgress.percent}% complete in ${
                selectedLocationIds.length > 0 ? "the selected regions" : "all regions"
              }`}
            >
              <span style={{ width: `${taskProgress.percent}%` }} />
            </div>
          </div>

          {progressionTracks.length > 0 && (
            <div className="overall-progress__milestones">
              {progressionTracks.map((track) => (
                <MilestoneProgress key={track.id} track={track} points={accountProgress.pointsEarned} />
              ))}
            </div>
          )}
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
              totalCount={leagueState.filters.hiddenOnly ? hiddenTaskCount : activeTaskViews.length}
              hiddenCount={hiddenTaskCount}
              onChange={updateFilters}
              onClose={() => setIsFiltersOpen(false)}
            />
            <ProgressPanel manifest={manifest} views={activeTaskViews} selectedLocationIds={selectedLocationIds} />
            <DifficultyProgressPanel
              manifest={manifest}
              views={activeTaskViews}
              selectedLocationIds={selectedLocationIds}
            />
          </div>
        </aside>

        <section className="task-results" aria-labelledby="task-results-title">
          <div className="task-results__header">
            <div>
              <p className="eyebrow">Task list</p>
              <h2 id="task-results-title">
                {filteredViews.length.toLocaleString()}{" "}
                {leagueState.filters.hiddenOnly ? "hidden tasks" : "matching tasks"}
              </h2>
            </div>
            <p>
              {taskProgress.completed.toLocaleString()} complete{" "}
              {selectedLocationIds.length > 0 ? "in selected regions" : "overall"}
            </p>
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
                  isHidden={view.isHidden}
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
                  onToggleHidden={(taskId) =>
                    updateState((current) => ({
                      ...current,
                      hiddenTaskIds: toggleId(current.hiddenTaskIds, taskId),
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
              <span aria-hidden="true">{leagueState.filters.hiddenOnly ? "⊘" : "⌕"}</span>

              <h3>
                {leagueState.filters.hiddenOnly
                  ? hiddenTaskCount === 0
                    ? "No hidden tasks"
                    : "No hidden tasks match"
                  : "No tasks match"}
              </h3>

              <p>
                {leagueState.filters.hiddenOnly
                  ? hiddenTaskCount === 0
                    ? "Tasks you hide will remain available here."
                    : "The hidden tasks are being excluded by another active filter."
                  : "Try a broader search or clear the active filters."}
              </p>

              <button className="primary-button" type="button" onClick={clearSearchAndFilters}>
                {leagueState.filters.hiddenOnly ? "Return to active tasks" : "Show all tasks"}
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

      {shareCapture &&
        createPortal(
          <div className="share-card-capture" aria-hidden="true" data-capture-id={shareCapture.id}>
            <ShareProgressCard
              ref={shareCardRef}
              username={shareCapture.username}
              manifest={manifest}
              stats={leagueState.stats}
              maxedStatIds={leagueState.maxedStatIds}
              views={activeTaskViews}
              selectedLocationIds={selectedLocationIds}
            />
          </div>,
          document.body,
        )}

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
