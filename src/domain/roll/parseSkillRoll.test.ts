import { describe, expect, test } from "vite-plus/test";

import type { ChatMessage } from "../log/types.ts";
import { parseSkillRoll } from "./parseSkillRoll.ts";

const R7 = (n: number, outcome: string, bp = 0) =>
  `(1D100<=${n}) ボーナス・ペナルティダイス[${bp}] ＞ 23 ＞ 23 ＞ ${outcome}`;
const R6 = (n: number, outcome: string) => `(1D100<=${n}) ＞ 23 ＞ ${outcome}`;

const msg = (text: string, rollResult: string | null = R7(70, "ハード成功")): ChatMessage => ({
  channel: "main",
  characterName: "探索者",
  text,
  ...(rollResult === null ? {} : { rollResult }),
});

describe("parseSkillRoll: 基本", () => {
  test("7版の技能ロールを分解する", () => {
    expect(parseSkillRoll(msg("CC<=70 【目星】"))).toEqual({
      channel: "main",
      characterName: "探索者",
      skillName: "目星",
      baseSkill: "目星",
      skillValue: 70,
      outcome: "hard",
      edition: 7,
      category: "skill",
      secret: false,
    });
  });

  test("BCDice出力がない発言は null", () => {
    expect(parseSkillRoll(msg("CC<=70 【目星】", null))).toBeNull();
  });

  test("CC 系コマンドでないロールは null（素振り・ダメージ・狂気表）", () => {
    expect(parseSkillRoll(msg("1D100", "(1D100) ＞ 23"))).toBeNull();
    expect(parseSkillRoll(msg("1D6+1D4 【ダメージ判定】", "(1D6+1D4) ＞ 5"))).toBeNull();
    expect(parseSkillRoll(msg("BMR", "(1D100<=70) ＞ 1 ＞ 成功"))).toBeNull();
  });

  test("技能名のない CC ロールは null", () => {
    expect(parseSkillRoll(msg("CC<=70"))).toBeNull();
    expect(parseSkillRoll(msg("CC<=70 【】"))).toBeNull();
  });

  test("判定結果が読み取れない出力は null", () => {
    expect(parseSkillRoll(msg("CC<=70 目星", "(1D100<=70) ＞ 23 ＞ ???"))).toBeNull();
    expect(parseSkillRoll(msg("CCB<=70 目星", "(1D100<=70) ＞ 23 ＞ ???"))).toBeNull();
  });
});

describe("parseSkillRoll: コマンドの表記揺れ", () => {
  test.each([
    ["CCB<=70 目星", 70],
    ["CC+1<=45 【魅惑】", 45],
    ["CC-1<=65 【魅惑】", 65],
    ["CC1<=20 【射撃】", 20],
    ["cc<=33 目星", 33],
    ["ＣＣ＜＝７０　目星", 70],
  ])("%s → 技能値 %i", (text, value) => {
    expect(parseSkillRoll(msg(text))?.skillValue).toBe(value);
  });

  test.each([
    ["CC<=70+10 【目星】", 70],
    ["CC<=70-20 【目星】", 70],
    ["CC<=70/2 【目星】", 70],
    ["CC<=70*2 【目星】", 70],
    ["CC<=70+10-5 【目星】", 70],
  ])("一時補正 %s は素の値 %i を採用する", (text, value) => {
    expect(parseSkillRoll(msg(text))?.skillValue).toBe(value);
  });

  test("シークレットダイスを判別する", () => {
    expect(parseSkillRoll(msg("sCC<=20 【目星】"))?.secret).toBe(true);
    expect(parseSkillRoll(msg("SCCB<=20 【目星】"))?.secret).toBe(true);
  });
});

