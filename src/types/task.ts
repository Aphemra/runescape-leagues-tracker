export type TaskTier = "easy" | "medium" | "hard" | "elite" | "master";

export type SkillName =
  | "attack"
  | "strength"
  | "defence"
  | "ranged"
  | "prayer"
  | "magic"
  | "runecraft"
  | "construction"
  | "hitpoints"
  | "agility"
  | "herblore"
  | "thieving"
  | "crafting"
  | "fletching"
  | "slayer"
  | "hunter"
  | "mining"
  | "smithing"
  | "fishing"
  | "cooking"
  | "firemaking"
  | "woodcutting"
  | "farming";

export type TaskRequirements = {
  skills: Partial<Record<SkillName, number>>;
  quests: string[];
};

export type Task = {
  region: string;
  name: string;
  description: string;
  pact: boolean;
  requirements: TaskRequirements;
  points: number;
  tier: TaskTier;
};

export type PlayerSkills = Record<SkillName, number>;
