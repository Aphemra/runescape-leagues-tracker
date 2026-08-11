import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type {
  FacetValueDefinition,
  GameId,
  JsonValue,
  LeagueDataset,
  LeagueManifest,
  LeagueTask,
  PlayerStatDefinition,
  RequirementNode,
  RequirementSet,
} from "../src/domain/leagues/types";
import { osrsPlayerStats, rs3PlayerStats } from "../src/data/games/stats";
import { validateLeagueDataset } from "../src/domain/leagues/validate";

type BucketValue = string | number | boolean | string[] | null | undefined;
type BucketRow = Record<string, BucketValue>;

type ImportDefinition = {
  leagueId: string;
  game: GameId;
  name: string;
  shortName: string;
  edition: string;
  status: LeagueManifest["status"];
  apiUrl: string;
  wikiBaseUrl: string;
  sourcePage: string;
  bucket: string;
  fields: string[];
  playerStats: PlayerStatDefinition[];
  mechanics: LeagueManifest["mechanics"];
};

const SCRIPT_DIRECTORY = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(SCRIPT_DIRECTORY, "..");
const OUTPUT_DIRECTORY = path.join(PROJECT_ROOT, "src", "data", "leagues");

const TIER_REWARDS: Record<string, number> = {
  easy: 10,
  medium: 30,
  hard: 80,
  elite: 200,
  master: 400,
};

const LOCATION_ICON_PATHS: Record<GameId, Record<string, string>> = {
  osrs: {
    general: "icons/regions/osrs/global.png",
    global: "icons/regions/osrs/global.png",
    asgarnia: "icons/regions/osrs/asgarnia.png",
    desert: "icons/regions/osrs/desert.png",
    fremennik: "icons/regions/osrs/fremennik.png",
    kandarin: "icons/regions/osrs/kandarin.png",
    karamja: "icons/regions/osrs/karamja.png",
    kourend: "icons/regions/osrs/kourend.png",
    misthalin: "icons/regions/osrs/misthalin.png",
    morytania: "icons/regions/osrs/morytania.png",
    tirannwn: "icons/regions/osrs/tirannwn.png",
    varlamore: "icons/regions/osrs/varlamore.png",
    wilderness: "icons/regions/osrs/wilderness.png",
  },

  rs3: {
    global: "icons/regions/rs3/global.png",
    anachronia: "icons/regions/rs3/anachronia.png",
    asgarnia: "icons/regions/rs3/asgarnia.png",
    desert: "icons/regions/rs3/desert.png",
    fremennik: "icons/regions/rs3/fremennik.png",
    havenhythe: "icons/regions/rs3/havenhythe.png",
    kandarin: "icons/regions/rs3/kandarin.png",
    karamja: "icons/regions/rs3/karamja.png",
    misthalin: "icons/regions/rs3/misthalin.png",
    morytania: "icons/regions/rs3/morytania.png",
    tirannwn: "icons/regions/rs3/tirannwn.png",
    wilderness: "icons/regions/rs3/wilderness.png",
  },
};

const IMPORTS: ImportDefinition[] = [
  {
    leagueId: "osrs-demonic-pacts-2026",
    game: "osrs",
    name: "Demonic Pacts League",
    shortName: "Demonic Pacts",
    edition: "League VI",
    status: "complete",
    apiUrl: "https://oldschool.runescape.wiki/api.php",
    wikiBaseUrl: "https://oldschool.runescape.wiki/w/",
    sourcePage: "Demonic_Pacts_League/Tasks",
    bucket: "demonicpactleaguetask",
    fields: ["name", "description", "skill", "other", "tier", "region", "pact_task", "id", "completion"],
    playerStats: osrsPlayerStats,
    mechanics: [
      {
        id: "region-locking",
        kind: "facet-unlocks",
        label: "Region locking",
        config: { facetId: "location" },
      },
      {
        id: "demonic-pacts",
        kind: "task-tag",
        label: "Demonic Pact tasks",
        config: { extensionKey: "pactTask" },
      },
    ],
  },
  {
    leagueId: "rs3-equilibrium-2026",
    game: "rs3",
    name: "Equilibrium League",
    shortName: "Equilibrium",
    edition: "RuneScape League II",
    status: "complete",
    apiUrl: "https://runescape.wiki/api.php",
    wikiBaseUrl: "https://runescape.wiki/w/",
    sourcePage: "Equilibrium_League/Tasks",
    bucket: "equilibrium_league_task",
    fields: ["name", "description", "skill", "other", "uses_skill", "tier", "region", "id", "clue"],
    playerStats: rs3PlayerStats,
    mechanics: [
      {
        id: "region-locking",
        kind: "facet-unlocks",
        label: "Region locking",
        config: { facetId: "location" },
      },
      {
        id: "clue-tasks",
        kind: "task-metadata",
        label: "Clue tasks",
        config: { extensionKey: "clue" },
      },
    ],
  },
];

