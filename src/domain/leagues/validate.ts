import type { LeagueDataset, LeagueTask, RequirementNode } from "./types";

export type DatasetValidationIssue = {
  level: "error" | "warning";
  code: string;
  message: string;
  taskId?: string;
};

function validateRequirementNode(
  node: RequirementNode,
  task: LeagueTask,
  statIds: Set<string>,
  facetValues: Map<string, Set<string>>,
  issues: DatasetValidationIssue[],
) {
  if (node.kind === "all" || node.kind === "any") {
    if (node.children.length === 0) {
      issues.push({
        level: "warning",
        code: "empty-requirement-group",
        message: `Task ${task.id} has an empty ${node.kind} group.`,
        taskId: task.id,
      });
    }
    for (const child of node.children) validateRequirementNode(child, task, statIds, facetValues, issues);
    return;
  }

  if (node.kind === "stat" && !statIds.has(node.statId)) {
    issues.push({
      level: "error",
      code: "unknown-stat",
      message: `Task ${task.id} references unknown stat ${node.statId}.`,
      taskId: task.id,
    });
  }

  if (node.kind === "facet-unlocked") {
    const values = facetValues.get(node.facetId);
    if (!values?.has(node.valueId)) {
      issues.push({
        level: "error",
        code: "unknown-facet-requirement",
        message: `Task ${task.id} references unknown facet value ${node.facetId}:${node.valueId}.`,
        taskId: task.id,
      });
    }
  }
}

export function validateLeagueDataset(dataset: LeagueDataset): DatasetValidationIssue[] {
  const { manifest, tasks } = dataset;
  const issues: DatasetValidationIssue[] = [];
  const taskIds = new Set<string>();
  const tierIds = new Set(manifest.tiers.map((tier) => tier.id));
  const currencyIds = new Set(manifest.rewardCurrencies.map((currency) => currency.id));
  const statIds = new Set(manifest.playerStats.map((stat) => stat.id));
  const facetValues = new Map(
    manifest.facets.map((facet) => [facet.id, new Set(facet.values.map((value) => value.id))]),
  );

  if (manifest.expectedTaskCount !== undefined && tasks.length !== manifest.expectedTaskCount) {
    issues.push({
      level: "error",
      code: "unexpected-task-count",
      message: `Expected ${manifest.expectedTaskCount} tasks but found ${tasks.length}.`,
    });
  }

  for (const task of tasks) {
    if (task.leagueId !== manifest.id) {
      issues.push({
        level: "error",
        code: "wrong-league-id",
        message: `Task ${task.id} belongs to ${task.leagueId}, not ${manifest.id}.`,
        taskId: task.id,
      });
    }

    if (taskIds.has(task.id)) {
      issues.push({
        level: "error",
        code: "duplicate-task-id",
        message: `Duplicate task ID ${task.id}.`,
        taskId: task.id,
      });
    }
    taskIds.add(task.id);

    if (!task.title.trim()) {
      issues.push({ level: "error", code: "missing-title", message: `Task ${task.id} has no title.`, taskId: task.id });
    }

    if (!tierIds.has(task.tierId)) {
      issues.push({
        level: "error",
        code: "unknown-tier",
        message: `Task ${task.id} references unknown tier ${task.tierId}.`,
        taskId: task.id,
      });
    }

    for (const reward of task.rewards) {
      if (!currencyIds.has(reward.currencyId)) {
        issues.push({
          level: "error",
          code: "unknown-currency",
          message: `Task ${task.id} references unknown currency ${reward.currencyId}.`,
          taskId: task.id,
        });
      }
    }

    for (const [facetId, values] of Object.entries(task.facets)) {
      const allowedValues = facetValues.get(facetId);
      if (!allowedValues) {
        issues.push({
          level: "error",
          code: "unknown-facet",
          message: `Task ${task.id} references unknown facet ${facetId}.`,
          taskId: task.id,
        });
        continue;
      }

      for (const value of values) {
        if (!allowedValues.has(value)) {
          issues.push({
            level: "error",
            code: "unknown-facet-value",
            message: `Task ${task.id} references unknown ${facetId} value ${value}.`,
            taskId: task.id,
          });
        }
      }
    }

    if (task.requirements.root) validateRequirementNode(task.requirements.root, task, statIds, facetValues, issues);
  }

  return issues;
}
