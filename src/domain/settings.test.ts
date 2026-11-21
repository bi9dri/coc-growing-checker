import { describe, expect, test } from "vite-plus/test";

import {
  DEFAULT_CHECK_SETTINGS,
  defaultGrowthSettings,
  isDefaultSettings,
  resetCheckSettings,
  resolveCheckSettings,
  resolveGrowthSettings,
} from "./settings.ts";

describe("settings", () => {
  test("resolveCheckSettings は7版で設定をそのまま返し、6版で幸運を除外する", () => {
    expect(resolveCheckSettings(DEFAULT_CHECK_SETTINGS, 7)).toBe(DEFAULT_CHECK_SETTINGS);

    const sixth = resolveCheckSettings(DEFAULT_CHECK_SETTINGS, 6);
    expect(sixth.exclude.luck).toBe(true);
    expect(sixth.exclude.sanity).toBe(DEFAULT_CHECK_SETTINGS.exclude.sanity);
  });

  test("resolveGrowthSettings は7版で設定をそのまま返し、6版で転換可能な技能を無効化する", () => {
    const custom = { ...defaultGrowthSettings(7), transferableSkills: true };
    expect(resolveGrowthSettings(custom, 7)).toBe(custom);

    const sixth = resolveGrowthSettings(custom, 6);
    expect(sixth.transferableSkills).toBe(false);
    expect(sixth.growthDice).toBe(custom.growthDice);
  });

  test("resetCheckSettings は channels を維持しつつハウスルール設定をデフォルトに戻す", () => {
    const modified = {
      channels: ["メイン", "雑談"],
      eligibleOutcomes: ["critical" as const, "fumble" as const],
      exclude: {
        sanity: false,
        characteristic: false,
        luck: true,
        secret: false,
        mythos: false,
        creditRating: false,
      },
      luckCandidateCondition: "outcome" as const,
    };

    const reset = resetCheckSettings(modified);
    expect(reset).toEqual({
      ...DEFAULT_CHECK_SETTINGS,
      channels: ["メイン", "雑談"],
    });
    expect(reset.channels).not.toBe(modified.channels);
    expect(reset.eligibleOutcomes).not.toBe(DEFAULT_CHECK_SETTINGS.eligibleOutcomes);
    expect(reset.exclude).not.toBe(DEFAULT_CHECK_SETTINGS.exclude);
  });

  test("isDefaultSettings は channels 以外の設定がデフォルトと一致するかを判定する", () => {
    expect(isDefaultSettings(DEFAULT_CHECK_SETTINGS, defaultGrowthSettings(7), 7)).toBe(true);
    expect(isDefaultSettings(DEFAULT_CHECK_SETTINGS, defaultGrowthSettings(6), 6)).toBe(true);

    expect(
      isDefaultSettings(
        { ...DEFAULT_CHECK_SETTINGS, channels: ["メイン", "雑談"] },
        defaultGrowthSettings(7),
        7,
      ),
    ).toBe(true);

    expect(
      isDefaultSettings(
        {
          ...DEFAULT_CHECK_SETTINGS,
          eligibleOutcomes: [...DEFAULT_CHECK_SETTINGS.eligibleOutcomes].reverse(),
        },
        defaultGrowthSettings(7),
        7,
      ),
    ).toBe(true);

    expect(
      isDefaultSettings(
        { ...DEFAULT_CHECK_SETTINGS, eligibleOutcomes: ["critical"] },
        defaultGrowthSettings(7),
        7,
      ),
    ).toBe(false);

    expect(
      isDefaultSettings(
        {
          ...DEFAULT_CHECK_SETTINGS,
          eligibleOutcomes: ["critical", "extreme", "hard", "special", "fumble"],
        },
        defaultGrowthSettings(7),
        7,
      ),
    ).toBe(false);

    expect(
      isDefaultSettings(
        {
          ...DEFAULT_CHECK_SETTINGS,
          exclude: { ...DEFAULT_CHECK_SETTINGS.exclude, creditRating: false },
        },
        defaultGrowthSettings(7),
        7,
      ),
    ).toBe(false);

    expect(
      isDefaultSettings(
        { ...DEFAULT_CHECK_SETTINGS, luckCandidateCondition: "outcome" },
        defaultGrowthSettings(7),
        7,
      ),
    ).toBe(false);

    expect(
      isDefaultSettings(
        DEFAULT_CHECK_SETTINGS,
        { ...defaultGrowthSettings(7), growthDice: "1D6" },
        7,
      ),
    ).toBe(false);

    expect(
      isDefaultSettings(
        DEFAULT_CHECK_SETTINGS,
        { ...defaultGrowthSettings(7), experienceCheck: false },
        7,
      ),
    ).toBe(false);

    expect(
      isDefaultSettings(
        DEFAULT_CHECK_SETTINGS,
        { ...defaultGrowthSettings(7), sanityRecoveryAt90: false },
        7,
      ),
    ).toBe(false);

    expect(
      isDefaultSettings(
        DEFAULT_CHECK_SETTINGS,
        { ...defaultGrowthSettings(7), transferableSkills: true },
        7,
      ),
    ).toBe(false);
  });
});
