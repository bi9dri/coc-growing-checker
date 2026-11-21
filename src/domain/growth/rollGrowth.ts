import type { DiceResult, DiceRoller } from "../dice/types.ts";
import type { Edition } from "../roll/types.ts";
import type { GrowthSettings } from "../settings.ts";
import type { CharacterCandidates, SkillEntry } from "./collectCandidates.ts";

export interface SkillGrowth {
  skillName: string;
  baseSkill: string;
  specialization?: string;
  source: "experience" | "transfer";
  before: number;
  after: number;
  check?: { roll: DiceResult; passed: boolean };
  growth?: DiceResult;
  sanityRecovery?: DiceResult;
  transferBonus: number;
}

const TRANSFER_THRESHOLDS = [50, 90] as const;
const TRANSFER_BONUS = 10;
const TRANSFER_CAP = 90;

export const TRANSFER_GROUPS: Record<string, string> = {
  近接戦闘: "近接戦闘",
  射撃: "射撃",
  言語: "言語",
  母国語: "言語",
  サバイバル: "サバイバル",
};

export const getTransferGroup = (
  s: Pick<SkillEntry, "baseSkill" | "specialization">,
): string | undefined =>
  s.specialization === undefined ? undefined : TRANSFER_GROUPS[s.baseSkill];

export const isTransferableSkill = (s: Pick<SkillEntry, "baseSkill" | "specialization">): boolean =>
  getTransferGroup(s) !== undefined;

const transferGroup = getTransferGroup;

function passesExperienceCheck(roll: number, skillValue: number, edition: Edition): boolean {
  return roll > skillValue || (edition === 7 && roll >= 96);
}

export function isSkillEligibleForSanityRecovery(baseSkill: string): boolean {
  const normalized = baseSkill.trim().toUpperCase();
  return normalized !== "幸運" && normalized !== "LUCK";
}

function createBaseGrowth(skill: SkillEntry): SkillGrowth {
  return {
    skillName: skill.skillName,
    baseSkill: skill.baseSkill,
    ...(skill.specialization === undefined ? {} : { specialization: skill.specialization }),
    source: "experience",
    before: skill.skillValue,
    after: skill.skillValue,
    transferBonus: 0,
  };
}

function stripTransferBonus(g: SkillGrowth): SkillGrowth {
  return {
    ...g,
    after: g.before + (g.growth?.total ?? 0),
    transferBonus: 0,
  };
}

function rollCheckForSkill(
  skill: SkillEntry,
  settings: GrowthSettings,
  edition: Edition,
  dice: DiceRoller,
): SkillGrowth {
  const growth = createBaseGrowth(skill);
  if (settings.experienceCheck) {
    const roll = dice.roll("1D100");
    const passed = passesExperienceCheck(roll.total, skill.skillValue, edition);
    growth.check = { roll, passed };
  }
  return growth;
}

function rollGrowthForSkill(
  skill: SkillEntry,
  settings: GrowthSettings,
  dice: DiceRoller,
  existing: SkillGrowth | undefined,
): SkillGrowth {
  const base = existing?.source === "experience" ? existing : createBaseGrowth(skill);
  const canRoll = !settings.experienceCheck || existing?.check?.passed === true;
  if (!canRoll) {
    const result: SkillGrowth = {
      ...base,
      before: skill.skillValue,
      after: skill.skillValue,
      transferBonus: 0,
    };
    delete result.growth;
    delete result.sanityRecovery;
    return result;
  }

  const growth = dice.roll(settings.growthDice);
  const result: SkillGrowth = {
    ...base,
    before: skill.skillValue,
    after: skill.skillValue + growth.total,
    growth,
    transferBonus: 0,
  };
  delete result.sanityRecovery;
  return result;
}

function rollSanityForGrowth(
  g: SkillGrowth,
  settings: GrowthSettings,
  dice: DiceRoller,
): SkillGrowth {
  const experienceAfter = g.before + (g.growth?.total ?? 0);
  const eligible =
    settings.sanityRecoveryAt90 &&
    g.source === "experience" &&
    isSkillEligibleForSanityRecovery(g.baseSkill) &&
    g.before < 90 &&
    experienceAfter >= 90;

  if (eligible) {
    return { ...g, sanityRecovery: dice.roll("2D6") };
  }
  const result = { ...g };
  delete result.sanityRecovery;
  return result;
}

function finalizeGrowths(
  growths: SkillGrowth[],
  character: CharacterCandidates,
  settings: GrowthSettings,
): SkillGrowth[] {
  return settings.transferableSkills ? applyTransfers(growths, character) : growths;
}

export function rollExperienceChecks(
  character: CharacterCandidates,
  settings: GrowthSettings,
  edition: Edition,
  dice: DiceRoller,
): SkillGrowth[] {
  return character.candidates.map((skill) => rollCheckForSkill(skill, settings, edition, dice));
}

