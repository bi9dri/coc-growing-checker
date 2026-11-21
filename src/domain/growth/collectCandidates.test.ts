import { describe, expect, test } from "vite-plus/test";

import type { SkillRoll } from "../roll/types.ts";
import { type CheckSettings, DEFAULT_CHECK_SETTINGS } from "../settings.ts";
import { collectCandidates, inferEdition } from "./collectCandidates.ts";

const roll = (overrides: Partial<SkillRoll> = {}): SkillRoll => ({
  channel: "main",
  characterName: "A",
  skillName: "目星",
  baseSkill: "目星",
  skillValue: 50,
  outcome: "regular",
  edition: 7,
  category: "skill",
  secret: false,
  ...overrides,
});

const baseExclude = { ...DEFAULT_CHECK_SETTINGS.exclude, luck: true };

const settings = (overrides: Partial<CheckSettings> = {}): CheckSettings => ({
  ...DEFAULT_CHECK_SETTINGS,
  exclude: baseExclude,
  ...overrides,
});

describe("collectCandidates", () => {
  test("成功した技能をキャラクターごとに成長候補として集める", () => {
    const result = collectCandidates(
      [
        roll(),
        roll({ characterName: "B", skillName: "聞き耳", baseSkill: "聞き耳", skillValue: 40 }),
      ],
      settings(),
    );

    expect(result).toEqual([
      {
        characterName: "A",
        candidates: [{ skillName: "目星", baseSkill: "目星", skillValue: 50 }],
        knownSkills: [{ skillName: "目星", baseSkill: "目星", skillValue: 50 }],
      },
      {
        characterName: "B",
        candidates: [{ skillName: "聞き耳", baseSkill: "聞き耳", skillValue: 40 }],
        knownSkills: [{ skillName: "聞き耳", baseSkill: "聞き耳", skillValue: 40 }],
      },
    ]);
  });

  test("同じ技能を何度成功しても候補は1つ", () => {
    const [a] = collectCandidates([roll(), roll(), roll({ outcome: "hard" })], settings());

    expect(a?.candidates).toHaveLength(1);
  });

  test("技能値はその技能の最後のロールの素の値を採用する（失敗ロールも含む）", () => {
    const [a] = collectCandidates(
      [roll({ skillValue: 50 }), roll({ skillValue: 55, outcome: "failure" })],
      settings(),
    );

    expect(a?.candidates[0]?.skillValue).toBe(55);
  });

  test("対象外チャンネルのロールも技能値の把握には使う", () => {
    const [a] = collectCandidates(
      [roll({ skillValue: 50 }), roll({ skillValue: 60, channel: "other" })],
      settings(),
    );

    expect(a?.candidates[0]?.skillValue).toBe(60);
  });

  test("成長対象外の判定結果だけの技能は候補にならない", () => {
    const [a] = collectCandidates(
      [roll({ outcome: "failure" }), roll({ outcome: "fumble" })],
      settings(),
    );

    expect(a?.candidates).toEqual([]);
    expect(a?.knownSkills).toHaveLength(1);
  });

  test("判定結果の条件を変えればファンブル・失敗も候補にできる", () => {
    const [a] = collectCandidates(
      [roll({ outcome: "fumble" })],
      settings({ eligibleOutcomes: ["fumble"] }),
    );

    expect(a?.candidates).toHaveLength(1);
  });

  test("対象チャンネル以外の成功は候補にならず、チャンネルを追加すれば候補になる", () => {
    const rolls = [roll({ channel: "other" })];

    expect(collectCandidates(rolls, settings())[0]?.candidates).toEqual([]);
    expect(
      collectCandidates(rolls, settings({ channels: ["main", "other"] }))[0]?.candidates,
    ).toHaveLength(1);
  });

  test.each(["sanity", "characteristic", "mythos", "creditRating"] as const)(
    "%s はデフォルトで除外し、トグルで含められる",
    (category) => {
      const rolls = [roll({ category, skillName: "X", baseSkill: "X" })];

      expect(collectCandidates(rolls, settings())[0]?.candidates).toEqual([]);
      expect(
        collectCandidates(rolls, settings({ exclude: { ...baseExclude, [category]: false } }))[0]
          ?.candidates,
      ).toHaveLength(1);
    },
  );

  test("幸運はデフォルトで無条件回復がONになり、除外設定でOFFにできる", () => {
    const rolls = [roll({ skillName: "目星", baseSkill: "目星" })];
    expect(
      collectCandidates(rolls, DEFAULT_CHECK_SETTINGS)[0]?.candidates.map((c) => c.skillName),
    ).toEqual(["目星", "幸運"]);
    expect(
      collectCandidates(
        rolls,
        settings({ exclude: { ...DEFAULT_CHECK_SETTINGS.exclude, luck: true } }),
      )[0]?.candidates.map((c) => c.skillName),
    ).toEqual(["目星"]);
  });

  test("幸運を無条件成長にする設定なら、失敗したロールでも候補に含める", () => {
    const rolls = [
      roll({ category: "luck", skillName: "幸運", baseSkill: "幸運", outcome: "failure" }),
    ];
    const s = settings({
      exclude: { ...DEFAULT_CHECK_SETTINGS.exclude, luck: false },
      luckCandidateCondition: "unconditional",
    });

    expect(collectCandidates(rolls, s)[0]?.candidates).toHaveLength(1);
  });

  test("幸運が条件付き設定なら、失敗ロールは候補に含まれない", () => {
    const rolls = [
      roll({ category: "luck", skillName: "幸運", baseSkill: "幸運", outcome: "failure" }),
    ];
    const s = settings({
      exclude: { ...DEFAULT_CHECK_SETTINGS.exclude, luck: false },
      luckCandidateCondition: "outcome",
    });

    expect(collectCandidates(rolls, s)[0]?.candidates).toEqual([]);
  });

  test("幸運設定が all の場合、ログに幸運ロールがなくても全キャラに幸運が追加される", () => {
    const rolls = [roll({ skillName: "目星", baseSkill: "目星" })];
    const s = settings({
      exclude: { ...DEFAULT_CHECK_SETTINGS.exclude, luck: false },
      luckCandidateCondition: "all",
    });
    const [a] = collectCandidates(rolls, s);

    expect(a?.candidates.map((c) => c.skillName)).toEqual(["目星", "幸運"]);
    expect(a?.candidates.find((c) => c.skillName === "幸運")?.skillValue).toBe(50);
  });

  test("幸運設定が all でログに幸運がある場合はその値を採用する", () => {
    const rolls = [
      roll({ skillName: "目星", baseSkill: "目星" }),
      roll({
        category: "luck",
        skillName: "幸運",
        baseSkill: "幸運",
        skillValue: 65,
        outcome: "failure",
      }),
    ];
    const s = settings({
      exclude: { ...DEFAULT_CHECK_SETTINGS.exclude, luck: false },
      luckCandidateCondition: "all",
    });
    const [a] = collectCandidates(rolls, s);

    expect(a?.candidates.find((c) => c.skillName === "幸運")?.skillValue).toBe(65);
  });

  test("シークレットダイスはデフォルトで除外し、トグルで含められる", () => {
    const rolls = [roll({ secret: true })];

    expect(collectCandidates(rolls, settings())[0]?.candidates).toEqual([]);
    expect(
      collectCandidates(rolls, settings({ exclude: { ...baseExclude, secret: false } }))[0]
        ?.candidates,
    ).toHaveLength(1);
  });

  test("除外カテゴリの技能は knownSkills にも含めない", () => {
    const [a] = collectCandidates(
      [roll({ category: "sanity", skillName: "SAN", baseSkill: "SAN" })],
      settings(),
    );

    expect(a?.knownSkills).toEqual([]);
  });

  test("専門分野を保持する", () => {
    const [a] = collectCandidates(
      [roll({ skillName: "近接戦闘（格闘）", baseSkill: "近接戦闘", specialization: "格闘" })],
      settings(),
    );

    expect(a?.candidates[0]).toEqual({
      skillName: "近接戦闘（格闘）",
      baseSkill: "近接戦闘",
      specialization: "格闘",
      skillValue: 50,
    });
  });

  test("キャラクター・技能は初出順に並べる", () => {
    const result = collectCandidates(
      [
        roll({ characterName: "B", skillName: "聞き耳", baseSkill: "聞き耳" }),
        roll({ characterName: "A" }),
        roll({ characterName: "B" }),
      ],
      settings(),
    );

    expect(result.map((c) => c.characterName)).toEqual(["B", "A"]);
    expect(result[0]?.candidates.map((c) => c.skillName)).toEqual(["聞き耳", "目星"]);
  });
});

describe("inferEdition", () => {
  test("多数派の版を返す", () => {
    expect(inferEdition([roll({ edition: 6 }), roll({ edition: 6 }), roll({ edition: 7 })])).toBe(
      6,
    );
    expect(inferEdition([roll({ edition: 6 }), roll({ edition: 7 }), roll({ edition: 7 })])).toBe(
      7,
    );
  });

  test("同数・ロールなしは7版", () => {
    expect(inferEdition([roll({ edition: 6 }), roll({ edition: 7 })])).toBe(7);
    expect(inferEdition([])).toBe(7);
  });
});
