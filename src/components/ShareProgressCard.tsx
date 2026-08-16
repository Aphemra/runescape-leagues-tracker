import { forwardRef, useMemo, type CSSProperties } from "react";
import { assetPath } from "../domain/leagues/presentation";
import { scopeTaskViewsToLocations, summarizeProgress, type TaskView } from "../domain/leagues/selectTasks";
import type { LeagueManifest } from "../domain/leagues/types";
import { MilestoneProgress } from "./MilestoneProgress";

type ShareProgressCardProps = {
  username: string;
  manifest: LeagueManifest;
  stats: Record<string, number>;
  maxedStatIds: string[];
  views: TaskView[];
  selectedLocationIds: string[];
};

type TierProgressStyle = CSSProperties & {
  "--share-tier-color": string;
};

type ShareCardStyle = CSSProperties & {
  "--share-accent": string;
  "--share-accent-bright": string;
  "--share-accent-deep": string;
};

const AUTOMATIC_REGION_IDS = new Set(["global", "general", "misthalin", "havenhythe", "karamja"]);

const REGION_CHOICE_LIMIT = 3;

const ShareProgressCard = forwardRef<HTMLElement, ShareProgressCardProps>(function ShareProgressCard(
  { username, manifest, stats, maxedStatIds, views, selectedLocationIds },
  ref,
) {
  const selectedRegionViews = useMemo(
    () => scopeTaskViewsToLocations(views, selectedLocationIds),
    [selectedLocationIds, views],
  );

  const taskProgress = useMemo(() => summarizeProgress(selectedRegionViews), [selectedRegionViews]);

  const accountProgress = useMemo(() => summarizeProgress(views), [views]);

  const locationFacet = manifest.facets.find((facet) => facet.id === "location");

  const selectedLocations = useMemo(() => {
    const selected = new Set(selectedLocationIds);

    return locationFacet?.values.filter((location) => selected.has(location.id)) ?? [];
  }, [locationFacet, selectedLocationIds]);

  const chosenLocations = useMemo(
    () => selectedLocations.filter((location) => !AUTOMATIC_REGION_IDS.has(location.id)),
    [selectedLocations],
  );

  const locationProgress = useMemo(
    () =>
      selectedLocations.map((location) => ({
        location,
        progress: summarizeProgress(views.filter((view) => view.task.facets.location?.includes(location.id))),
      })),
    [selectedLocations, views],
  );

  const difficultyProgress = useMemo(
    () =>
      [...manifest.tiers]
        .sort((left, right) => left.order - right.order)
        .map((tier) => ({
          tier,
          progress: summarizeProgress(selectedRegionViews.filter((view) => view.task.tierId === tier.id)),
        })),
    [manifest.tiers, selectedRegionViews],
  );

  const skillSummary = useMemo(() => {
    const maxedStats = new Set(maxedStatIds);
    let actualTotal = 0;
    let virtualTotal = 0;

    const entries = manifest.playerStats.map((stat) => {
      const virtualMaximum = stat.virtualMaximum ?? stat.maximum;

      const isMaxed = maxedStats.has(stat.id);

      const value = isMaxed ? virtualMaximum : (stats[stat.id] ?? stat.defaultValue);

      const actualLevel = Math.min(stat.maximum, value);

      const virtualLevel = Math.min(virtualMaximum, value);

      actualTotal += actualLevel;
      virtualTotal += virtualLevel;

      const isVirtualCap = isMaxed || value >= virtualMaximum;

      const isLevelCap = !isVirtualCap && value >= stat.maximum;

      return {
        stat,
        actualLevel,
        virtualLevel,
        isMaxed,
        isVirtualCap,
        isLevelCap,
      };
    });

    return {
      entries,
      actualTotal,
      virtualTotal,
    };
  }, [manifest.playerStats, maxedStatIds, stats]);

  const theme = manifest.theme ?? {
    accent: "#4c93c2",
    accentBright: "#92cfee",
    accentDeep: "#142638",
  };

  const cardStyle: ShareCardStyle = {
    "--share-accent": theme.accent,
    "--share-accent-bright": theme.accentBright,
    "--share-accent-deep": theme.accentDeep,
  };

  return (
    <article className={`share-card share-card--${manifest.game}`} style={cardStyle} ref={ref}>
      <header className="share-card__masthead">
        <div className="share-card__identity">
          <span className="share-card__mark" aria-hidden="true">
            L
          </span>

          <div>
            <p>League Ledger</p>
            <h2>{username || "Account name"}</h2>
            <span>
              {manifest.shortName} · {manifest.edition}
            </span>
          </div>
        </div>

        <div className="share-card__task-progress">
          <div className="share-card__section-heading">
            <div>
              <span>Selected-region completion</span>

              <strong>
                {taskProgress.completed.toLocaleString()} / {taskProgress.total.toLocaleString()} tasks
              </strong>
            </div>

            <strong>{taskProgress.percent}%</strong>
          </div>

          <div className="share-card__main-track">
            <span
              style={{
                width: `${taskProgress.percent}%`,
              }}
            />
          </div>
        </div>

        <div className="share-card__route">
          <div className="share-card__route-heading">
            <span>{chosenLocations.length < REGION_CHOICE_LIMIT ? "Region choices so far" : "Chosen regions"}</span>

            <strong>
              {chosenLocations.length}/{REGION_CHOICE_LIMIT}
            </strong>
          </div>

          <div className="share-card__route-icons">
            {chosenLocations.length > 0 ? (
              chosenLocations.map((location) => (
                <div
                  className="share-region share-region--compact"
                  key={location.id}
                  title={location.label}
                  aria-label={location.label}
                >
                  {location.icon ? (
                    <img src={assetPath(location.icon)} alt="" />
                  ) : (
                    <span className="share-region__fallback">{location.label.slice(0, 2)}</span>
                  )}
                </div>
              ))
            ) : (
              <span className="share-card__route-empty">No regions selected</span>
            )}
          </div>
        </div>

        <div className="share-card__points">
          <span>League points</span>
          <strong>{accountProgress.pointsEarned.toLocaleString()}</strong>
        </div>
      </header>

      <div className="share-card__content">
        <section className="share-card__panel share-card__skills">
          <header className="share-card__panel-header share-card__skills-header">
            <div>
              <span>Account development</span>
              <h3>Player levels</h3>
            </div>

            <div className="share-card__total-level">
              <span>Total level</span>

              <strong>
                {skillSummary.actualTotal.toLocaleString()}

                {skillSummary.virtualTotal > skillSummary.actualTotal && (
                  <small> ({skillSummary.virtualTotal.toLocaleString()})</small>
                )}
              </strong>
            </div>
          </header>

          <div className="share-card__skill-grid">
            {skillSummary.entries.map(({ stat, actualLevel, virtualLevel, isMaxed, isVirtualCap, isLevelCap }) => {
              const capClass = isMaxed
                ? " share-skill--maxed"
                : isVirtualCap
                  ? " share-skill--virtual-cap"
                  : isLevelCap
                    ? " share-skill--level-cap"
                    : "";

              return (
                <div
                  className={`share-skill${capClass}`}
                  key={stat.id}
                  title={`${stat.label}: ${actualLevel} (${virtualLevel} virtual)`}
                  aria-label={`${stat.label}: level ${actualLevel}, virtual level ${virtualLevel}${
                    isMaxed ? ", 200 million experience" : ""
                  }`}
                >
                  {stat.icon ? (
                    <img src={assetPath(stat.icon)} alt="" />
                  ) : (
                    <span className="share-skill__fallback" aria-hidden="true">
                      {stat.label.slice(0, 2)}
                    </span>
                  )}

                  <span className="share-skill__levels">
                    <strong>{actualLevel}</strong>

                    <span className="share-skill__separator" aria-hidden="true">
                      |
                    </span>

                    <span>{virtualLevel}</span>
                  </span>
                </div>
              );
            })}
          </div>

          <div className="share-card__skill-legend" aria-label="Skill display legend">
            <span className="share-card__level-order">Current | Virtual</span>

            <span>
              <i className="share-card__legend-swatch share-card__legend-swatch--level" />
              Level cap
            </span>

            <span>
              <i className="share-card__legend-swatch share-card__legend-swatch--virtual" />
              Virtual cap
            </span>

            <span>
              <i className="share-card__legend-swatch share-card__legend-swatch--maxed" />
              200m XP
            </span>
          </div>
        </section>

        <section className="share-card__panel share-card__breakdown">
          <header className="share-card__panel-header">
            <div>
              <span>Selected-route task breakdown</span>
              <h3>League progress</h3>
            </div>
          </header>

          {manifest.progressionTracks && manifest.progressionTracks.length > 0 && (
            <div className="share-card__milestones">
              {manifest.progressionTracks.map((track) => (
                <MilestoneProgress key={track.id} track={track} points={accountProgress.pointsEarned} />
              ))}
            </div>
          )}

          <div className="share-card__breakdown-grid">
            <section className="share-card__breakdown-section">
              <h4>By location</h4>

              <div className="share-card__progress-list">
                {locationProgress.length > 0 ? (
                  locationProgress.map(({ location, progress }) => (
                    <div className="share-mini-progress" key={location.id}>
                      <div>
                        <span>{location.label}</span>

                        <strong>
                          {progress.completed}/{progress.total}
                        </strong>
                      </div>

                      <div className="share-mini-progress__track">
                        <span
                          style={{
                            width: `${progress.percent}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="share-card__empty-copy">No specific regions selected.</p>
                )}
              </div>
            </section>

            <section className="share-card__breakdown-section">
              <h4>By difficulty</h4>

              <div className="share-card__progress-list">
                {difficultyProgress.map(({ tier, progress }) => {
                  const tierStyle: TierProgressStyle = {
                    "--share-tier-color": tier.color,
                  };

                  return (
                    <div className="share-mini-progress share-mini-progress--tier" style={tierStyle} key={tier.id}>
                      <div>
                        <span>{tier.label}</span>

                        <strong>
                          {progress.completed}/{progress.total}
                        </strong>
                      </div>

                      <div className="share-mini-progress__track">
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
            </section>
          </div>
        </section>
      </div>

      <footer className="share-card__footer">
        <span>
          RuneScape League Ledger:{" "}
          <span className="share-card__website-color">aphemra.github.io/runescape-leagues-tracker</span>
        </span>

        <span>
          Generated{" "}
          {new Date().toLocaleDateString(undefined, {
            year: "numeric",
            month: "short",
            day: "numeric",
          })}
        </span>
      </footer>
    </article>
  );
});

export default ShareProgressCard;
