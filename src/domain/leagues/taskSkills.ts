import type { LeagueManifest, LeagueTask, RequirementNode } from "./types";

type SkillInferenceRule = {
  skillIds: string[];
  patterns: RegExp[];
};

const SKILL_INFERENCE_RULES: SkillInferenceRule[] = [
  {
    skillIds: ["agility"],
    patterns: [
      /\b(?:complete|run) (?:an? )?(?:agility )?(?:course|lap)\b/i,
      /\b(?:cross|use) (?:an? )?agility (?:shortcut|obstacle)\b/i,
    ],
  },
  {
    skillIds: ["archaeology"],
    patterns: [/\bexcavate\b/i, /\brestore (?:an? |\d+ )?(?:artefact|artifact)/i, /\bscreen (?:some )?soil\b/i],
  },
  {
    skillIds: ["construction"],
    patterns: [
      /\bbuild (?:an? |a piece of )?(?:furniture|room|hotspot)/i,
      /\bconstruct (?:an? )?(?:item|piece of furniture)/i,
      /\bmake (?:an? )?flatpack\b/i,
    ],
  },
  {
    skillIds: ["cooking"],
    patterns: [/\b(?:cook|bake|brew|roast)\b/i, /\bmake (?:an? )?(?:pie|pizza|cake|stew)\b/i],
  },
  {
    skillIds: ["crafting"],
    patterns: [
      /\bcraft\b/i,
      /\bcut (?:an? )?(?:gem|diamond|ruby|emerald|sapphire|opal|jade)\b/i,
      /\b(?:spin|weave|glassblow|tan)\b/i,
    ],
  },
  {
    skillIds: ["divination"],
    patterns: [/\bconvert (?:memories|energy)\b/i, /\bharvest .* energy\b/i, /\bcreate (?:an? )?divine location\b/i],
  },
  {
    skillIds: ["dungeoneering"],
    patterns: [/\bcomplete (?:an? )?(?:dungeoneering|daemonheim) floor\b/i, /\bresource dungeon\b/i],
  },
  {
    skillIds: ["farming"],
    patterns: [
      /\bplant (?:an? |some |\d+ )?(?:seed|seeds|sapling|tree)\b/i,
      /\bharvest\b/i,
      /\bcheck (?:the )?health of\b/i,
      /\bgrow (?:an? |a patch of )?(?:crop|herb|tree|flower)\b/i,
    ],
  },
  {
    skillIds: ["firemaking"],
    patterns: [/\bburn (?:any |\d+ |some )?(?:log|logs)\b/i, /\blight (?:an? )?(?:fire|bonfire)\b/i],
  },
  {
    skillIds: ["fishing"],
    patterns: [
      /\b(?:fish|harpoon)\b/i,
      /\bcatch (?:an? |\d+ )?(?:shrimp|anchov|herring|trout|salmon|tuna|lobster|swordfish|shark|fish)/i,
    ],
  },
  {
    skillIds: ["fletching"],
    patterns: [
      /\bfletch\b/i,
      /\bstring (?:an? )?bow\b/i,
      /\bmake (?:an? |\d+ )?(?:arrow|arrows|arrow shafts|bolts)\b/i,
    ],
  },
  {
    skillIds: ["herblore"],
    patterns: [/\bclean (?:an? |some )?herb\b/i, /\b(?:make|mix|create) (?:an? |\d+ )?potions?\b/i],
  },
  {
    skillIds: ["hunter"],
    patterns: [
      /\bset (?:an? )?(?:trap|snare)\b/i,
      /\bcatch (?:an? |\d+ )?(?:bird|butterfl|chinchompa|salamander|kebbit|impling|whirligig)/i,
    ],
  },
  {
    skillIds: ["invention"],
    patterns: [
      /\baugment\b/i,
      /\bdisassemble\b/i,
      /\bsiphon (?:an? )?(?:augmented )?item\b/i,
      /\bdiscover (?:an? )?blueprint\b/i,
    ],
  },
  {
    skillIds: ["mining"],
    patterns: [
      /\bmine (?:an? |any |\d+ |some )?(?:ore|ores|rock|rocks|clay|essence|coal|gem|gems)\b/i,
      /\bprospect (?:an? )?rock\b/i,
    ],
  },
  {
    skillIds: ["prayer"],
    patterns: [
      /\b(?:bury|offer) (?:any |\d+ |some )?bones\b/i,
      /\bscatter (?:any |\d+ |some )?ashes\b/i,
      /\bactivate (?:an? )?prayer\b/i,
    ],
  },
  {
    skillIds: ["runecrafting", "runecraft"],
    patterns: [/\bcraft (?:any |\d+ |some )?runes?\b/i, /\brunespan\b/i],
  },
  {
    skillIds: ["smithing"],
    patterns: [/\bsmelt\b/i, /\bsmith\b/i, /\bheat (?:an? )?(?:item|bar)\b/i],
  },
  {
    skillIds: ["summoning"],
    patterns: [/\bcreate (?:an? )?.* pouch\b/i, /\bsummon (?:an? )?(?:familiar|spirit)\b/i],
  },
  {
    skillIds: ["thieving"],
    patterns: [/\bpickpocket\b/i, /\bsteal from\b/i, /\bcrack (?:an? )?safe\b/i],
  },
  {
    skillIds: ["woodcutting"],
    patterns: [/\bchop\b/i, /\bcut (?:an? |any |\d+ |some )?.*trees?\b/i, /\bcut (?:any |\d+ |some )?creeping ivy\b/i],
  },
];

function collectRequirementSkills(node: RequirementNode, result: Set<string>): void {
  if (node.kind === "stat") {
    result.add(node.statId);
    return;
  }

  if (node.kind === "all" || node.kind === "any") {
    node.children.forEach((child) => collectRequirementSkills(child, result));
  }
}

export function getTaskSkillIds(task: LeagueTask, manifest: LeagueManifest): string[] {
  const result = new Set<string>();
  const knownSkillIds = new Set(manifest.playerStats.map((stat) => stat.id));

  if (task.requirements.root) {
    collectRequirementSkills(task.requirements.root, result);
  }

  const usesSkills = task.extensions?.usesSkills;

  if (Array.isArray(usesSkills)) {
    for (const skillId of usesSkills) {
      if (typeof skillId === "string" && skillId.length > 0) {
        result.add(skillId);
      }
    }
  }

  const searchableText = `${task.title} ${task.description.plain}`.toLocaleLowerCase();

  for (const rule of SKILL_INFERENCE_RULES) {
    const matchingSkillId = rule.skillIds.find((skillId) => knownSkillIds.has(skillId));

    if (matchingSkillId && rule.patterns.some((pattern) => pattern.test(searchableText))) {
      result.add(matchingSkillId);
    }
  }

  return [...result];
}