describe("parseSkillRoll: 技能名の表記揺れ", () => {
  test.each([
    "CC<=50 【目星】",
    "CC<=50 〈目星〉",
    "CC<=50 [目星]",
    "CC<=50 (目星)",
    "CC<=50 （目星）",
    "CC<=50 《目星》",
    "CC<=50 「目星」",
    "CC<=50 『目星』",
    "CC<=50 目星",
    "CC<=50　【目星】",
    "CC<=50 目星 ちらっと見る",
    "CC<=50 【目星】 ちらっと見る",
  ])("%s → 目星", (text) => {
    expect(parseSkillRoll(msg(text))?.skillName).toBe("目星");
  });

  test.each([
    ["CC<=70 【近接戦闘（除霊）】", "近接戦闘", "除霊"],
    ["CC<=70 【近接戦闘(ケンカ)】", "近接戦闘", "ケンカ"],
    ["CC<=70 (近接戦闘(キック))", "近接戦闘", "キック"],
    ["CC<=70 近接戦闘（格闘）", "近接戦闘", "格闘"],
    ["CC<=65 【芸術/製作（モデルポーズ）】", "芸術/製作", "モデルポーズ"],
    ["CC<=65 【芸術／製作（たいま）】", "芸術/製作", "たいま"],
  ])("%s → 親技能 %s / 専門分野 %s", (text, baseSkill, specialization) => {
    const roll = parseSkillRoll(msg(text));
    expect(roll).toMatchObject({ baseSkill, specialization });
    expect(roll?.skillName).toBe(`${baseSkill}（${specialization}）`);
  });

  test("閉じ括弧が欠けていても先頭の括弧だけ外して読む", () => {
    expect(parseSkillRoll(msg("CC<=50 【目星"))?.skillName).toBe("目星");
  });

  test("専門分野を持たない技能は specialization を持たない", () => {
    expect(parseSkillRoll(msg("CC<=50 【射撃】"))).not.toHaveProperty("specialization");
  });
});

describe("parseSkillRoll: 判定結果と版の推定", () => {
  test.each([
    ["クリティカル", "critical"],
    ["イクストリーム成功", "extreme"],
    ["ハード成功", "hard"],
    ["レギュラー成功", "regular"],
    ["失敗", "failure"],
    ["ファンブル", "fumble"],
  ])("7版: %s → %s", (label, outcome) => {
    expect(parseSkillRoll(msg("CC<=50 目星", R7(50, label)))).toMatchObject({
      outcome,
      edition: 7,
    });
  });

  test.each([
    ["決定的成功/スペシャル", "critical"],
    ["決定的成功", "critical"],
    ["スペシャル", "special"],
    ["成功", "regular"],
    ["失敗", "failure"],
    ["致命的失敗", "fumble"],
  ])("6版: %s → %s", (label, outcome) => {
    expect(parseSkillRoll(msg("CC<=50 目星", R6(50, label)))).toMatchObject({
      outcome,
      edition: 6,
    });
  });

  test("ボーナス・ペナルティダイス付きの7版失敗も7版と判定する", () => {
    expect(parseSkillRoll(msg("CC+1<=45 魅惑", R7(45, "失敗", 1)))?.edition).toBe(7);
  });

  test("CCB コマンドは6版", () => {
    expect(parseSkillRoll(msg("CCB<=50 目星", R6(50, "失敗")))?.edition).toBe(6);
  });
});

