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

export default function PlayerStatsModal({
  manifest,
  stats,
  maxedStatIds,
  onChange,
  onToggleMaxed,
  onClose,
}: PlayerStatsModalProps) {
  const maxedStats = new Set(maxedStatIds);

  const actualTotal = manifest.playerStats.reduce((sum, stat) => {
    if (maxedStats.has(stat.id)) {
      return sum + stat.maximum;
    }

    const value = stats[stat.id] ?? stat.defaultValue;
    return sum + Math.min(stat.maximum, value);
  }, 0);

  const virtualTotal = manifest.playerStats.reduce((sum, stat) => {
    const virtualMaximum = stat.virtualMaximum ?? stat.maximum;

    if (maxedStats.has(stat.id)) {
      return sum + virtualMaximum;
    }

    const value = stats[stat.id] ?? stat.defaultValue;
    return sum + Math.min(virtualMaximum, value);
  }, 0);

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
              const inputId = `player-stat-${stat.id}`;

              return (
                <div className={`stat-input${isMaxed ? " stat-input--maxed" : ""}`} key={stat.id}>
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

        <footer className="modal__footer">
          <span>
            Total level <strong>{actualTotal.toLocaleString()}</strong>
            {virtualTotal > actualTotal && <span className="virtual-total"> ({virtualTotal.toLocaleString()})</span>}
          </span>

          <button className="primary-button" type="button" onClick={onClose}>
            Done
          </button>
        </footer>
      </section>
    </div>
  );
}
