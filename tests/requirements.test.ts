import { expect, test } from "vitest";
import { evaluateRequirements } from "../src/domain/leagues/requirements";

test("evaluates exact stat requirements", () => {
  const requirement = {
    parseStatus: "complete" as const,
    root: { kind: "stat" as const, statId: "fishing", minimum: 60 },
  };

  expect(evaluateRequirements(requirement, { stats: { fishing: 59 } })).toBe("unmet");
  expect(evaluateRequirements(requirement, { stats: { fishing: 60 } })).toBe("met");
});

test("keeps partially parsed requirements unknown after known levels are met", () => {
  const requirement = {
    parseStatus: "partial" as const,
    root: { kind: "stat" as const, statId: "magic", minimum: 27 },
    raw: { other: "Materials to make a ring of duelling" },
  };

  expect(evaluateRequirements(requirement, { stats: { magic: 26 } })).toBe("unmet");
  expect(evaluateRequirements(requirement, { stats: { magic: 27 } })).toBe("unknown");
});

test("supports alternative requirements", () => {
  const requirement = {
    parseStatus: "complete" as const,
    root: {
      kind: "any" as const,
      children: [
        { kind: "stat" as const, statId: "attack", minimum: 50 },
        { kind: "stat" as const, statId: "magic", minimum: 50 },
      ],
    },
  };

  expect(evaluateRequirements(requirement, { stats: { attack: 1, magic: 50 } })).toBe("met");
  expect(evaluateRequirements(requirement, { stats: { attack: 1, magic: 49 } })).toBe("unmet");
});
