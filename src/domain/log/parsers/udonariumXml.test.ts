// @vitest-environment happy-dom
import { describe, expect, test } from "vite-plus/test";

import { parseUdonariumXml } from "./udonariumXml.ts";

describe("parseUdonariumXml", () => {
  test("属性が省略されている chat 要素もデフォルト値でパースする", () => {
    const xml = `
    <chat-tab>
      <chat>属性なしテキスト</chat>
      <chat name="PL">テキストのみ</chat>
      <chat from="System-BCDice" name="PL">システムダイス結果</chat>
      <chat name="DiceBot : PL2">ダイス結果</chat>
    </chat-tab>
    `;
    const messages = parseUdonariumXml(xml);
    expect(messages).toEqual([
      { channel: "main", characterName: "", text: "属性なしテキスト" },
      {
        channel: "main",
        characterName: "PL",
        text: "テキストのみ",
        rollResult: "システムダイス結果",
      },
      { channel: "main", characterName: "PL2", text: "", rollResult: "ダイス結果" },
    ]);
  });
});
