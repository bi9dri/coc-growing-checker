import { Base } from "bcdice";

import type { DiceRoller } from "./types.ts";

export function createBcdiceRoller(): DiceRoller {
  return {
    roll(expression) {
      if (/^\d+$/.test(expression)) return { total: Number(expression), text: expression };
      const result = Base.eval(expression);
      if (!result) throw new Error(`ダイス式を解釈できません: ${expression}`);
      return { total: Number(result.text.split("＞").pop()), text: result.text };
    },
  };
}
