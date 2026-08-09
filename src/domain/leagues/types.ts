export type JsonPrimitive = string | number | boolean | null;

export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };

export type GameId = "osrs" | "rs3";

export type PublicationStatus = "partial" | "complete" | "archived";

export type RequirementParseStatus = "complete" | "partial" | "raw-only";

export type RichText = {
  plain: string;
  wiki?: string;
};

export type Reward = {
  currencyId: string;
  amount: number;
};

export type RequirementNode =
  | {
      kind: "all";
      children: RequirementNode[];
    }
  | {
      kind: "any";
      children: RequirementNode[];
    }
  | {
      kind: "stat";
      statId: string;
      minimum: number;
      label?: string;
    }
  | {
      kind: "flag";
      flagId: string;
      label: string;
    }
  | {
      kind: "facet-unlocked";
      facetId: string;
      valueId: string;
      label?: string;
    }
  | {
      kind: "custom";
      namespace: string;
      label: string;
      data?: JsonValue;
    };

export type RequirementSet = {
  root?: RequirementNode;
  raw?: {
    skills?: string;
    other?: string;
  };
  parseStatus: RequirementParseStatus;
};

export type TaskSource = {
  provider: "osrs-wiki" | "rs3-wiki" | "legacy-json" | "manual";
  page: string;
  revision?: number;
  externalId?: string;
  legacyIds?: string[];
};

export type LeagueTask = {
  id: string;
  leagueId: string;
  title: string;
  description: RichText;
  tierId: string;
  rewards: Reward[];
  facets: Record<string, string[]>;
  requirements: RequirementSet;
  extensions?: Record<string, JsonValue>;
  source: TaskSource;
};

export type TierDefinition = {
  id: string;
  label: string;
  order: number;
  color: string;
  rewards: Reward[];
};

export type RewardCurrencyDefinition = {
  id: string;
  label: string;
  shortLabel: string;
};

export type FacetValueDefinition = {
  id: string;
  label: string;
  icon?: string;
  order?: number;
};

export type FacetDefinition = {
  id: string;
  label: string;
  values: FacetValueDefinition[];
};

export type PlayerStatDefinition = {
  id: string;
  label: string;
  group: string;
  minimum: number;
  maximum: number;
  defaultValue: number;
  icon?: string;
};

export type LeagueMechanicDefinition = {
  id: string;
  kind: string;
  label: string;
  config?: JsonValue;
};

export type LeagueSourceDefinition = {
  provider: "osrs-wiki" | "rs3-wiki" | "legacy-json" | "manual";
  page: string;
  url?: string;
  license?: string;
  revision?: number;
  importedAt?: string;
};

export type LeagueManifest = {
  schemaVersion: 2;
  id: string;
  game: GameId;
  name: string;
  shortName: string;
  edition: string;
  status: PublicationStatus;
  contentVersion: string;
  source: LeagueSourceDefinition;
  expectedTaskCount?: number;
  rewardCurrencies: RewardCurrencyDefinition[];
  tiers: TierDefinition[];
  facets: FacetDefinition[];
  playerStats: PlayerStatDefinition[];
  mechanics: LeagueMechanicDefinition[];
};

export type LeagueDataset = {
  manifest: LeagueManifest;
  tasks: LeagueTask[];
};
