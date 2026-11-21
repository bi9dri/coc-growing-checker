// @vitest-environment happy-dom
import { describe, expect, test } from "vite-plus/test";

import allHtml from "../test/fixtures/ccfolia_all.html?raw";
import logJson from "../test/fixtures/ccfolia_log.json?raw";
import { type CharacterCandidates, collectCandidates } from "./domain/growth/collectCandidates.ts";
import { type SkillGrowth, rollGrowth } from "./domain/growth/rollGrowth.ts";
import { parseLog } from "./domain/log/parseLog.ts";
import { parseSkillRoll } from "./domain/roll/parseSkillRoll.ts";
import {
  type CheckSettings,
  type GrowthSettings,
  DEFAULT_CHECK_SETTINGS,
  defaultGrowthSettings,
} from "./domain/settings.ts";

export interface PipelineResult {
  characters: CharacterCandidates[];
  growthsByCharacter: Map<string, SkillGrowth[]>;
}

export function runPipeline(
  logContent: string,
  checkSettings: CheckSettings = DEFAULT_CHECK_SETTINGS,
  growthSettings: GrowthSettings = defaultGrowthSettings(7),
  dice = { roll: () => ({ total: 99, text: "(1D100) ＞ 99" }) },
): PipelineResult {
  const messages = parseLog(logContent);
  const rolls = messages.flatMap((m) => {
    const r = parseSkillRoll(m);
    return r ? [r] : [];
  });
  const characters = collectCandidates(rolls, checkSettings);
  const growthsByCharacter = new Map<string, SkillGrowth[]>();
  for (const c of characters) {
    growthsByCharacter.set(c.characterName, rollGrowth(c, growthSettings, 7, dice));
  }
  return { characters, growthsByCharacter };
}

const skillOnlySettings: CheckSettings = {
  ...DEFAULT_CHECK_SETTINGS,
  exclude: { ...DEFAULT_CHECK_SETTINGS.exclude, luck: true },
};

describe("E2Eパイプライン（HTML実ログ）", () => {
  test("デフォルト設定では全探索者に幸運が含まれる", () => {
    const { characters } = runPipeline(allHtml);
    expect(characters.every((c) => c.candidates.some((s) => s.skillName === "幸運"))).toBe(true);
  });

  test("mainチャンネルのみ（幸運除外）の設定", () => {
    const { characters } = runPipeline(allHtml, skillOnlySettings);

    expect(characters.map((c) => c.characterName)).toEqual([
      "橘 悠真 (仮名)",
      "白石 透",
      "神崎 凛",
    ]);

    const rin = characters.find((c) => c.characterName === "神崎 凛");
    expect(rin?.candidates).toEqual([
      {
        skillName: "芸術/製作（絵画）",
        baseSkill: "芸術/製作",
        specialization: "絵画",
        skillValue: 65,
      },
    ]);
  });

  test("otherチャンネルを含めると白石 透の近接戦闘（格闘）も候補になる", () => {
    const { characters } = runPipeline(allHtml, {
      ...skillOnlySettings,
      channels: ["main", "other"],
    });

    const toru = characters.find((c) => c.characterName === "白石 透");
    expect(toru?.candidates).toEqual([
      {
        skillName: "近接戦闘（格闘）",
        baseSkill: "近接戦闘",
        specialization: "格闘",
        skillValue: 70,
      },
    ]);
  });

  test("ファンブルを含める設定にすると橘 悠真の聞き耳が候補になる", () => {
    const { characters } = runPipeline(allHtml, {
      ...skillOnlySettings,
      eligibleOutcomes: [...DEFAULT_CHECK_SETTINGS.eligibleOutcomes, "fumble"],
    });

    const yuma = characters.find((c) => c.characterName === "橘 悠真 (仮名)");
    expect(yuma?.candidates).toEqual([
      { skillName: "聞き耳", baseSkill: "聞き耳", skillValue: 40 },
    ]);
  });
});

describe("E2Eパイプライン（JSON実ログ）", () => {
  test("mainチャンネルのみなら正気度ロール（除外）のみの橘 悠真は技能候補0件", () => {
    const { characters } = runPipeline(logJson, skillOnlySettings);
    const yuma = characters.find((c) => c.characterName === "橘 悠真 (仮名)");

    expect(yuma?.candidates).toEqual([]);
  });

  test("正気度ロールの除外を解除すると橘 悠真の正気度ロールが候補になる", () => {
    const { characters } = runPipeline(logJson, {
      ...skillOnlySettings,
      exclude: { ...skillOnlySettings.exclude, sanity: false },
    });
    const yuma = characters.find((c) => c.characterName === "橘 悠真 (仮名)");

    expect(yuma?.candidates).toEqual([
      { skillName: "正気度ロール", baseSkill: "正気度ロール", skillValue: 70 },
    ]);
  });
});
