import { useMemo, useState, type CSSProperties } from "react";
import type { LeagueManifest } from "../domain/leagues/types";
import { scopeTaskViewsToLocations, summarizeProgress, type TaskView } from "../domain/leagues/selectTasks";

type DifficultyProgressPanelProps = {
  manifest: LeagueManifest;
  views: TaskView[];
  selectedLocationIds: string[];
};

type TierProgressStyle = CSSProperties & {
  "--tier-progress-color": string;
};

export default function DifficultyProgressPanel({
  manifest,
  views,
  selectedLocationIds,
}: DifficultyProgressPanelProps) {
  const [isOpen, setIsOpen] = useState(false);

  const entries = useMemo(() => {
    const locationScopedViews = scopeTaskViewsToLocations(views, selectedLocationIds);

    return [...manifest.tiers]
      .sort((left, right) => left.order - right.order)
      .map((tier) => ({
        tier,
        progress: summarizeProgress(locationScopedViews.filter((view) => view.task.tierId === tier.id)),
      }));
  }, [manifest.tiers, selectedLocationIds, views]);

  if (entries.length === 0) {
    return null;
  }

  return (
    <section className="progress-panel">
      <button
        className="progress-panel__toggle"
        type="button"
        aria-expanded={isOpen}
        aria-controls="difficulty-progress-content"
        onClick={() => setIsOpen((current) => !current)}
      >
        <span>Progress by difficulty</span>

        <span className="progress-panel__chevron" aria-hidden="true">
          ▾
        </span>
      </button>

      <div
        id="difficulty-progress-content"
        className={`accordion-region${isOpen ? " accordion-region--open" : ""}`}
        aria-hidden={!isOpen}
        inert={isOpen ? undefined : true}
      >
        <div>
          <div className="progress-panel__list">
            {entries.map(({ tier, progress }) => {
              const tierStyle: TierProgressStyle = {
                "--tier-progress-color": tier.color,
              };

              return (
                <div className="mini-progress mini-progress--tier" style={tierStyle} key={tier.id}>
                  <div>
                    <span className="mini-progress__tier-label">{tier.label}</span>

                    <span>
                      {progress.completed}/{progress.total}
                    </span>
                  </div>

                  <div
                    className="progress-track"
                    aria-label={`${tier.label}: ${progress.percent}% complete`}
                    title={`${progress.pointsEarned.toLocaleString()} of ${progress.pointsAvailable.toLocaleString()} points`}
                  >
                    <span
                      style={{
                        width: `${progress.percent}%`,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
