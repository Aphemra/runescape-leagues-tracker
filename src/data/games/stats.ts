import type { PlayerStatDefinition } from "../../domain/leagues/types";

type StatOptions = {
  maximum?: number;
  defaultValue?: number;
  icon?: boolean;
};

function stat(id: string, label: string, group: string, options: StatOptions = {}): PlayerStatDefinition {
  return {
    id,
    label,
    group,
    minimum: 1,
    maximum: options.maximum ?? 99,
    defaultValue: options.defaultValue ?? 1,
    ...(options.icon === false ? {} : { icon: `icons/skills/${id}.png` }),
  };
}

export const osrsPlayerStats: PlayerStatDefinition[] = [
  stat("attack", "Attack", "Combat"),
  stat("strength", "Strength", "Combat"),
  stat("defence", "Defence", "Combat"),
  stat("ranged", "Ranged", "Combat"),
  stat("prayer", "Prayer", "Combat"),
  stat("magic", "Magic", "Combat"),
  stat("hitpoints", "Hitpoints", "Combat", { defaultValue: 10 }),
  stat("runecraft", "Runecraft", "Gathering and artisan"),
  stat("construction", "Construction", "Gathering and artisan"),
  stat("agility", "Agility", "Gathering and artisan"),
  stat("herblore", "Herblore", "Gathering and artisan"),
  stat("thieving", "Thieving", "Gathering and artisan"),
  stat("crafting", "Crafting", "Gathering and artisan"),
  stat("fletching", "Fletching", "Gathering and artisan"),
  stat("slayer", "Slayer", "Gathering and artisan"),
  stat("hunter", "Hunter", "Gathering and artisan"),
  stat("mining", "Mining", "Gathering and artisan"),
  stat("smithing", "Smithing", "Gathering and artisan"),
  stat("fishing", "Fishing", "Gathering and artisan"),
  stat("cooking", "Cooking", "Gathering and artisan"),
  stat("firemaking", "Firemaking", "Gathering and artisan"),
  stat("woodcutting", "Woodcutting", "Gathering and artisan"),
  stat("farming", "Farming", "Gathering and artisan"),
  stat("sailing", "Sailing", "Gathering and artisan", { icon: false }),
];

const rs3Caps: Record<string, number> = {
  archaeology: 120,
  attack: 120,
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
    defaultValue,
    icon: false,
  });
}

export const rs3PlayerStats: PlayerStatDefinition[] = [
  rs3Stat("attack", "Attack", "Combat"),
  rs3Stat("strength", "Strength", "Combat"),
  rs3Stat("defence", "Defence", "Combat"),
  rs3Stat("constitution", "Constitution", "Combat", 10),
  rs3Stat("ranged", "Ranged", "Combat"),
  rs3Stat("prayer", "Prayer", "Combat"),
  rs3Stat("magic", "Magic", "Combat"),
  rs3Stat("summoning", "Summoning", "Combat"),
  rs3Stat("necromancy", "Necromancy", "Combat"),
  rs3Stat("archaeology", "Archaeology", "Gathering"),
  rs3Stat("divination", "Divination", "Gathering"),
  rs3Stat("farming", "Farming", "Gathering"),
  rs3Stat("fishing", "Fishing", "Gathering"),
  rs3Stat("hunter", "Hunter", "Gathering"),
  rs3Stat("mining", "Mining", "Gathering"),
  rs3Stat("woodcutting", "Woodcutting", "Gathering"),
  rs3Stat("cooking", "Cooking", "Artisan"),
  rs3Stat("construction", "Construction", "Artisan"),
  rs3Stat("crafting", "Crafting", "Artisan"),
  rs3Stat("firemaking", "Firemaking", "Artisan"),
  rs3Stat("fletching", "Fletching", "Artisan"),
  rs3Stat("herblore", "Herblore", "Artisan"),
  rs3Stat("runecrafting", "Runecrafting", "Artisan"),
  rs3Stat("smithing", "Smithing", "Artisan"),
  rs3Stat("agility", "Agility", "Support"),
  rs3Stat("dungeoneering", "Dungeoneering", "Support"),
  rs3Stat("slayer", "Slayer", "Support"),
  rs3Stat("thieving", "Thieving", "Support"),
  rs3Stat("invention", "Invention", "Elite"),
];
