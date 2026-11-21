import { describe, expect, test } from "vite-plus/test";

import type { DiceRoller } from "../dice/types.ts";
import { type GrowthSettings, defaultGrowthSettings } from "../settings.ts";
import type { CharacterCandidates, SkillEntry } from "./collectCandidates.ts";
import {
  getTransferGroup,
  isTransferableSkill,
  rollExperienceChecks,
  rollGrowth,
  rollGrowthDices,
  rollSanityRecoveries,
  rollSingleExperienceCheck,
  rollSingleGrowthDice,
  rollSingleSanityRecovery,
  rollSingleSkill,
} from "./rollGrowth.ts";

function scripted(results: Record<string, number[]>): DiceRoller & { calls: string[] } {
  const calls: string[] = [];
  return {
    calls,
    roll(expression) {
      calls.push(expression);
      const total = results[expression]?.shift();
      if (total === undefined) throw new Error(`unexpected roll: ${expression}`);
      return { total, text: `(${expression}) ＞ ${total}` };
    },
  };
}

const skill = (skillName: string, skillValue: number): SkillEntry => {
  const m = /^(.+)（(.+)）$/.exec(skillName);
  return m
    ? { skillName, baseSkill: m[1] as string, specialization: m[2] as string, skillValue }
    : { skillName, baseSkill: skillName, skillValue };
};

const character = (candidates: SkillEntry[], others: SkillEntry[] = []): CharacterCandidates => ({
  characterName: "A",
  candidates,
  knownSkills: [...candidates, ...others],
});

const settings7 = (overrides: Partial<GrowthSettings> = {}) => ({
  ...defaultGrowthSettings(7),
  ...overrides,
});
const settings6 = (overrides: Partial<GrowthSettings> = {}) => ({
  ...defaultGrowthSettings(6),
  ...overrides,
});

describe("defaultGrowthSettings", () => {
  test("公式ルールの既定値。90%到達のSAN回復は7版のみ", () => {
    expect(defaultGrowthSettings(7)).toEqual({
      experienceCheck: true,
      growthDice: "1D10",
      sanityRecoveryAt90: true,
      transferableSkills: false,
    });
    expect(defaultGrowthSettings(6).sanityRecoveryAt90).toBe(false);
  });
});

describe("rollGrowth: 経験チェック", () => {
  test("1D100 が技能値を上回れば成長値ロールを加算する", () => {
    const dice = scripted({ "1D100": [51], "1D10": [5] });

    expect(rollGrowth(character([skill("目星", 50)]), settings7(), 7, dice)).toEqual([
      {
        skillName: "目星",
        baseSkill: "目星",
        source: "experience",
        before: 50,
        after: 55,
        check: { roll: { total: 51, text: "(1D100) ＞ 51" }, passed: true },
        growth: { total: 5, text: "(1D10) ＞ 5" },
        transferBonus: 0,
      },
    ]);
  });

  test("1D100 が技能値以下なら成長しない", () => {
    const dice = scripted({ "1D100": [50] });
    const [growth] = rollGrowth(character([skill("目星", 50)]), settings7(), 7, dice);

    expect(growth).toMatchObject({ before: 50, after: 50, check: { passed: false } });
    expect(growth).not.toHaveProperty("growth");
    expect(dice.calls).toEqual(["1D100"]);
  });

  test("7版は 96 以上なら技能値を上回らなくても成長する", () => {
    expect(
      rollGrowth(
        character([skill("目星", 97)]),
        settings7(),
        7,
        scripted({ "1D100": [96], "1D10": [1] }),
      )[0],
    ).toMatchObject({ after: 98, check: { passed: true } });
    expect(
      rollGrowth(character([skill("目星", 97)]), settings7(), 7, scripted({ "1D100": [95] }))[0],
    ).toMatchObject({ after: 97, check: { passed: false } });
  });

  test("6版は 96 以上でも技能値を上回らなければ成長しない", () => {
    expect(
      rollGrowth(character([skill("目星", 97)]), settings6(), 6, scripted({ "1D100": [96] }))[0],
    ).toMatchObject({
      after: 97,
      check: { passed: false },
    });
    expect(
      rollGrowth(
        character([skill("目星", 97)]),
        settings6(),
        6,
        scripted({ "1D100": [98], "1D10": [2] }),
      )[0],
    ).toMatchObject({ after: 99, check: { passed: true } });
  });

  test("経験チェックOFFなら 1D100 を振らずに無条件で成長する", () => {
    const dice = scripted({ "1D10": [4] });
    const [growth] = rollGrowth(
      character([skill("目星", 50)]),
      settings7({ experienceCheck: false }),
      7,
      dice,
    );

    expect(growth).toMatchObject({ after: 54 });
    expect(growth).not.toHaveProperty("check");
    expect(dice.calls).toEqual(["1D10"]);
  });

  test("成長値ロールの式を差し替えられる", () => {
    const dice = scripted({ "1D100": [99], "1D6": [6] });

    expect(
      rollGrowth(character([skill("目星", 50)]), settings7({ growthDice: "1D6" }), 7, dice)[0]
        ?.after,
    ).toBe(56);
  });

  test("候補ごとに独立して判定する", () => {
    const dice = scripted({ "1D100": [99, 10], "1D10": [3] });
    const growths = rollGrowth(
      character([skill("目星", 50), skill("聞き耳", 40)]),
      settings7(),
      7,
      dice,
    );

    expect(growths.map((g) => [g.skillName, g.after])).toEqual([
      ["目星", 53],
      ["聞き耳", 40],
    ]);
  });
});