describe("parseSkillRoll: 技能の分類", () => {
  test.each(["正気度ロール", "正気度", "SAN", "san", "SANチェック", "SANC", "SAN値チェック"])(
    "%s は sanity",
    (name) => {
      expect(parseSkillRoll(msg(`CC<=70 【${name}】`))?.category).toBe("sanity");
    },
  );

  test.each([
    "STR",
    "CON",
    "POW",
    "DEX",
    "APP",
    "SIZ",
    "INT",
    "EDU",
    "アイデア",
    "知識",
    "int",
    "POW×5",
    "POW*5",
    "DEX×5",
    "DEX*5",
    "DEXx5",
    "DEXX5",
    "DEX × 5",
    "DEX * 5",
    "DEX x 5",
    "DEX✕5",
    "DEX✖5",
    "DEX×5倍",
    "DEX×5ロール",
    "DEX×5判定",
    "DEX×5 ロール",
    "DEXロール",
    "DEX×5/2",
    "DEX×5-10",
    "DEX/2",
    "STR×5",
    "CON×5",
    "APP×5",
    "SIZ×5",
    "INT×5",
    "EDU×5",
  ])("%s は characteristic", (name) => {
    expect(parseSkillRoll(msg(`CC<=70 【${name}】`))?.category).toBe("characteristic");
    expect(parseSkillRoll(msg(`CCB<=70 【${name}】`, R6(70, "成功")))?.category).toBe(
      "characteristic",
    );
  });

  test.each(["幸運", "LUCK", "Luck"])("%s は luck", (name) => {
    expect(parseSkillRoll(msg(`CC<=70 【${name}】`))?.category).toBe("luck");
  });

  test.each(["クトゥルフ神話", "神話技能", "Cthulhu Mythos", "Mythos"])("%s は mythos", (name) => {
    expect(parseSkillRoll(msg(`CC<=10 【${name}】`))?.category).toBe("mythos");
  });

  test.each(["信用", "Credit Rating"])("%s は creditRating", (name) => {
    expect(parseSkillRoll(msg(`CC<=50 【${name}】`))?.category).toBe("creditRating");
  });

  test("それ以外は skill", () => {
    expect(parseSkillRoll(msg("CC<=70 【図書館】"))?.category).toBe("skill");
    expect(parseSkillRoll(msg("CC<=70 【INTUITION】"))?.category).toBe("skill");
  });
});

describe("parseSkillRoll: 矢印区切り・英語ダイス結果・Charaeno表記", () => {
  test.each([
    ["CC<=50 目星", "(1D100<=50) → 46 → Special", "special", 6],
    ["CC<=50 目星", "(1D100<=50) → 56 → Failure", "failure", 6],
    ["CC<=50 目星", "(1D100<=50) → 5 → Critical", "critical", 7],
    ["CC<=50 目星", "(1D100<=50) → 98 → Fumble", "fumble", 7],
    ["CCB<=50 目星", "(1D100<=50) → 5 → Critical", "critical", 6],
    ["CCB<=50 目星", "(1D100<=50) → 98 → Fumble", "fumble", 6],
    ["CC<=50 目星", "(1D100<=50) → 30 → Success", "regular", 6],
    ["CC<=50 目星", "(1D100<=50) -> 20 -> Hard Success", "hard", 7],
    ["CC<=50 目星", "(1D100<=50) > 10 > Extreme Success", "extreme", 7],
    ["CC<=50 目星", "(1D100<=50) → 40 → Regular Success", "regular", 7],
    ["CC<=50 目星", "DiceBot : (1D100<=50) → 84 → 失敗", "failure", 6],
    ["CCB<=50 目星", "(1D100<=50) ＞ 10 ＞ イクストリーム成功", "extreme", 7],
  ])(
    "矢印・英語結果 %s %s をパースできる",
    (text, rollResult, expectedOutcome, expectedEdition) => {
      const roll = parseSkillRoll(msg(text, rollResult));
      expect(roll?.outcome).toBe(expectedOutcome);
      expect(roll?.edition).toBe(expectedEdition);
    },
  );

  test("Charaeno形式: 空括弧の母国語（）は括弧を除去して母国語とする", () => {
    const roll = parseSkillRoll(msg("CC<=70 母国語（）"));
    expect(roll?.skillName).toBe("母国語");
    expect(roll?.baseSkill).toBe("母国語");
    expect(roll?.specialization).toBeUndefined();
  });

  test("Charaeno形式: 芸術／製作（農業）や操縦（小型トラクター）をパースできる", () => {
    const r1 = parseSkillRoll(msg("CC<=70 芸術／製作（農業）"));
    expect(r1?.skillName).toBe("芸術/製作（農業）");
    expect(r1?.baseSkill).toBe("芸術/製作");
    expect(r1?.specialization).toBe("農業");

    const r2 = parseSkillRoll(msg("CC<=61 操縦（小型トラクター）"));
    expect(r2?.skillName).toBe("操縦（小型トラクター）");
    expect(r2?.baseSkill).toBe("操縦");
    expect(r2?.specialization).toBe("小型トラクター");
  });
});
