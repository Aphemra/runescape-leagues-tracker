import { expect, test } from "vitest";
import demonicPactsJson from "../src/data/leagues/osrs-demonic-pacts-2026.json";
import equilibriumJson from "../src/data/leagues/rs3-equilibrium-2026.json";
import type { LeagueDataset } from "../src/domain/leagues/types";
import { validateLeagueDataset } from "../src/domain/leagues/validate";

const demonicPacts = demonicPactsJson as unknown as LeagueDataset;
const equilibrium = equilibriumJson as unknown as LeagueDataset;

test("checked-in datasets pass schema validation", () => {
  for (const dataset of [demonicPacts, equilibrium]) {
    const errors = validateLeagueDataset(dataset).filter((issue) => issue.level === "error");
    expect(errors).toEqual([]);
  }
});

test("Demonic Pacts contains the complete Wiki dataset and every v1 migration alias", () => {
  expect(demonicPacts.tasks).toHaveLength(1592);
  expect(new Set(demonicPacts.tasks.map((task) => task.id)).size).toBe(1592);
  expect(demonicPacts.tasks.filter((task) => task.source.legacyIds?.length)).toHaveLength(1065);
  expect(demonicPacts.tasks.filter((task) => task.extensions?.pactTask === true)).toHaveLength(79);
});

test("Equilibrium contains all currently published Easy and Medium tasks", () => {
  expect(equilibrium.tasks).toHaveLength(533);
  expect(
    Object.fromEntries(
      equilibrium.manifest.tiers.map((tier) => [
        tier.id,
        equilibrium.tasks.filter((task) => task.tierId === tier.id).length,
      ]),
    ),
  ).toEqual({ easy: 244, medium: 289 });
});