describe("rollGrowth: 90%到達時のSAN回復", () => {
  test("90 未満 → 90 以上になったら 2D6 を振る", () => {
    const dice = scripted({ "1D100": [99], "1D10": [7], "2D6": [8] });
    const [growth] = rollGrowth(character([skill("目星", 85)]), settings7(), 7, dice);

    expect(growth).toMatchObject({ after: 92, sanityRecovery: { total: 8, text: "(2D6) ＞ 8" } });
  });

  test("ちょうど 90 に到達しても回復する", () => {
    const dice = scripted({ "1D100": [99], "1D10": [5], "2D6": [3] });

    expect(
      rollGrowth(character([skill("目星", 85)]), settings7(), 7, dice)[0]?.sanityRecovery?.total,
    ).toBe(3);
  });

  test("90 に届かない・元から 90 以上・ルールOFF のときは振らない", () => {
    const cases: [number, GrowthSettings][] = [
      [80, settings7()],
      [90, settings7()],
      [85, settings7({ sanityRecoveryAt90: false })],
    ];
    for (const [value, s] of cases) {
      const dice = scripted({ "1D100": [99], "1D10": [9] });
      expect(rollGrowth(character([skill("目星", value)]), s, 7, dice)[0]).not.toHaveProperty(
        "sanityRecovery",
      );
      expect(dice.calls).not.toContain("2D6");
    }
  });

  test("幸運は技能ではないため 90 以上に達しても SAN 回復は振らない", () => {
    const dice = scripted({ "1D100": [99], "1D10": [7] });
    const [growth] = rollGrowth(character([skill("幸運", 85)]), settings7(), 7, dice);

    expect(growth).toMatchObject({ after: 92 });
    expect(growth).not.toHaveProperty("sanityRecovery");
    expect(dice.calls).not.toContain("2D6");
  });
});

