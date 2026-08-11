import { buildProgressionSegments, getProgressionStatus } from "../domain/leagues/progression";
import type { ProgressionTrackDefinition } from "../domain/leagues/types";

type MilestoneProgressProps = {
  track: ProgressionTrackDefinition;
  points: number;
};

const pointFormatter = new Intl.NumberFormat("en-US");

export function MilestoneProgress({ track, points }: MilestoneProgressProps) {
  const normalizedPoints = Math.max(0, points);
  const segments = buildProgressionSegments(track, normalizedPoints);
  const status = getProgressionStatus(track, normalizedPoints);

  const finalThreshold = segments.length > 0 ? segments[segments.length - 1].end : 0;

  const currentLabel = status.currentMilestone?.label ?? "Not yet unlocked";

  const nextLabel = status.nextMilestone
    ? `${pointFormatter.format(status.pointsToNext)} points to ${status.nextMilestone.label}`
    : "All milestones reached";

  return (
    <section className="milestone-progress" data-track={track.id} aria-label={`${track.label} progress`}>
      <div className="milestone-progress__labels">
        <strong>{track.label}</strong>
        <span>{currentLabel}</span>
      </div>

      <div
        className="milestone-progress__segments"
        role="progressbar"
        aria-label={`${track.label}: ${pointFormatter.format(normalizedPoints)} league points`}
        aria-valuemin={0}
        aria-valuemax={finalThreshold}
        aria-valuenow={Math.min(normalizedPoints, finalThreshold)}
      >
        {segments.map((segment) => (
          <span
            key={segment.milestone.id}
            className="milestone-progress__segment"
            style={{
              flexBasis: 0,
              flexGrow: segment.weight,
            }}
            title={`${segment.milestone.label}: ${pointFormatter.format(segment.milestone.threshold)} points`}
          >
            <span className="milestone-progress__fill" style={{ width: `${segment.progressPercent}%` }} />
          </span>
        ))}
      </div>

      <div className="milestone-progress__meta">
        <span>{pointFormatter.format(normalizedPoints)} points</span>
        <span>{nextLabel}</span>
      </div>
    </section>
  );
}
