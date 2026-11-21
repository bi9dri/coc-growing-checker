import { describe, expect, test } from "vite-plus/test";

import type { CharacterCandidates } from "./collectCandidates.ts";
import { formatAllExport, formatCharacterExport } from "./formatExport.ts";
import type { SkillGrowth } from "./rollGrowth.ts";

const charA: CharacterCandidates = {
  characterName: "橘 悠真",
  candidates: [
    { skillName: "目星", baseSkill: "目星", skillValue: 86 },
    { skillName: "図書館", baseSkill: "図書館", skillValue: 70 },
    { skillName: "医学", baseSkill: "医学", skillValue: 60 },
  ],
  knownSkills: [
    { skillName: "目星", baseSkill: "目星", skillValue: 86 },
    { skillName: "図書館", baseSkill: "図書館", skillValue: 70 },
    { skillName: "医学", baseSkill: "医学", skillValue: 60 },
  ],
};

describe("formatCharacterExport & formatAllExport", () => {
  test("ファイル名・区切り線・フッター・技能値を含まず、判定前は技能名のみ出力する", () => {
    const growths = new Map<string, SkillGrowth>([
      [
        "目星",
        {
          skillName: "目星",
          baseSkill: "目星",
          source: "experience",
          before: 86,
          after: 93,
          check: { roll: { total: 94, text: "(1D100) ＞ 94" }, passed: true },
          growth: { total: 7, text: "(1D10) ＞ 7" },
          sanityRecovery: { total: 8, text: "(2D6) ＞ 8" },
          transferBonus: 0,
        },
      ],
      [
        "図書館",
        {
          skillName: "図書館",
          baseSkill: "図書館",
          source: "experience",
          before: 70,
          after: 70,
          check: { roll: { total: 42, text: "(1D100) ＞ 42" }, passed: false },
          transferBonus: 0,
        },
      ],
    ]);

    const text = formatCharacterExport(charA, growths);
    expect(text).toBe(
      [
        "【橘 悠真】",
        "・目星: 1D100=94 [成長] → +7% (86% → 93%) ｜ SAN回復: 2D6=+8",
        "・図書館: 1D100=42 [成長なし]",
        "・医学",
      ].join("\n"),
    );
    expect(text).not.toContain("────");
    expect(text).not.toContain("合計獲得");
    expect(text).not.toContain("[未判定]");
  });

  test("経験チェックOFF・チェックのみ完了・波及ボーナスを出力する", () => {
    const charB: CharacterCandidates = {
      characterName: "白石 透",
      candidates: [
        {
          skillName: "射撃（拳銃）",
          baseSkill: "射撃",
          specialization: "拳銃",
          skillValue: 45,
        },
        { skillName: "聞き耳", baseSkill: "聞き耳", skillValue: 50 },
        { skillName: "心理学", baseSkill: "心理学", skillValue: 50 },
      ],
      knownSkills: [],
    };
    const growths = new Map<string, SkillGrowth>([
      [
        "射撃（拳銃）",
        {
          skillName: "射撃（拳銃）",
          baseSkill: "射撃",
          specialization: "拳銃",
          source: "experience",
          before: 45,
          after: 50,
          growth: { total: 5, text: "(1D10) ＞ 5" },
          transferBonus: 0,
        },
      ],
      [
        "聞き耳",
        {
          skillName: "聞き耳",
          baseSkill: "聞き耳",
          source: "experience",
          before: 50,
          after: 50,
          check: { roll: { total: 80, text: "(1D100) ＞ 80" }, passed: true },
          transferBonus: 0,
        },
      ],
      [
        "心理学",
        {
          skillName: "心理学",
          baseSkill: "心理学",
          source: "experience",
          before: 50,
          after: 50,
          transferBonus: 0,
        },
      ],
      [
        "射撃（ライフル）",
        {
          skillName: "射撃（ライフル）",
          baseSkill: "射撃",
          specialization: "ライフル",
          source: "transfer",
          before: 20,
          after: 30,
          transferBonus: 10,
        },
      ],
    ]);

    const text = formatCharacterExport(charB, growths);
    expect(text).toBe(
      [
        "【白石 透】",
        "・射撃（拳銃）: +5% (45% → 50%)",
        "・聞き耳: 1D100=80 [成長]",
        "・心理学",
        "・射撃（ライフル）: +10% 波及 (20% → 30%)",
      ].join("\n"),
    );
  });

  test("formatAllExport は全員分を空行区切りでまとめる", () => {
    const charB: CharacterCandidates = {
      characterName: "霧島 玲",
      candidates: [{ skillName: "医学", baseSkill: "医学", skillValue: 75 }],
      knownSkills: [],
    };
    const all = formatAllExport([charA, charB], new Map());
    expect(all).toContain("【橘 悠真】");
    expect(all).toContain("\n\n【霧島 玲】");
  });
});
