import { useState } from "react";
import type { LeagueManifest } from "../domain/leagues/types";
import type { LeagueFilterState } from "../domain/storage/types";
import { countActiveFilters } from "../domain/leagues/filterState";
import { assetPath } from "../domain/leagues/presentation";

type FiltersPanelProps = {
  manifest: LeagueManifest;
  filters: LeagueFilterState;
  shownCount: number;
  totalCount: number;
  hiddenCount: number;
  onChange: (filters: LeagueFilterState) => void;
  onClose: () => void;
};

function toggleValue(values: string[], value: string): string[] {
  return values.includes(value) ? values.filter((entry) => entry !== value) : [...values, value];
}

export default function FiltersPanel({
  manifest,
  filters,
  shownCount,
  totalCount,
  hiddenCount,
  onChange,
  onClose,
}: FiltersPanelProps) {
  const [isOpen, setIsOpen] = useState(true);
  const activeCount = countActiveFilters(filters);
  const patch = (next: Partial<LeagueFilterState>) => onChange({ ...filters, ...next });

  function resetFilters() {
    onChange({
      ...filters,
      tierIds: [],
      skillIds: [],
      facets: {},
      completion: "all",
      requirements: "all",
      favoritesOnly: false,
      hiddenOnly: false,
    });
  }

  return (
    <section className="filters-panel">
      <header className="filters-panel__header">
        <button
          className="filters-panel__toggle"
          type="button"
          aria-expanded={isOpen}
          aria-controls="filters-panel-content"
          onClick={() => setIsOpen((current) => !current)}
        >
          <span className="filters-panel__heading">
            <span className="eyebrow">Refine tasks</span>

            <span className="filters-panel__title-row">
              <span className="filters-panel__title">Filters</span>

              {activeCount > 0 && <span className="filters-panel__badge">{activeCount}</span>}
            </span>
          </span>

          <span className="filters-panel__chevron" aria-hidden="true">
            ▾
          </span>
        </button>

        <button className="icon-button filters-panel__close" type="button" aria-label="Close filters" onClick={onClose}>
          ×
        </button>
      </header>

      <div
        id="filters-panel-content"
        className={`accordion-region${isOpen ? " accordion-region--open" : ""}`}
        aria-hidden={!isOpen}
        inert={isOpen ? undefined : true}
      >
        <div>
          <div className="filters-panel__body">
            <p className="filters-panel__count">
              <strong>{shownCount.toLocaleString()}</strong> of {totalCount.toLocaleString()} tasks match
            </p>

            <fieldset className="filter-group">
              <legend>Completion</legend>

              <div className="segmented-control">
                {(["all", "incomplete", "complete"] as const).map((value) => (
                  <button
                    key={value}
                    type="button"
                    className={filters.completion === value ? "is-active" : ""}
                    aria-pressed={filters.completion === value}
                    onClick={() => patch({ completion: value })}
                  >
                    {value === "all" ? "All" : value === "incomplete" ? "To do" : "Done"}
                  </button>
                ))}
              </div>
            </fieldset>

            <fieldset className="filter-group">
              <legend>Tier</legend>

              <div className="choice-grid">
                {manifest.tiers.map((tier) => (
                  <label className={`check-chip check-chip--tier check-chip--${tier.id}`} key={tier.id}>
                    <input
                      type="checkbox"
                      checked={filters.tierIds.includes(tier.id)}
                      onChange={() =>
                        patch({
                          tierIds: toggleValue(filters.tierIds, tier.id),
                        })
                      }
                    />

                    <span>{tier.label}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            <div className="filter-group">
              <label htmlFor="skill-filter">Skill</label>

              <select
                id="skill-filter"
                value={filters.skillIds[0] ?? ""}
                onChange={(event) =>
                  patch({
                    skillIds: event.target.value ? [event.target.value] : [],
                  })
                }
              >
                <option value="">Any skill</option>

                {[...manifest.playerStats]
                  .sort((left, right) =>
                    left.label.localeCompare(right.label, undefined, {
                      sensitivity: "base",
                    }),
                  )
                  .map((stat) => (
                    <option value={stat.id} key={stat.id}>
                      {stat.label}
                    </option>
                  ))}
              </select>
            </div>

            {manifest.facets.map((facet) => (
              <fieldset className="filter-group" key={facet.id}>
                <legend>{facet.label}</legend>

                <div className="choice-grid choice-grid--facets">
                  {facet.values.map((value) => {
                    const selected = filters.facets[facet.id] ?? [];

                    return (
                      <label className="check-chip check-chip--facet" key={value.id}>
                        <input
                          type="checkbox"
                          checked={selected.includes(value.id)}
                          onChange={() =>
                            patch({
                              facets: {
                                ...filters.facets,
                                [facet.id]: toggleValue(selected, value.id),
                              },
                            })
                          }
                        />

                        <span>
                          {value.icon && <img src={assetPath(value.icon)} alt="" />}

                          <span className="check-chip__label">{value.label}</span>
                        </span>
                      </label>
                    );
                  })}
                </div>
              </fieldset>
            ))}

            <div className="filter-group">
              <label htmlFor="requirements-filter">Requirements</label>

              <select
                id="requirements-filter"
                value={filters.requirements}
                onChange={(event) =>
                  patch({
                    requirements: event.target.value as LeagueFilterState["requirements"],
                  })
                }
              >
                <option value="all">Any readiness</option>
                <option value="met">Ready now</option>
                <option value="unmet">Levels needed</option>
                <option value="unknown">Needs a manual check</option>
              </select>
            </div>

            <div className="filter-group filter-group--favorite">
              <button
                className="favorite-toggle"
                type="button"
                aria-pressed={filters.favoritesOnly}
                onClick={() =>
                  patch({
                    favoritesOnly: !filters.favoritesOnly,
                  })
                }
              >
                <span className="favorite-toggle__star" aria-hidden="true">
                  ★
                </span>

                <span>Favorites only</span>
              </button>

              <button
                className="hidden-toggle"
                type="button"
                aria-pressed={filters.hiddenOnly}
                disabled={hiddenCount === 0 && !filters.hiddenOnly}
                onClick={() =>
                  patch({
                    hiddenOnly: !filters.hiddenOnly,
                  })
                }
              >
                <span className="hidden-toggle__icon" aria-hidden="true">
                  ⊘
                </span>

                <span>{filters.hiddenOnly ? "Viewing hidden tasks" : "Hidden tasks"}</span>

                <span className="hidden-toggle__count">{hiddenCount.toLocaleString()}</span>
              </button>
            </div>

            <div className="filter-group filter-group--sort">
              <label htmlFor="sort-field">Sort</label>

              <div>
                <select
                  id="sort-field"
                  value={filters.sortField}
                  onChange={(event) =>
                    patch({
                      sortField: event.target.value as LeagueFilterState["sortField"],
                    })
                  }
                >
                  <option value="title">Task name</option>
                  <option value="tier">Tier</option>
                  <option value="points">Points</option>
                </select>

                <button
                  className="sort-direction"
                  type="button"
                  onClick={() =>
                    patch({
                      sortDirection: filters.sortDirection === "asc" ? "desc" : "asc",
                    })
                  }
                  aria-label={`Sort ${filters.sortDirection === "asc" ? "descending" : "ascending"}`}
                >
                  {filters.sortDirection === "asc" ? "↑" : "↓"}
                </button>
              </div>
            </div>

            <button
              className="secondary-button filters-panel__reset"
              type="button"
              onClick={resetFilters}
              disabled={activeCount === 0}
            >
              Clear {activeCount || ""} filters
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