function asString(value: BucketValue): string {
  if (value === null || value === undefined) return "";
  if (Array.isArray(value)) return value.join(",");
  return String(value);
}

function slug(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function titleCase(value: string): string {
  return value.replace(/[-_]+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function decodeEntities(value: string): string {
  const entities: Record<string, string> = {
    "&amp;": "&",
    "&apos;": "'",
    "&#039;": "'",
    "&quot;": '"',
    "&lt;": "<",
    "&gt;": ">",
    "&nbsp;": " ",
  };

  return value
    .replace(/&(amp|apos|#039|quot|lt|gt|nbsp);/g, (entity) => entities[entity] ?? entity)
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)));
}

function wikiToPlain(value: string): string {
  return decodeEntities(value)
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]+>/g, "")
    .replace(/\[\[File:[^\]]+\]\]/gi, "")
    .replace(/\[\[[^\]|]+\|([^\]]+)\]\]/g, "$1")
    .replace(/\[\[([^\]]+)\]\]/g, "$1")
    .replace(/\{\{[^{}]*\}\}/g, "")
    .replace(/\[sic\]/gi, "")
    .replace(/''+/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeStatId(game: GameId, value: string): string {
  const normalized = slug(value);
  if (game === "osrs" && normalized === "runecrafting") return "runecraft";
  if (game === "rs3" && normalized === "hitpoints") return "constitution";
  return normalized;
}

function parseRequirements(row: BucketRow, definition: ImportDefinition): RequirementSet {
  const rawSkills = asString(row.skill).trim();
  const rawOther = asString(row.other).trim();
  const statNodes: RequirementNode[] = [];
  const knownStats = new Set(definition.playerStats.map((entry) => entry.id));
  const spanPattern = /<span\b[^>]*data-skill="([^"]+)"[^>]*data-level="(\d+)"[^>]*>[\s\S]*?<\/span>/gi;

  for (const match of rawSkills.matchAll(spanPattern)) {
    const statId = normalizeStatId(definition.game, match[1]);
    const minimum = Number(match[2]);
    if (!knownStats.has(statId) || !Number.isFinite(minimum)) continue;
    statNodes.push({ kind: "stat", statId, minimum, label: match[1] });
  }

  const unparsedSkillText = wikiToPlain(rawSkills.replace(spanPattern, ""));
  const unparsedOtherText = wikiToPlain(rawOther);
  const hasUnparsed = Boolean(unparsedSkillText || unparsedOtherText);
  let root: RequirementNode | undefined;

  if (statNodes.length === 1) root = statNodes[0];
  if (statNodes.length > 1) {
    const isAlternative = /\b(either|or)\b/i.test(wikiToPlain(rawSkills));
    root = { kind: isAlternative ? "any" : "all", children: statNodes };
  }

  return {
    ...(root ? { root } : {}),
    ...(rawSkills || rawOther
      ? { raw: { ...(rawSkills ? { skills: rawSkills } : {}), ...(rawOther ? { other: rawOther } : {}) } }
      : {}),
    parseStatus: hasUnparsed ? (root ? "partial" : "raw-only") : "complete",
  };
}

async function fetchJson<T>(url: URL): Promise<T> {
  const response = await fetch(url, {
    headers: {
      "Api-User-Agent": "runescape-leagues-tracker/2.0 (personal open-source task tracker)",
    },
  });

  if (!response.ok) throw new Error(`${response.status} ${response.statusText} from ${url.origin}`);
  return (await response.json()) as T;
}

