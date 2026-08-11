import type { ProgressionMilestoneDefinition, ProgressionTrackDefinition } from "./types";

export type ProgressionStatus = {
  currentMilestone: ProgressionMilestoneDefinition | null;
  nextMilestone: ProgressionMilestoneDefinition | null;
  pointsToNext: number;
  intervalProgress: number;
};

export type ProgressionSegment = {
  milestone: ProgressionMilestoneDefinition;
  start: number;
  end: number;
  weight: number;
  progressPercent: number;
};

function normalizePoints(points: number) {
  if (!Number.isFinite(points)) {
    return 0;
  }

  return Math.max(0, points);
}

function sortMilestones(track: ProgressionTrackDefinition) {
  return [...track.milestones].sort((left, right) => left.threshold - right.threshold);
}

export function getProgressionStatus(track: ProgressionTrackDefinition, points: number): ProgressionStatus {
  const normalizedPoints = normalizePoints(points);
  const milestones = sortMilestones(track);

  const currentMilestone =
    [...milestones].reverse().find((milestone) => milestone.threshold <= normalizedPoints) ?? null;

  const nextMilestone = milestones.find((milestone) => milestone.threshold > normalizedPoints) ?? null;

  if (!nextMilestone) {
    return {
      currentMilestone,
      nextMilestone: null,
      pointsToNext: 0,
      intervalProgress: 100,
    };
  }

  const intervalStart = currentMilestone?.threshold ?? 0;
  const intervalLength = nextMilestone.threshold - intervalStart;

  const intervalProgress = intervalLength > 0 ? ((normalizedPoints - intervalStart) / intervalLength) * 100 : 0;

  return {
    currentMilestone,
    nextMilestone,
    pointsToNext: nextMilestone.threshold - normalizedPoints,
    intervalProgress: Math.min(100, Math.max(0, intervalProgress)),
  };
}

export function buildProgressionSegments(track: ProgressionTrackDefinition, points: number): ProgressionSegment[] {
  const normalizedPoints = normalizePoints(points);
  const milestones = sortMilestones(track);

  const segments: ProgressionSegment[] = [];
  let segmentStart = 0;

  for (const milestone of milestones) {
    const segmentEnd = Math.max(0, milestone.threshold);

    // A zero-point starting milestone does not need a visible segment.
    if (segmentEnd <= segmentStart) {
      segmentStart = segmentEnd;
      continue;
    }

    const segmentLength = segmentEnd - segmentStart;
    const earnedWithinSegment = normalizedPoints - segmentStart;

    segments.push({
      milestone,
      start: segmentStart,
      end: segmentEnd,
      weight: segmentLength,
      progressPercent: Math.min(100, Math.max(0, (earnedWithinSegment / segmentLength) * 100)),
    });

    segmentStart = segmentEnd;
  }

  return segments;
}
