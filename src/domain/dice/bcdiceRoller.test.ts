import { describe, expect, test } from "vite-plus/test";

import { createBcdiceRoller } from "./bcdiceRoller.ts";

describe("createBcdiceRoller", () => {
  const dice = createBcdiceRoller();

  test("BCDice でダイスを振り、最終値と BCDice のテキストを返す", () => {
    for (let i = 0; i < 50; i++) {
      const { total, text } = dice.roll("1D10");
      expect(total).toBeGreaterThanOrEqual(1);
      expect(total).toBeLessThanOrEqual(10);
      expect(text).toBe(`(1D10) ＞ ${total}`);
    }
  });

  test("複数ダイス・修正値付きは最後の ＞ の値を合計とする", () => {
    const { total, text } = dice.roll("2D6+100");
    expect(total).toBeGreaterThanOrEqual(102);
    expect(total).toBeLessThanOrEqual(112);
    expect(text.endsWith(`＞ ${total}`)).toBe(true);
  });

  test("固定値はダイスを振らずにそのまま返す", () => {
    expect(dice.roll("5")).toEqual({ total: 5, text: "5" });
    expect(dice.roll("10")).toEqual({ total: 10, text: "10" });
  });

  test("解釈できない式はエラー", () => {
    expect(() => dice.roll("foo")).toThrow("ダイス式を解釈できません: foo");
  });
});
