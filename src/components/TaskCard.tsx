import type { SkillName, Task, TaskTier } from "../types/task";

type TaskCardProps = {
  task: Task;
  taskId: string;
  isCompleted: boolean;
  isCompletable: boolean;
  onToggleComplete: (taskId: string) => void;
};

function getRegionIconPath(region: string): string {
  return `/icons/regions/${region.toLowerCase()}.png`;
}

function getSkillIconPath(skill: string): string {
  return `/icons/skills/${skill.toLowerCase()}.png`;
}

function formatTier(tier: string): string {
  return tier.toUpperCase();
}

function getTierBadgeClass(tier: TaskTier): string {
  switch (tier) {
    case "easy":
      return "task-badge--easy";
    case "medium":
      return "task-badge--medium";
    case "hard":
      return "task-badge--hard";
    case "elite":
      return "task-badge--elite";
    case "master":
      return "task-badge--master";
    default:
      return "";
  }
}

export default function TaskCard({ task, taskId, isCompleted, isCompletable, onToggleComplete }: TaskCardProps) {
  const skillEntries = Object.entries(task.requirements.skills) as [SkillName, number][];
  const hasSkills = skillEntries.length > 0;
  const hasQuests = task.requirements.quests.length > 0;

  const classNames = [
    "task-row",
    isCompleted ? "task-row--completed" : "",
    task.pact ? "task-row--pact" : "",
    isCompletable ? "task-row--completable" : "task-row--not-completable",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <article className={classNames}>
      <div className="task-row__checkbox">
        <input aria-label={`Mark ${task.name} complete`} type="checkbox" checked={isCompleted} onChange={() => onToggleComplete(taskId)} />
      </div>

      <div className="task-row__main">
        <div className="task-row__top">
          <div className="task-row__title-wrap">
            <img className="task-row__region-icon" src={getRegionIconPath(task.region)} alt={task.region} title={task.region} />

            <h2 className="task-row__title">{task.name}</h2>
          </div>

          <div className="task-row__badges">
            <span className={`task-badge task-badge--tier-points ${getTierBadgeClass(task.tier)}`}>
              {formatTier(task.tier)} - {task.points}
            </span>
          </div>
        </div>

        <p className="task-row__description">{task.description}</p>

        {(hasSkills || hasQuests) && (
          <div className="task-row__requirements">
            {hasSkills && (
              <div className="task-row__requirement-line">
                <div className="task-row__skill-reqs">
                  {skillEntries.map(([skill, level]) => (
                    <div key={skill} className="task-row__skill-pill" title={`${skill} ${level}`}>
                      <img className="task-row__skill-icon" src={getSkillIconPath(skill)} alt={skill} />
                      <span>{level}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {hasQuests && (
              <div className="task-row__requirement-line">
                <p className="task-row__quest-text">Quests: {task.requirements.quests.join(", ")}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </article>
  );
}
