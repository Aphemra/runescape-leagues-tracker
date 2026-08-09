import type { LeagueManifest } from "../domain/leagues/types";
import type { LeagueFilterState } from "../domain/storage/types";
import { countActiveFilters } from "../domain/leagues/filterState";

type FiltersPanelProps = {
  manifest: LeagueManifest;
  filters: LeagueFilterState;
  shownCount: number;
  totalCount: number;
  onChange: (filters: LeagueFilterState) => void;
  onClose: () => void;
};

function toggleValue(values: string[], value: string): string[] {
  return values.includes(value) ? values.filter((entry) => entry !== value) : [...values, value];
}

export default function FiltersPanel({ manifest, filters, shownCount, totalCount, onChange, onClose }: FiltersPanelProps) {
  const activeCount = countActiveFilters(filters);
  const patch = (next: Partial<LeagueFilterState>) => onChange({ ...filters, ...next });

  function resetFilters() {
    onChange({
      ...filters,
      tierIds: [],
      facets: {},
      completion: "all",
      requirements: "all",
      favoritesOnly: false,
    });
  }

  return (
    <div className="filters-panel">
      <div className="filters-panel__header">
        <div>
          <p className="eyebrow">Refine tasks</p>
          <h2>Filters</h2>
        </div>
        <button className="icon-button filters-panel__close" type="button" aria-label="Close filters" onClick={onClose}>×</button>
      </div>

      <p className="filters-panel__count"><strong>{shownCount.toLocaleString()}</strong> of {totalCount.toLocaleString()} tasks match</p>

      <fieldset className="filter-group">
        <legend>Completion</legend>
        <div className="segmented-control">
          {(["all", "incomplete", "complete"] as const).map((value) => (
            <button key={value} type="button" className={filters.completion === value ? "is-active" : ""} aria-pressed={filters.completion === value} onClick={() => patch({ completion: value })}>
              {value === "all" ? "All" : value === "incomplete" ? "To do" : "Done"}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset className="filter-group">
        <legend>Tier</legend>
        <div className="choice-grid">
          {manifest.tiers.map((tier) => (
            <label className="check-chip" key={tier.id}>
              <input type="checkbox" checked={filters.tierIds.includes(tier.id)} onChange={() => patch({ tierIds: toggleValue(filters.tierIds, tier.id) })} />
              <span>{tier.label}</span>
            </label>
          ))}
        </div>
      </fieldset>

      {manifest.facets.map((facet) => (
        <fieldset className="filter-group" key={facet.id}>
          <legend>{facet.label}</legend>
          <div className="choice-list">
            {facet.values.map((value) => {
              const selected = filters.facets[facet.id] ?? [];
              return (
                <label key={value.id}>
                  <input
                    type="checkbox"
                    checked={selected.includes(value.id)}
                    onChange={() => patch({ facets: { ...filters.facets, [facet.id]: toggleValue(selected, value.id) } })}
                  />
                  <span>{value.label}</span>
                </label>
              );
            })}
          </div>
        </fieldset>
      ))}

      <div className="filter-group">
        <label htmlFor="requirements-filter">Requirements</label>
        <select id="requirements-filter" value={filters.requirements} onChange={(event) => patch({ requirements: event.target.value as LeagueFilterState["requirements"] })}>
          <option value="all">Any readiness</option>
          <option value="met">Ready now</option>
          <option value="unmet">Levels needed</option>
          <option value="unknown">Needs a manual check</option>
        </select>
      </div>

      <label className="favorite-toggle">
        <input type="checkbox" checked={filters.favoritesOnly} onChange={(event) => patch({ favoritesOnly: event.target.checked })} />
        <span aria-hidden="true">★</span> Favorites only
      </label>

      <div className="filter-group filter-group--sort">
        <label htmlFor="sort-field">Sort</label>
        <div>
          <select id="sort-field" value={filters.sortField} onChange={(event) => patch({ sortField: event.target.value as LeagueFilterState["sortField"] })}>
            <option value="title">Task name</option>
            <option value="tier">Tier</option>
            <option value="points">Points</option>
          </select>
          <button className="sort-direction" type="button" onClick={() => patch({ sortDirection: filters.sortDirection === "asc" ? "desc" : "asc" })} aria-label={`Sort ${filters.sortDirection === "asc" ? "descending" : "ascending"}`}>
            {filters.sortDirection === "asc" ? "↑" : "↓"}
          </button>
        </div>
      </div>

      <button className="secondary-button filters-panel__reset" type="button" onClick={resetFilters} disabled={activeCount === 0}>Clear {activeCount || ""} filters</button>
    </div>
  );
}
