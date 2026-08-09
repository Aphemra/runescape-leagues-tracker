import type { LeagueManifest, RequirementNode, RequirementSet } from "./types";

export type RequirementEvaluation = "met" | "unmet" | "unknown";

export type RequirementEvaluationContext = {
  stats: Record<string, number>;
  flags?: Record<string, boolean>;
  unlockedFacets?: Record<string, string[]>;
  customEvaluators?: Record<string, (node: Extract<RequirementNode, { kind: "custom" }>) => RequirementEvaluation>;
};

function evaluateNode(node: RequirementNode, context: RequirementEvaluationContext): RequirementEvaluation {
  if (node.kind === "stat") {
    const value = context.stats[node.statId];
    if (typeof value !== "number" || !Number.isFinite(value)) return "unknown";
    return value >= node.minimum ? "met" : "unmet";
  }

  if (node.kind === "flag") {
    const value = context.flags?.[node.flagId];
    if (typeof value !== "boolean") return "unknown";
    return value ? "met" : "unmet";
  }

  if (node.kind === "facet-unlocked") {
    const values = context.unlockedFacets?.[node.facetId];
    if (!values) return "unknown";
    return values.includes(node.valueId) ? "met" : "unmet";
  }

  if (node.kind === "custom") {
    const evaluator = context.customEvaluators?.[node.namespace];
    return evaluator ? evaluator(node) : "unknown";
  }

  const results = node.children.map((child) => evaluateNode(child, context));

  if (node.kind === "all") {
    if (results.includes("unmet")) return "unmet";
    if (results.every((result) => result === "met")) return "met";
    return "unknown";
  }

  if (results.includes("met")) return "met";
  if (results.length > 0 && results.every((result) => result === "unmet")) return "unmet";
  return "unknown";
}

export function evaluateRequirements(
  requirements: RequirementSet,
  context: RequirementEvaluationContext,
): RequirementEvaluation {
  if (!requirements.root) {
    return requirements.parseStatus === "complete" ? "met" : "unknown";
  }

  const result = evaluateNode(requirements.root, context);
  if (result === "met" && requirements.parseStatus !== "complete") return "unknown";
  return result;
}

export function buildDefaultStats(manifest: LeagueManifest): Record<string, number> {
  return Object.fromEntries(manifest.playerStats.map((stat) => [stat.id, stat.defaultValue]));
}

export function normalizeStats(manifest: LeagueManifest, raw: unknown): Record<string, number> {
  const defaults = buildDefaultStats(manifest);
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return defaults;

  const values = raw as Record<string, unknown>;
  for (const definition of manifest.playerStats) {
    const value = values[definition.id];
    if (typeof value !== "number" || !Number.isFinite(value)) continue;
    defaults[definition.id] = Math.min(definition.maximum, Math.max(definition.minimum, Math.floor(value)));
  }

  return defaults;
}
