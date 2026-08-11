import { describe, expect, test } from "vitest";
import { buildProgressionSegments, getProgressionStatus } from "../src/domain/leagues/progression";
import type { ProgressionTrackDefinition } from "../src/domain/leagues/types";

const track: ProgressionTrackDefinition = {
  id: "relic-tiers",
  label: "Relic tiers",
  currencyId: "league-points",
  milestones: [
    { id: "tier-1", label: "Tier 1", threshold: 0 },
    { id: "tier-2", label: "Tier 2", threshold: 600 },
    { id: "tier-3", label: "Tier 3", threshold: 1_200 },
    { id: "tier-4", label: "Tier 4", threshold: 2_600 },
  ],
};

describe("getProgressionStatus", () => {
  test("calculates progress between the current and next milestones", () => {
    expect(getProgressionStatus(track, 900)).toEqual({
      currentMilestone: track.milestones[1],
      nextMilestone: track.milestones[2],
      pointsToNext: 300,
      intervalProgress: 50,
    });
  });

  test("reports a completed track after its final milestone", () => {
    expect(getProgressionStatus(track, 3_000)).toEqual({
      currentMilestone: track.milestones[3],
      nextMilestone: null,
      pointsToNext: 0,
      intervalProgress: 100,
    });
  });
});

describe("buildProgressionSegments", () => {
  test("creates proportional segments and skips a zero-point milestone", () => {
    const segments = buildProgressionSegments(track, 900);

    expect(
      segments.map(({ start, end, progressPercent }) => ({
        start,
        end,
        progressPercent,
      })),
    ).toEqual([
      { start: 0, end: 600, progressPercent: 100 },
      { start: 600, end: 1_200, progressPercent: 50 },
      { start: 1_200, end: 2_600, progressPercent: 0 },
    ]);
  });
});
