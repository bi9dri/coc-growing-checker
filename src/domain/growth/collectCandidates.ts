import type { Edition, SkillRoll } from "../roll/types.ts";
import type { CheckSettings } from "../settings.ts";

export interface SkillEntry {
  skillName: string;
  baseSkill: string;
  specialization?: string;
  skillValue: number;
}

export interface CharacterCandidates {
  characterName: string;
  candidates: SkillEntry[];
  knownSkills: SkillEntry[];
}

const toEntry = ({ skillName, baseSkill, specialization, skillValue }: SkillRoll): SkillEntry => ({
  skillName,
  baseSkill,
  ...(specialization === undefined ? {} : { specialization }),
  skillValue,
});

export function collectCandidates(
  rolls: SkillRoll[],
  settings: CheckSettings,
): CharacterCandidates[] {
  const characters = new Map<string, { known: Map<string, SkillEntry>; eligible: Set<string> }>();

  for (const roll of rolls) {
    let character = characters.get(roll.characterName);
    if (!character) {
      character = { known: new Map(), eligible: new Set() };
      characters.set(roll.characterName, character);
    }
    if (roll.category !== "skill" && settings.exclude[roll.category]) continue;

    character.known.set(roll.skillName, toEntry(roll));

    const outcomeMatches =
      roll.category === "luck" && settings.luckCandidateCondition === "unconditional"
        ? true
        : settings.eligibleOutcomes.includes(roll.outcome);

    if (
      !(roll.secret && settings.exclude.secret) &&
      settings.channels.includes(roll.channel) &&
      outcomeMatches
    ) {
      character.eligible.add(roll.skillName);
    }
  }

  return [...characters].map(([characterName, { known, eligible }]) => {
    const shouldAddLuckToAll = !settings.exclude.luck && settings.luckCandidateCondition === "all";
    if (shouldAddLuckToAll && !known.has("幸運")) {
      const luckEntry: SkillEntry = { skillName: "幸運", baseSkill: "幸運", skillValue: 50 };
      known.set("幸運", luckEntry);
      eligible.add("幸運");
    } else if (shouldAddLuckToAll) {
      eligible.add("幸運");
    }
    return {
      characterName,
      candidates: [...known.values()].filter((s) => eligible.has(s.skillName)),
      knownSkills: [...known.values()],
    };
  });
}

export function inferEdition(rolls: SkillRoll[]): Edition {
  const sixth = rolls.filter((r) => r.edition === 6).length;
  return sixth * 2 > rolls.length ? 6 : 7;
}
