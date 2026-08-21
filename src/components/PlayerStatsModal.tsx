import { useEffect } from "react";
import type { LeagueManifest } from "../domain/leagues/types";
import { assetPath } from "../domain/leagues/presentation";

type PlayerStatsModalProps = {
  manifest: LeagueManifest;
  stats: Record<string, number>;
  maxedStatIds: string[];
  onChange: (statId: string, value: number) => void;
  onToggleMaxed: (statId: string) => void;
  onClose: () => void;
};

function calculateCombatLevel(game: LeagueManifest["game"], levels: Record<string, number>) {
  const level = (statId: string, fallback = 1) => levels[statId] ?? fallback;

  const attack = level("attack");
  const strength = level("strength");
  const defence = level("defence");
  const ranged = level("ranged");
  const magic = level("magic");
  const prayer = level("prayer");

  if (game === "osrs") {
    const baseLevel = 0.25 * (defence + level("hitpoints", 10) + Math.floor(prayer / 2));

    const offensiveLevel = Math.max(
      0.325 * (attack + strength),
      0.325 * Math.floor(ranged * 1.5),
      0.325 * Math.floor(magic * 1.5),
    );

    return Math.floor(baseLevel + offensiveLevel);
  }

  const strongestCombatStyle = Math.max(attack + strength, magic * 2, ranged * 2, level("necromancy") * 2);

  return Math.floor(
    (1.3 * strongestCombatStyle +
      defence +
      level("constitution", 10) +
      Math.floor(prayer / 2) +
      Math.floor(level("summoning") / 2)) /
      4,
  );
}

export default function PlayerStatsModal({
  manifest,
  stats,
  maxedStatIds,
  onChange,
  onToggleMaxed,
  onClose,
}: PlayerStatsModalProps) {
  const maxedStats = new Set(maxedStatIds);

  const actualLevels = Object.fromEntries(
    manifest.playerStats.map((stat) => {
      const value = maxedStats.has(stat.id) ? stat.maximum : (stats[stat.id] ?? stat.defaultValue);

      return [stat.id, Math.min(stat.maximum, Math.max(stat.minimum, value))];
    }),
  );

  const actualTotal = manifest.playerStats.reduce((sum, stat) => sum + actualLevels[stat.id], 0);

  const virtualTotal = manifest.playerStats.reduce((sum, stat) => {
    const virtualMaximum = stat.virtualMaximum ?? stat.maximum;
    const value = maxedStats.has(stat.id) ? virtualMaximum : (stats[stat.id] ?? stat.defaultValue);

    return sum + Math.min(virtualMaximum, Math.max(stat.minimum, value));
  }, 0);

  const combatLevel = calculateCombatLevel(manifest.game, actualLevels);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="modal" role="dialog" aria-modal="true" aria-labelledby="player-stats-title">
        <header className="modal__header">
          <div>
            <p className="eyebrow">Readiness checks</p>
            <h2 id="player-stats-title">Player levels</h2>
            <p>These values are saved only for {manifest.shortName}.</p>
          </div>

          <button className="icon-button" type="button" aria-label="Close player levels" onClick={onClose}>
            ×
          </button>
        </header>

        <div className="modal__body stats-groups">
          <div className="stats-grid">
            {manifest.playerStats.map((stat) => {
              const virtualMaximum = stat.virtualMaximum ?? stat.maximum;
              const value = stats[stat.id] ?? stat.defaultValue;
              const isMaxed = maxedStats.has(stat.id);

              const isVirtualCap = isMaxed || value >= virtualMaximum;

              const isLevelCap = !isVirtualCap && value >= stat.maximum;

              const capClassName = isVirtualCap
                ? " stat-input--virtual-cap"
                : isLevelCap
                  ? " stat-input--level-cap"
                  : "";

              const inputId = `player-stat-${stat.id}`;

              return (
                <div className={`stat-input${isMaxed ? " stat-input--maxed" : ""}${capClassName}`} key={stat.id}>
                  {stat.icon ? (
                    <img src={assetPath(stat.icon)} alt="" />
                  ) : (
                    <span className="stat-input__fallback" aria-hidden="true">
                      {stat.label.slice(0, 2)}
                    </span>
                  )}

                  <label className="stat-input__label" htmlFor={inputId}>
                    {stat.label}
                  </label>

                  {isMaxed ? (
                    <span className="stat-input__maxed">MAXED</span>
                  ) : (
                    <input
                      id={inputId}
                      type="number"
                      inputMode="numeric"
                      min={stat.minimum}
                      max={virtualMaximum}
                      value={value}
                      aria-label={`${stat.label} level`}
                      onChange={(event) => {
                        const next = Number(event.target.value);

                        onChange(
                          stat.id,
                          Number.isFinite(next)
                            ? Math.min(virtualMaximum, Math.max(stat.minimum, Math.floor(next)))
                            : stat.minimum,
                        );
                      }}
                    />
                  )}

                  <button
                    className="stat-input__max-toggle"
                    type="button"
                    aria-label={
                      isMaxed
                        ? `Remove 200 million XP status from ${stat.label}`
                        : `Mark ${stat.label} as 200 million XP`
                    }
                    aria-pressed={isMaxed}
                    title={isMaxed ? "Remove 200m XP status" : "Mark as 200m XP"}
                    onClick={() => onToggleMaxed(stat.id)}
                  >
                    <span aria-hidden="true">✓</span>
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        <footer className="modal__footer player-stats-modal__footer">
          <div className="player-stats-summary">
            <span>
              Total level <strong>{actualTotal.toLocaleString()}</strong>
              {virtualTotal > actualTotal && <span className="virtual-total"> ({virtualTotal.toLocaleString()})</span>}
            </span>

            <span>
              Combat level <strong>{combatLevel}</strong>
            </span>
          </div>

          <div className="player-stats-legend" aria-label="Player level color legend">
            <span>
              <i className="player-stats-legend__swatch player-stats-legend__swatch--level" aria-hidden="true" />
              Level cap
            </span>

            <span>
              <i className="player-stats-legend__swatch player-stats-legend__swatch--virtual" aria-hidden="true" />
              Virtual cap
            </span>

            <span>
              <i className="player-stats-legend__swatch player-stats-legend__swatch--maxed" aria-hidden="true" />
              200m XP
            </span>
          </div>

          <button className="primary-button" type="button" onClick={onClose}>
            Done
          </button>
        </footer>
      </section>
    </div>
  );
}
