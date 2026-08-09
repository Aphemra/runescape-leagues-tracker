import { useMemo, useState } from "react";
import type { LeagueManifest } from "../domain/leagues/types";
import { summarizeProgress, type TaskView } from "../domain/leagues/selectTasks";

type ProgressPanelProps = {
  manifest: LeagueManifest;
  views: TaskView[];
};

export default function ProgressPanel({ manifest, views }: ProgressPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const locationFacet = manifest.facets.find((facet) => facet.id === "location");

  const entries = useMemo(() => {
    if (!locationFacet) return [];

    return locationFacet.values.map((value) => {
      const locationViews = views.filter((view) => view.task.facets.location?.includes(value.id));

      return {
        value,
        progress: summarizeProgress(locationViews),
      };
    });
  }, [locationFacet, views]);

  if (entries.length === 0) return null;

  return (
    <section className="progress-panel">
      <button
        className="progress-panel__toggle"
        type="button"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((current) => !current)}
      >
        <span>Progress by {locationFacet?.label.toLocaleLowerCase()}</span>

        <span className="progress-panel__chevron" aria-hidden="true">
          ▾
        </span>
      </button>

      <div
        className={`accordion-region${isOpen ? " accordion-region--open" : ""}`}
        aria-hidden={!isOpen}
        inert={isOpen ? undefined : true}
      >
        <div>
          <div className="progress-panel__list">
            {entries.map(({ value, progress }) => (
              <div className="mini-progress" key={value.id}>
                <div>
                  <span>{value.label}</span>
                  <span>
                    {progress.completed}/{progress.total}
                  </span>
                </div>

                <div className="progress-track" aria-label={`${value.label}: ${progress.percent}% complete`}>
                  <span style={{ width: `${progress.percent}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