async function fetchBucketRows(definition: ImportDefinition): Promise<BucketRow[]> {
  const query = `bucket('${definition.bucket}').select(${definition.fields.map((field) => `'${field}'`).join(",")}).limit(5000).run()`;
  const url = new URL(definition.apiUrl);
  url.search = new URLSearchParams({ action: "bucket", format: "json", formatversion: "2", query }).toString();
  const payload = await fetchJson<{ bucket?: BucketRow[]; error?: { info?: string } }>(url);
  if (!payload.bucket) throw new Error(payload.error?.info ?? `Wiki returned no rows for ${definition.bucket}.`);
  return payload.bucket;
}

async function fetchRevision(definition: ImportDefinition): Promise<number | undefined> {
  const url = new URL(definition.apiUrl);
  url.search = new URLSearchParams({
    action: "query",
    format: "json",
    formatversion: "2",
    prop: "revisions",
    titles: definition.sourcePage.replaceAll("_", " "),
    rvprop: "ids",
    rvlimit: "1",
  }).toString();
  const payload = await fetchJson<{ query?: { pages?: Array<{ revisions?: Array<{ revid?: number }> }> } }>(url);
  return payload.query?.pages?.[0]?.revisions?.[0]?.revid;
}

type LegacyTask = { region?: string; name?: string };

async function loadLegacyIds(): Promise<Map<string, string[]>> {
  const file = path.join(PROJECT_ROOT, "src", "data", "tasks.json");
  const legacyTasks = JSON.parse(await readFile(file, "utf8")) as LegacyTask[];
  const result = new Map<string, string[]>();

  legacyTasks.forEach((task, index) => {
    if (!task.name) return;
    const location = slug(task.region === "global" ? "general" : (task.region ?? "general"));
    const key = `${location}:${slug(task.name)}`;
    result.set(key, [...(result.get(key) ?? []), `${task.region ?? "global"}-${task.name}-${index}`]);
  });

  return result;
}

function buildFacetValues(rows: BucketRow[], game: GameId): FacetValueDefinition[] {
  const labels = new Map<string, string>();
  for (const row of rows) {
    const sourceValue = asString(row.region).trim() || "general";
    const id = slug(sourceValue) || "general";
    labels.set(id, titleCase(sourceValue));
  }

  return [...labels.entries()]
    .map(([id, label]) => {
      const icon = LOCATION_ICON_PATHS[game][id];

      return {
        id,
        label,
        ...(icon ? { icon } : {}),
      };
    })
    .sort((left, right) => {
      if (left.id === "general" || left.id === "global") return -1;
      if (right.id === "general" || right.id === "global") return 1;
      return left.label.localeCompare(right.label);
    });
}

function buildTask(
  row: BucketRow,
  definition: ImportDefinition,
  revision: number | undefined,
  legacyIds: Map<string, string[]>,
): LeagueTask {
  const externalId = asString(row.id).trim();
  if (!externalId) throw new Error(`A ${definition.leagueId} task has no Wiki ID: ${asString(row.name)}`);
  const tierId = slug(asString(row.tier));
  const locationId = slug(asString(row.region)) || "general";
  const title = wikiToPlain(asString(row.name));
  const descriptionWiki = asString(row.description).trim();
  const sourceLegacyIds = legacyIds.get(`${locationId}:${slug(title)}`);
  const extensions: Record<string, JsonValue> = {};

  if (definition.game === "osrs") {
    extensions.pactTask = [true, 1, "1", "yes"].includes(row.pact_task as never);
    const completion = asString(row.completion).trim();
    if (completion) extensions.wikiCompletion = completion;
  } else {
    const clue = asString(row.clue).trim();
    if (clue) extensions.clue = clue;
    const rawUsesSkills = Array.isArray(row.uses_skill) ? row.uses_skill : [asString(row.uses_skill)];

    const usesSkills = rawUsesSkills
      .flatMap((entry) => entry.split(","))
      .map((entry) => normalizeStatId("rs3", entry))
      .filter(Boolean);

    if (usesSkills.length > 0) {
      extensions.usesSkills = [...new Set(usesSkills)];
    }
  }

  return {
    id: `${definition.leagueId}:wiki:${externalId}`,
    leagueId: definition.leagueId,
    title,
    description: {
      plain: wikiToPlain(descriptionWiki),
      ...(descriptionWiki ? { wiki: descriptionWiki } : {}),
    },
    tierId,
    rewards: [{ currencyId: "league-points", amount: TIER_REWARDS[tierId] ?? 0 }],
    facets: { location: [locationId] },
    requirements: parseRequirements(row, definition),
    ...(Object.keys(extensions).length > 0 ? { extensions } : {}),
    source: {
      provider: definition.game === "osrs" ? "osrs-wiki" : "rs3-wiki",
      page: definition.sourcePage,
      ...(revision ? { revision } : {}),
      externalId,
      ...(sourceLegacyIds ? { legacyIds: sourceLegacyIds } : {}),
    },
  };
}

