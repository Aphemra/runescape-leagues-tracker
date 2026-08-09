import { useEffect, useMemo } from "react";
import type { LeagueManifest } from "../domain/leagues/types";
import { assetPath } from "../domain/leagues/presentation";

type PlayerStatsModalProps = {
  manifest: LeagueManifest;
  stats: Record<string, number>;
  onChange: (statId: string, value: number) => void;
  onClose: () => void;
};

export default function PlayerStatsModal({ manifest, stats, onChange, onClose }: PlayerStatsModalProps) {
  const groups = useMemo(
    () => [...new Set(manifest.playerStats.map((stat) => stat.group))],
    [manifest.playerStats],
  );
  const total = manifest.playerStats.reduce((sum, stat) => sum + (stats[stat.id] ?? stat.defaultValue), 0);

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
          <button className="icon-button" type="button" aria-label="Close player levels" onClick={onClose}>×</button>
        </header>

        <div className="modal__body stats-groups">
          {groups.map((group) => (
            <section className="stats-group" key={group}>
              <h3>{group}</h3>
              <div className="stats-grid">
                {manifest.playerStats.filter((stat) => stat.group === group).map((stat) => (
                  <label className="stat-input" key={stat.id}>
                    {stat.icon ? <img src={assetPath(stat.icon)} alt="" /> : <span className="stat-input__fallback" aria-hidden="true">{stat.label.slice(0, 2)}</span>}
                    <span>{stat.label}</span>
                    <input
                      type="number"
                      inputMode="numeric"
                      min={stat.minimum}
                      max={stat.maximum}
                      value={stats[stat.id] ?? stat.defaultValue}
                      aria-label={`${stat.label} level`}
                      onChange={(event) => {
                        const next = Number(event.target.value);
                        onChange(stat.id, Number.isFinite(next) ? Math.min(stat.maximum, Math.max(stat.minimum, Math.floor(next))) : stat.minimum);
                      }}
                    />
                  </label>
                ))}
              </div>
            </section>
          ))}
        </div>

        <footer className="modal__footer">
          <span>Total level <strong>{total.toLocaleString()}</strong></span>
          <button className="primary-button" type="button" onClick={onClose}>Done</button>
        </footer>
      </section>
    </div>
  );
}
