import type { PlayerStatDefinition } from "../../domain/leagues/types";

type StatOptions = {
  maximum?: number;
  virtualMaximum?: number;
  defaultValue?: number;
  icon?: string | false;
};

function stat(id: string, label: string, group: string, options: StatOptions = {}): PlayerStatDefinition {
  const maximum = options.maximum ?? 99;

  return {
    id,
    label,
    group,
    minimum: 1,
    maximum,
    virtualMaximum: options.virtualMaximum ?? maximum,
    defaultValue: options.defaultValue ?? 1,
    ...(options.icon === false
      ? {}
      : {
          icon: options.icon ?? `icons/skills/osrs/${id}.png`,
        }),
  };
}

export const osrsPlayerStats: PlayerStatDefinition[] = [
  stat("attack", "Attack", "Combat"),
  stat("hitpoints", "Hitpoints", "Combat", { defaultValue: 10 }),
  stat("mining", "Mining", "Gathering"),

  stat("strength", "Strength", "Combat"),
  stat("agility", "Agility", "Support"),
  stat("smithing", "Smithing", "Artisan"),

  stat("defence", "Defence", "Combat"),
  stat("herblore", "Herblore", "Artisan"),
  stat("fishing", "Fishing", "Gathering"),

  stat("ranged", "Ranged", "Combat"),
  stat("thieving", "Thieving", "Support"),
  stat("cooking", "Cooking", "Artisan"),

  stat("prayer", "Prayer", "Combat"),
  stat("crafting", "Crafting", "Artisan"),
  stat("firemaking", "Firemaking", "Artisan"),

  stat("magic", "Magic", "Combat"),
  stat("fletching", "Fletching", "Artisan"),
  stat("woodcutting", "Woodcutting", "Gathering"),

  stat("runecraft", "Runecraft", "Artisan"),
  stat("slayer", "Slayer", "Support"),
  stat("farming", "Farming", "Gathering"),

  stat("construction", "Construction", "Artisan"),
  stat("hunter", "Hunter", "Gathering"),
  stat("sailing", "Sailing", "Gathering"),
];

const rs3Caps: Record<string, number> = {
  archaeology: 120,
  attack: 120,
  construction: 120,
  crafting: 110,
  dungeoneering: 120,
  farming: 120,
  firemaking: 110,
  fletching: 110,
  herblore: 120,
  hunter: 110,
  invention: 120,
  magic: 120,
  mining: 110,
  necromancy: 120,
  ranged: 120,
  runecrafting: 110,
  slayer: 120,
  smithing: 110,
  strength: 120,
  thieving: 120,
  woodcutting: 110,
};

function rs3Stat(id: string, label: string, group: string, defaultValue = 1): PlayerStatDefinition {
  return stat(id, label, group, {
    maximum: rs3Caps[id] ?? 99,
    virtualMaximum: id === "invention" ? 150 : 120,
    defaultValue,
    icon: `icons/skills/rs3/${id}.png`,
  });
}

export const rs3PlayerStats: PlayerStatDefinition[] = [
  rs3Stat("attack", "Attack", "Combat"),
  rs3Stat("constitution", "Constitution", "Combat", 10),
  rs3Stat("mining", "Mining", "Gathering"),

  rs3Stat("strength", "Strength", "Combat"),
  rs3Stat("agility", "Agility", "Support"),
  rs3Stat("smithing", "Smithing", "Artisan"),

  rs3Stat("defence", "Defence", "Combat"),
  rs3Stat("herblore", "Herblore", "Artisan"),
  rs3Stat("fishing", "Fishing", "Gathering"),

  rs3Stat("ranged", "Ranged", "Combat"),
  rs3Stat("thieving", "Thieving", "Support"),
  rs3Stat("cooking", "Cooking", "Artisan"),

  rs3Stat("prayer", "Prayer", "Combat"),
  rs3Stat("crafting", "Crafting", "Artisan"),
  rs3Stat("firemaking", "Firemaking", "Artisan"),

  rs3Stat("magic", "Magic", "Combat"),
  rs3Stat("fletching", "Fletching", "Artisan"),
  rs3Stat("woodcutting", "Woodcutting", "Gathering"),

  rs3Stat("runecrafting", "Runecrafting", "Artisan"),
  rs3Stat("slayer", "Slayer", "Support"),
  rs3Stat("farming", "Farming", "Gathering"),

  rs3Stat("construction", "Construction", "Artisan"),
  rs3Stat("hunter", "Hunter", "Gathering"),
  rs3Stat("summoning", "Summoning", "Combat"),

  rs3Stat("dungeoneering", "Dungeoneering", "Support"),
  rs3Stat("divination", "Divination", "Gathering"),
  rs3Stat("invention", "Invention", "Elite"),

  rs3Stat("archaeology", "Archaeology", "Gathering"),
  rs3Stat("necromancy", "Necromancy", "Combat"),
];
