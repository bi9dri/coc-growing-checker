import type { Edition, RollOutcome } from "./roll/types.ts";

export interface CheckSettings {
  channels: string[];
  eligibleOutcomes: RollOutcome[];
  exclude: {
    sanity: boolean;
    characteristic: boolean;
    luck: boolean;
    secret: boolean;
    mythos: boolean;
    creditRating: boolean;
  };
  luckCandidateCondition: "outcome" | "unconditional" | "all";
}

export interface GrowthSettings {
  experienceCheck: boolean;
  growthDice: string;
  sanityRecoveryAt90: boolean;
  transferableSkills: boolean;
}

export const DEFAULT_CHECK_SETTINGS: CheckSettings = {
  channels: ["main"],
  eligibleOutcomes: ["critical", "extreme", "hard", "special", "regular"],
  exclude: {
    sanity: true,
    characteristic: true,
    luck: false,
    secret: true,
    mythos: true,
    creditRating: true,
  },
  luckCandidateCondition: "all",
};

export function defaultGrowthSettings(edition: Edition): GrowthSettings {
  return {
    experienceCheck: true,
    growthDice: "1D10",
    sanityRecoveryAt90: edition === 7,
    transferableSkills: false,
  };
}

export function resolveCheckSettings(settings: CheckSettings, edition: Edition): CheckSettings {
  if (edition === 7) return settings;
  return {
    ...settings,
    exclude: { ...settings.exclude, luck: true },
  };
}

export function resolveGrowthSettings(settings: GrowthSettings, edition: Edition): GrowthSettings {
  if (edition === 7) return settings;
  return {
    ...settings,
    transferableSkills: false,
  };
}

const EXCLUDE_KEYS: (keyof CheckSettings["exclude"])[] = [
  "sanity",
  "characteristic",
  "luck",
  "secret",
  "mythos",
  "creditRating",
];

export function resetCheckSettings(current: CheckSettings): CheckSettings {
  return {
    channels: [...current.channels],
    eligibleOutcomes: [...DEFAULT_CHECK_SETTINGS.eligibleOutcomes],
    exclude: { ...DEFAULT_CHECK_SETTINGS.exclude },
    luckCandidateCondition: DEFAULT_CHECK_SETTINGS.luckCandidateCondition,
  };
}

export function isDefaultSettings(
  checkSettings: CheckSettings,
  growthSettings: GrowthSettings,
  edition: Edition,
): boolean {
  const defaultOutcomes = DEFAULT_CHECK_SETTINGS.eligibleOutcomes;
  if (checkSettings.eligibleOutcomes.length !== defaultOutcomes.length) return false;
  if (!defaultOutcomes.every((o) => checkSettings.eligibleOutcomes.includes(o))) return false;
  if (
    EXCLUDE_KEYS.some((key) => checkSettings.exclude[key] !== DEFAULT_CHECK_SETTINGS.exclude[key])
  ) {
    return false;
  }
  if (checkSettings.luckCandidateCondition !== DEFAULT_CHECK_SETTINGS.luckCandidateCondition) {
    return false;
  }

  const defaultGrowth = defaultGrowthSettings(edition);
  return (
    growthSettings.experienceCheck === defaultGrowth.experienceCheck &&
    growthSettings.growthDice === defaultGrowth.growthDice &&
    growthSettings.sanityRecoveryAt90 === defaultGrowth.sanityRecoveryAt90 &&
    growthSettings.transferableSkills === defaultGrowth.transferableSkills
  );
}
