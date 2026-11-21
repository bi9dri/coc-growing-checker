import { describe, expect, test } from "vite-plus/test";

import { parseTextLog } from "./text.ts";

describe("parseTextLog", () => {
  test("空行、区切り線、マッチしない行をスキップする", () => {
    const text = `
    --- 2026/01/01 ---
    === セッション開始 ===
    ツールで書き出し
    コロンのない無効な行
    :名前のない行
    [メイン] PL: こんにちは
    [ ] PL2: チャンネル空
    `;
    const messages = parseTextLog(text);
    expect(messages).toEqual([
      { channel: "メイン", characterName: "PL", text: "こんにちは" },
      { channel: "main", characterName: "PL2", text: "チャンネル空" },
    ]);
  });
});
