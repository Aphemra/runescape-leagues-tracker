import type { GameId, LeagueDataset, PublicationStatus } from "../../domain/leagues/types";
import { validateLeagueDataset } from "../../domain/leagues/validate";

export type LeagueCatalogEntry = {
  id: string;
  game: GameId;
  gameLabel: string;
  name: string;
  edition: string;
  status: PublicationStatus;
};

export const leagueCatalog: LeagueCatalogEntry[] = [
  {
    id: "rs3-equilibrium-2026",
    game: "rs3",
    gameLabel: "RuneScape",
    name: "Equilibrium",
    edition: "League II",
    status: "partial",
  },
  {
    id: "osrs-demonic-pacts-2026",
    game: "osrs",
    gameLabel: "Old School RuneScape",
    name: "Demonic Pacts",
    edition: "League VI",
    status: "complete",
  },
];

const loaders: Record<string, () => Promise<LeagueDataset>> = {
  "rs3-equilibrium-2026": () =>
    import("./rs3-equilibrium-2026.json").then((module) => module.default as unknown as LeagueDataset),
  "osrs-demonic-pacts-2026": () =>
    import("./osrs-demonic-pacts-2026.json").then((module) => module.default as unknown as LeagueDataset),
};

export const DEFAULT_LEAGUE_ID = "rs3-equilibrium-2026";

export function isKnownLeagueId(leagueId: string): boolean {
  return leagueId in loaders;
}

export async function loadLeagueDataset(leagueId: string): Promise<LeagueDataset> {
  const loader = loaders[leagueId];
  if (!loader) throw new Error(`Unknown league '${leagueId}'.`);

  const dataset = await loader();
  const errors = validateLeagueDataset(dataset).filter((issue) => issue.level === "error");
  if (errors.length > 0) {
    throw new Error(`The ${dataset.manifest.name} dataset is invalid:\n${errors.map((issue) => issue.message).join("\n")}`);
  }

  return dataset;
}