export function rollGrowthDices(
  character: CharacterCandidates,
  settings: GrowthSettings,
  dice: DiceRoller,
  currentGrowths: Map<string, SkillGrowth>,
): SkillGrowth[] {
  const updated = character.candidates.map((skill) =>
    rollGrowthForSkill(skill, settings, dice, currentGrowths.get(skill.skillName)),
  );
  return finalizeGrowths(updated, character, settings);
}

export function rollSanityRecoveries(
  settings: GrowthSettings,
  dice: DiceRoller,
  currentGrowths: Map<string, SkillGrowth>,
): SkillGrowth[] {
  return [...currentGrowths.values()].map((g) => rollSanityForGrowth(g, settings, dice));
}

function updateSingleSkillGrowth(
  character: CharacterCandidates,
  skillName: string,
  settings: GrowthSettings,
  currentGrowths: Map<string, SkillGrowth>,
  updater: (skill: SkillEntry, existing: SkillGrowth | undefined) => SkillGrowth,
): SkillGrowth[] {
  const target = character.candidates.find((c) => c.skillName === skillName);
  if (!target) return [...currentGrowths.values()];

  const existingExp = [...currentGrowths.values()]
    .filter((g) => g.source === "experience" && g.skillName !== skillName)
    .map(stripTransferBonus);
  const nextTarget = updater(target, currentGrowths.get(skillName));
  return finalizeGrowths([...existingExp, nextTarget], character, settings);
}

export function rollSingleExperienceCheck(
  character: CharacterCandidates,
  skillName: string,
  settings: GrowthSettings,
  edition: Edition,
  dice: DiceRoller,
  currentGrowths: Map<string, SkillGrowth>,
): SkillGrowth[] {
  return updateSingleSkillGrowth(character, skillName, settings, currentGrowths, (skill) =>
    rollCheckForSkill(skill, settings, edition, dice),
  );
}

export function rollSingleGrowthDice(
  character: CharacterCandidates,
  skillName: string,
  settings: GrowthSettings,
  dice: DiceRoller,
  currentGrowths: Map<string, SkillGrowth>,
): SkillGrowth[] {
  return updateSingleSkillGrowth(
    character,
    skillName,
    settings,
    currentGrowths,
    (skill, existing) => rollGrowthForSkill(skill, settings, dice, existing),
  );
}

export function rollSingleSanityRecovery(
  skillName: string,
  settings: GrowthSettings,
  dice: DiceRoller,
  currentGrowths: Map<string, SkillGrowth>,
): SkillGrowth[] {
  return [...currentGrowths.values()].map((g) =>
    g.skillName === skillName ? rollSanityForGrowth(g, settings, dice) : g,
  );
}

export function rollSingleSkill(
  character: CharacterCandidates,
  skillName: string,
  settings: GrowthSettings,
  edition: Edition,
  dice: DiceRoller,
  currentGrowths: Map<string, SkillGrowth>,
): SkillGrowth[] {
  return updateSingleSkillGrowth(character, skillName, settings, currentGrowths, (skill) => {
    const checked = rollCheckForSkill(skill, settings, edition, dice);
    const grown = rollGrowthForSkill(skill, settings, dice, checked);
    return rollSanityForGrowth(grown, settings, dice);
  });
}

function applyTransfers(growths: SkillGrowth[], character: CharacterCandidates): SkillGrowth[] {
  const candidateNames = new Set(growths.map((g) => g.skillName));
  const all = [
    ...growths,
    ...character.knownSkills
      .filter((s) => !candidateNames.has(s.skillName))
      .map(({ skillValue, ...s }): SkillGrowth => ({
        ...s,
        source: "transfer",
        before: skillValue,
        after: skillValue,
        transferBonus: 0,
      })),
  ];

  for (const group of new Set(Object.values(TRANSFER_GROUPS))) {
    const members = all.filter((g) => transferGroup(g) === group);
    const triggers = new Set<SkillGrowth>();
    let bonus = 0;
    for (const threshold of TRANSFER_THRESHOLDS) {
      const crossed = members.filter((g) => g.before < threshold && g.after >= threshold);
      if (crossed.length === 0) continue;
      bonus += TRANSFER_BONUS;
      for (const g of crossed) triggers.add(g);
    }
    for (const g of members) {
      if (triggers.has(g) || g.after >= TRANSFER_CAP) continue;
      const raised = Math.min(TRANSFER_CAP, g.after + bonus);
      g.transferBonus = raised - g.after;
      g.after = raised;
    }
  }

  return all.filter((g) => g.source === "experience" || g.transferBonus > 0);
}

export function rollGrowth(
  character: CharacterCandidates,
  settings: GrowthSettings,
  edition: Edition,
  dice: DiceRoller,
): SkillGrowth[] {
  const checks = rollExperienceChecks(character, settings, edition, dice);
  const checkMap = new Map(checks.map((g) => [g.skillName, g]));
  const growths = rollGrowthDices(character, settings, dice, checkMap);
  const growthMap = new Map(growths.map((g) => [g.skillName, g]));
  return rollSanityRecoveries(settings, dice, growthMap);
}
