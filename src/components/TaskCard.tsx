import { useState, type MouseEvent } from "react";
import type { RequirementEvaluation } from "../domain/leagues/requirements";
import type { LeagueManifest, LeagueTask } from "../domain/leagues/types";
import { assetPath, collectStatRequirements, getFacetValueLabel, plainWikiText } from "../domain/leagues/presentation";

type TaskCardProps = {
  task: LeagueTask;
  manifest: LeagueManifest;
  isCompleted: boolean;
  isFavorite: boolean;
  requirementStatus: RequirementEvaluation;
  note: string;
  onToggleComplete: (taskId: string) => void;
  onToggleFavorite: (taskId: string) => void;
  onNoteChange: (taskId: string, note: string) => void;
};

const REQUIREMENT_LABELS: Record<RequirementEvaluation, string> = {
  met: "Ready",
  unmet: "Levels needed",
  unknown: "Check details drop-down",
};

export default function TaskCard({
  task,
  manifest,
  isCompleted,
  isFavorite,
  requirementStatus,
  note,
  onToggleComplete,
  onToggleFavorite,
  onNoteChange,
}: TaskCardProps) {
  const [isExpanded, setIsExpanded] = useState(Boolean(note));
  const tier = manifest.tiers.find((entry) => entry.id === task.tierId);
  const statRequirements = collectStatRequirements(task.requirements.root);
  const points = task.rewards.reduce((total, reward) => total + reward.amount, 0);
  const locations = (task.facets.location ?? []).map((id) => getFacetValueLabel(manifest, "location", id));
  const isPactTask = task.extensions?.pactTask === true;
  const rawRequirement = plainWikiText(task.requirements.raw?.other || task.requirements.raw?.skills || "");

  function handleCardClick(event: MouseEvent<HTMLElement>) {
    const target = event.target as HTMLElement;

    if (target.closest("button, input, textarea, select, a, label, .task-card__details")) {
      return;
    }

    setIsExpanded((current) => !current);
  }

  return (
    <article className={`task-card${isCompleted ? " task-card--completed" : ""}`} onClick={handleCardClick}>
      <button
        className="task-card__check"
        type="button"
        aria-pressed={isCompleted}
        aria-label={`${isCompleted ? "Mark" : "Mark"} ${task.title} ${isCompleted ? "incomplete" : "complete"}`}
        onClick={() => onToggleComplete(task.id)}
      >
        <span aria-hidden="true">{isCompleted ? "✓" : ""}</span>
      </button>

      <div className="task-card__body">
        <div className="task-card__heading">
          <div className="task-card__title-group">
            <h2>{task.title}</h2>
            <div className="task-card__badges" aria-label="Task metadata">
              <span className={`badge badge--tier badge--${task.tierId}`}>{tier?.label ?? task.tierId}</span>
              <span className="badge badge--points">{points.toLocaleString()} pts</span>
              {locations.map((location) => (
                <span className="badge" key={location}>
                  {location}
                </span>
              ))}
              {isPactTask && <span className="badge badge--pact">Pact</span>}
            </div>
          </div>

          <button
            className={`icon-button task-card__favorite${isFavorite ? " is-active" : ""}`}
            type="button"
            aria-pressed={isFavorite}
            aria-label={`${isFavorite ? "Remove" : "Add"} ${task.title} ${isFavorite ? "from" : "to"} favorites`}
            onClick={() => onToggleFavorite(task.id)}
          >
            <span aria-hidden="true">★</span>
          </button>
        </div>

        {task.description.plain && <p className="task-card__description">{task.description.plain}</p>}

        <div className="task-card__footer">
          <div className={`requirement-status requirement-status--${requirementStatus}`}>
            <span className="requirement-status__dot" aria-hidden="true" />
            {REQUIREMENT_LABELS[requirementStatus]}
          </div>

          {statRequirements.length > 0 && (
            <div className="task-card__requirements" aria-label="Skill requirements">
              {statRequirements.map((requirement, index) => {
                const stat = manifest.playerStats.find((entry) => entry.id === requirement.statId);
                return (
                  <span
                    className="skill-requirement"
                    key={`${requirement.statId}-${index}`}
                    title={`${stat?.label ?? requirement.label ?? requirement.statId} ${requirement.minimum}`}
                  >
                    {stat?.icon && <img src={assetPath(stat.icon)} alt="" />}
                    <span>{stat?.label ?? requirement.label ?? requirement.statId}</span>
                    <strong>{requirement.minimum}</strong>
                  </span>
                );
              })}
            </div>
          )}

          <button
            className="task-card__details-button"
            type="button"
            aria-expanded={isExpanded}
            onClick={() => setIsExpanded((value) => !value)}
          >
            {isExpanded ? "Hide details" : note ? "Note added" : "Details & note"}
          </button>
        </div>

        <div
          className={`accordion-region${isExpanded ? " accordion-region--open" : ""}`}
          aria-hidden={!isExpanded}
          inert={isExpanded ? undefined : true}
        >
          <div>
            <div className="task-card__details">
              {task.requirements.parseStatus !== "complete" && (
                <p>
                  <strong>Wiki requirement:</strong>{" "}
                  {rawRequirement || "This requirement could not be evaluated automatically."}
                </p>
              )}

              <label>
                <span>Personal note</span>

                <textarea
                  value={note}
                  rows={2}
                  maxLength={500}
                  placeholder="Add a route reminder, item note, or strategy…"
                  onChange={(event) => onNoteChange(task.id, event.target.value)}
                />
              </label>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}