async function importLeague(definition: ImportDefinition): Promise<void> {
  const [rows, revision, legacyIds] = await Promise.all([
    fetchBucketRows(definition),
    fetchRevision(definition),
    definition.game === "osrs" ? loadLegacyIds() : Promise.resolve(new Map<string, string[]>()),
  ]);
  const tasks = rows
    .map((row) => buildTask(row, definition, revision, legacyIds))
    .sort((left, right) => left.id.localeCompare(right.id, undefined, { numeric: true }));
  const tierIds = [...new Set(tasks.map((task) => task.tierId))];
  const manifest: LeagueManifest = {
    schemaVersion: 2,
    id: definition.leagueId,
    game: definition.game,
    name: definition.name,
    shortName: definition.shortName,
    edition: definition.edition,
    status: definition.status,
    contentVersion: `wiki-${revision ?? "unknown"}`,
    source: {
      provider: definition.game === "osrs" ? "osrs-wiki" : "rs3-wiki",
      page: definition.sourcePage,
      url: new URL(definition.sourcePage, definition.wikiBaseUrl).toString(),
      license: "CC BY-SA 3.0",
      ...(revision ? { revision } : {}),
      importedAt: new Date().toISOString(),
    },
    expectedTaskCount: tasks.length,
    rewardCurrencies: [{ id: "league-points", label: "League points", shortLabel: "pts" }],
    tiers: tierIds
      .sort((left, right) => Object.keys(TIER_REWARDS).indexOf(left) - Object.keys(TIER_REWARDS).indexOf(right))
      .map((id, index) => ({
        id,
        label: titleCase(id),
        order: index,
        color: `var(--tier-${id})`,
        rewards: [{ currencyId: "league-points", amount: TIER_REWARDS[id] ?? 0 }],
      })),
    facets: [
      {
        id: "location",
        label: "Location",
        values: buildFacetValues(rows, definition.game),
      },
    ],
    playerStats: definition.playerStats,
    mechanics: definition.mechanics,
  };
  const dataset: LeagueDataset = { manifest, tasks };
  const validation = validateLeagueDataset(dataset);
  const errors = validation.filter((issue) => issue.level === "error");
  const warnings = validation.filter((issue) => issue.level === "warning");
  if (errors.length > 0) throw new Error(errors.map((issue) => issue.message).join("\n"));

  await mkdir(OUTPUT_DIRECTORY, { recursive: true });
  const output = path.join(OUTPUT_DIRECTORY, `${definition.leagueId}.json`);
  await writeFile(output, `${JSON.stringify(dataset, null, 2)}\n`, "utf8");
  console.log(
    `${definition.leagueId}: wrote ${tasks.length} tasks (${warnings.length} warnings), revision ${revision ?? "unknown"}.`,
  );
}

const requestedId = process.argv[2] ?? "all";
const selected = requestedId === "all" ? IMPORTS : IMPORTS.filter((entry) => entry.leagueId === requestedId);
if (selected.length === 0) {
  throw new Error(
    `Unknown import '${requestedId}'. Choose all or: ${IMPORTS.map((entry) => entry.leagueId).join(", ")}`,
  );
}

for (const definition of selected) await importLeague(definition);