describe("rollGrowth: 専門分野：転換可能な技能", () => {
  const melee = (
    base: number,
    others: SkillEntry[],
    growth: number,
    s = settings7({ transferableSkills: true }),
  ) =>
    rollGrowth(
      character([skill("近接戦闘（格闘）", base)], others),
      { ...s, experienceCheck: false, growthDice: String(growth) },
      7,
      scripted({ [String(growth)]: [growth], "2D6": [1] }),
    );

  test("ルールOFFなら関連技能は上がらない", () => {
    expect(melee(45, [skill("近接戦闘（キック）", 30)], 5, settings7())).toHaveLength(1);
  });

  test("初めて 50 以上になったら同系統の他の専門技能が +10 される", () => {
    const growths = melee(
      45,
      [skill("近接戦闘（キック）", 30), skill("目星", 30), skill("射撃（拳銃）", 30)],
      5,
    );

    expect(growths).toEqual([
      expect.objectContaining({
        skillName: "近接戦闘（格闘）",
        before: 45,
        after: 50,
        transferBonus: 0,
      }),
      {
        skillName: "近接戦闘（キック）",
        baseSkill: "近接戦闘",
        specialization: "キック",
        source: "transfer",
        before: 30,
        after: 40,
        transferBonus: 10,
      },
    ]);
  });

  test("初めて 90 以上になったらさらに +10 される", () => {
    const growths = melee(85, [skill("近接戦闘（キック）", 30)], 5);

    expect(growths[1]).toMatchObject({ before: 30, after: 40, transferBonus: 10 });
  });

  test("50 と 90 を同時に越えたら +20 される", () => {
    expect(melee(45, [skill("近接戦闘（キック）", 30)], 50)[1]).toMatchObject({
      after: 50,
      transferBonus: 20,
    });
  });

  test("波及による上昇は 90 が上限で、すでに 90 以上の技能は変化しない", () => {
    const growths = melee(
      45,
      [skill("近接戦闘（キック）", 85), skill("近接戦闘（ナイフ）", 95)],
      5,
    );

    expect(growths).toHaveLength(2);
    expect(growths[1]).toMatchObject({
      skillName: "近接戦闘（キック）",
      after: 90,
      transferBonus: 5,
    });
  });

  test("元から 50 以上の技能が伸びても波及しない", () => {
    expect(melee(50, [skill("近接戦闘（キック）", 30)], 5)).toHaveLength(1);
  });

  test("同系統の成長候補が波及を受けると、その経験成長の結果に加算する", () => {
    const growths = rollGrowth(
      character([skill("射撃（拳銃）", 45), skill("射撃（ライフル）", 20)]),
      settings7({ transferableSkills: true }),
      7,
      scripted({ "1D100": [99, 99], "1D10": [6, 2] }),
    );

    expect(growths).toEqual([
      expect.objectContaining({ skillName: "射撃（拳銃）", after: 51, transferBonus: 0 }),
      expect.objectContaining({
        skillName: "射撃（ライフル）",
        before: 20,
        after: 32,
        transferBonus: 10,
      }),
    ]);
  });

  test("同じ系統で複数の技能が同時に 50 を越えても波及は1回で、越えた技能同士には波及しない", () => {
    const growths = rollGrowth(
      character(
        [skill("射撃（拳銃）", 45), skill("射撃（ライフル）", 48)],
        [skill("射撃（散弾銃）", 20)],
      ),
      settings7({ transferableSkills: true, experienceCheck: false, growthDice: "5" }),
      7,
      scripted({ "5": [5, 5] }),
    );

    expect(growths.map((g) => [g.skillName, g.after, g.transferBonus])).toEqual([
      ["射撃（拳銃）", 50, 0],
      ["射撃（ライフル）", 53, 0],
      ["射撃（散弾銃）", 30, 10],
    ]);
  });

  test("言語と母国語は同じ系統として扱う", () => {
    const growths = rollGrowth(
      character(
        [skill("言語（英語）", 45)],
        [skill("母国語（日本語）", 60), skill("サバイバル（山）", 10)],
      ),
      settings7({ transferableSkills: true, experienceCheck: false, growthDice: "5" }),
      7,
      scripted({ "5": [5] }),
    );

    expect(growths.map((g) => [g.skillName, g.after])).toEqual([
      ["言語（英語）", 50],
      ["母国語（日本語）", 70],
    ]);
  });

  test("サバイバルも対象", () => {
    const growths = rollGrowth(
      character([skill("サバイバル（山）", 45)], [skill("サバイバル（海）", 10)]),
      settings7({ transferableSkills: true, experienceCheck: false, growthDice: "5" }),
      7,
      scripted({ "5": [5] }),
    );

    expect(growths[1]).toMatchObject({ skillName: "サバイバル（海）", after: 20 });
  });

  test("科学・芸術/製作・操縦など対象外の系統や、専門分野のない技能には波及しない", () => {
    const s = settings7({ transferableSkills: true, experienceCheck: false, growthDice: "5" });
    for (const [trigger, other] of [
      ["科学（化学）", "科学（物理学）"],
      ["芸術/製作（絵画）", "芸術/製作（写真）"],
      ["操縦（航空機）", "操縦（船舶）"],
      ["射撃", "射撃（拳銃）"],
    ] as const) {
      expect(
        rollGrowth(
          character([skill(trigger, 45)], [skill(other, 10)]),
          s,
          7,
          scripted({ "5": [5] }),
        ),
      ).toHaveLength(1);
    }
  });

  test("波及で 90 に到達してもSAN回復は振らない", () => {
    const growths = rollGrowth(
      character([skill("射撃（拳銃）", 45)], [skill("射撃（ライフル）", 85)]),
      settings7({ transferableSkills: true, experienceCheck: false, growthDice: "5" }),
      7,
      scripted({ "5": [5] }),
    );

    expect(growths[1]).not.toHaveProperty("sanityRecovery");
  });

  test("isTransferableSkill と getTransferGroup の判定", () => {
    expect(isTransferableSkill(skill("近接戦闘（格闘）", 50))).toBe(true);
    expect(getTransferGroup(skill("近接戦闘（格闘）", 50))).toBe("近接戦闘");
    expect(isTransferableSkill(skill("射撃（拳銃）", 50))).toBe(true);
    expect(getTransferGroup(skill("射撃（拳銃）", 50))).toBe("射撃");
    expect(isTransferableSkill(skill("科学（物理学）", 50))).toBe(false);
    expect(getTransferGroup(skill("科学（物理学）", 50))).toBeUndefined();
    expect(isTransferableSkill(skill("目星", 50))).toBe(false);
    expect(getTransferGroup(skill("目星", 50))).toBeUndefined();
  });

  describe("段階的ダイスロール（ステップ別実行）", () => {
    test("rollExperienceChecks: 経験チェックOFFなら 1D100 を振らない", () => {
      const dice = scripted({});
      const checks = rollExperienceChecks(
        character([skill("目星", 50)]),
        settings7({ experienceCheck: false }),
        7,
        dice,
      );
      expect(checks[0]?.check).toBeUndefined();
      expect(dice.calls).toHaveLength(0);
    });

    test("rollGrowthDices: currentGrowths に前エントリがない場合でも振れる", () => {
      const dice = scripted({ "1D10": [4, 6] });
      const char = character([skill("目星", 50), skill("近接戦闘（格闘）", 40)]);
      const growths = rollGrowthDices(char, settings7({ experienceCheck: false }), dice, new Map());
      expect(growths[0]?.after).toBe(54);
      expect(growths[1]?.after).toBe(46);
    });

    test("rollSanityRecoveries: 90到達でなければそのまま返す", () => {
      const dice = scripted({});
      const map = new Map([
        [
          "目星",
          {
            skillName: "目星",
            baseSkill: "目星",
            source: "experience" as const,
            before: 50,
            after: 55,
            transferBonus: 0,
          },
        ],
      ]);
      const res = rollSanityRecoveries(settings7(), dice, map);
      expect(res[0]?.sanityRecovery).toBeUndefined();
      expect(dice.calls).toHaveLength(0);
    });
  });

  describe("技能ごとの個別ダイスロール", () => {
    test("rollSingleExperienceCheck: 対象技能のみチェックし他技能を保持する", () => {
      const char = character([skill("目星", 50), skill("聞き耳", 40), skill("図書館", 60)]);
      const initial = new Map([
        [
          "聞き耳",
          {
            skillName: "聞き耳",
            baseSkill: "聞き耳",
            source: "experience" as const,
            before: 40,
            after: 45,
            check: { roll: { total: 80, text: "(1D100) ＞ 80" }, passed: true },
            growth: { total: 5, text: "(1D10) ＞ 5" },
            transferBonus: 0,
          },
        ],
        [
          "図書館",
          {
            skillName: "図書館",
            baseSkill: "図書館",
            source: "experience" as const,
            before: 60,
            after: 60,
            check: { roll: { total: 30, text: "(1D100) ＞ 30" }, passed: false },
            transferBonus: 0,
          },
        ],
      ]);
      const res = rollSingleExperienceCheck(
        char,
        "目星",
        settings7(),
        7,
        scripted({ "1D100": [90] }),
        initial,
      );
      expect(res.find((g) => g.skillName === "目星")?.check?.passed).toBe(true);
      expect(res.find((g) => g.skillName === "聞き耳")?.after).toBe(45);
      expect(res.find((g) => g.skillName === "図書館")?.after).toBe(60);
    });

    test("rollSingleExperienceCheck: 存在しない技能名の場合は現状を維持する", () => {
      const char = character([skill("目星", 50)]);
      const res = rollSingleExperienceCheck(
        char,
        "図書館",
        settings7(),
        7,
        scripted({}),
        new Map(),
      );
      expect(res).toEqual([]);
    });

    test("rollSingleGrowthDice & rollSingleSanityRecovery: 個別に成長とSAN回復を振る", () => {
      const char = character([skill("目星", 85), skill("聞き耳", 40)]);
      const checked = rollSingleExperienceCheck(
        char,
        "目星",
        settings7(),
        7,
        scripted({ "1D100": [95] }),
        new Map(),
      );
      const checkMap = new Map(checked.map((g) => [g.skillName, g]));
      const grown = rollSingleGrowthDice(
        char,
        "目星",
        settings7(),
        scripted({ "1D10": [6] }),
        checkMap,
      );
      expect(grown[0]?.after).toBe(91);

      const grownMap = new Map(grown.map((g) => [g.skillName, g]));
      const san = rollSingleSanityRecovery("目星", settings7(), scripted({ "2D6": [7] }), grownMap);
      expect(san[0]?.sanityRecovery?.total).toBe(7);

      const sanUnchanged = rollSingleSanityRecovery("聞き耳", settings7(), scripted({}), grownMap);
      expect(sanUnchanged[0]?.sanityRecovery).toBeUndefined();
    });

    test("rollSingleGrowthDice: 転換可能技能の波及ボーナスを再計算する", () => {
      const char = character(
        [skill("射撃（拳銃）", 45), skill("射撃（ライフル）", 20)],
        [skill("射撃（散弾銃）", 30)],
      );
      const initial = new Map([
        [
          "射撃（散弾銃）",
          {
            skillName: "射撃（散弾銃）",
            baseSkill: "射撃",
            specialization: "散弾銃",
            source: "transfer" as const,
            before: 30,
            after: 40,
            transferBonus: 10,
          },
        ],
        [
          "射撃（ライフル）",
          {
            skillName: "射撃（ライフル）",
            baseSkill: "射撃",
            specialization: "ライフル",
            source: "experience" as const,
            before: 20,
            after: 35,
            growth: { total: 5, text: "(1D10) ＞ 5" },
            transferBonus: 10,
          },
        ],
      ]);
      const res = rollSingleGrowthDice(
        char,
        "射撃（拳銃）",
        settings7({ experienceCheck: false, transferableSkills: true }),
        scripted({ "1D10": [5] }),
        initial,
      );
      expect(res.find((g) => g.skillName === "射撃（拳銃）")?.after).toBe(50);
      expect(res.find((g) => g.skillName === "射撃（ライフル）")?.after).toBe(35);
      expect(res.find((g) => g.skillName === "射撃（散弾銃）")?.after).toBe(40);
    });

    test("rollSingleSkill: 1技能の全ステップを一括ロールする", () => {
      const char = character([skill("目星", 85), skill("聞き耳", 40)]);
      const res = rollSingleSkill(
        char,
        "目星",
        settings7(),
        7,
        scripted({ "1D100": [99], "1D10": [6], "2D6": [5] }),
        new Map(),
      );
      expect(res[0]).toMatchObject({
        skillName: "目星",
        before: 85,
        after: 91,
        check: { passed: true },
        growth: { total: 6 },
        sanityRecovery: { total: 5 },
      });
    });
  });
});
