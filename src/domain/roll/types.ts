export type Edition = 6 | 7;

export type RollOutcome =
  | "critical"
  | "extreme"
  | "hard"
  | "special"
  | "regular"
  | "failure"
  | "fumble";

export type SkillCategory =
  | "skill"
  | "sanity"
  | "characteristic"
  | "luck"
  | "mythos"
  | "creditRating";

export interface SkillRoll {
  channel: string;
  characterName: string;
  skillName: string;
  baseSkill: string;
  specialization?: string;
  skillValue: number;
  outcome: RollOutcome;
  edition: Edition;
  category: SkillCategory;
  secret: boolean;
}
