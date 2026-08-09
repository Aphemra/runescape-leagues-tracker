import type { LeagueManifest, RequirementNode } from "./types";

export type StatRequirement = { statId: string; minimum: number; label?: string };

export function collectStatRequirements(node: RequirementNode | undefined): StatRequirement[] {
  if (!node) return [];
  if (node.kind === "stat") return [{ statId: node.statId, minimum: node.minimum, label: node.label }];
  if (node.kind === "all" || node.kind === "any") return node.children.flatMap(collectStatRequirements);
  return [];
}

export function plainWikiText(value: string): string {
  return value
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]+>/g, "")
    .replace(/\[\[File:[^\]]+\]\]/gi, "")
    .replace(/\[\[[^\]|]+\|([^\]]+)\]\]/g, "$1")
    .replace(/\[\[([^\]]+)\]\]/g, "$1")
    .replace(/''+/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function getFacetValueLabel(manifest: LeagueManifest, facetId: string, valueId: string): string {
  return (
    manifest.facets.find((facet) => facet.id === facetId)?.values.find((value) => value.id === valueId)?.label ??
    valueId
  );
}

export function assetPath(path: string): string {
  return `${import.meta.env.BASE_URL}${path.replace(/^\/+/, "")}`;
}
