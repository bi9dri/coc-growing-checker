import { describe, expect, test } from "vite-plus/test";

import { pairDiceBotMessages, type RawLogMessage } from "./pairing.ts";

describe("pairDiceBotMessages", () => {
  test("ダイスボット発言を直前のユーザー発言に紐付ける（<BCDice：名前> 形式）", () => {
    const raw: RawLogMessage[] = [
      { channel: "メイン", characterName: "プレイヤー", text: "CC<=50 【目星】" },
      {
        channel: "メイン",
        characterName: "<BCDice：プレイヤー>",
        text: "DiceBot : (1D100<=50) → 20 → ハード成功",
      },
    ];
    const paired = pairDiceBotMessages(raw);
    expect(paired).toEqual([
      {
        channel: "メイン",
        characterName: "プレイヤー",
        text: "CC<=50 【目星】",
        rollResult: "DiceBot : (1D100<=50) → 20 → ハード成功",
      },
    ]);
  });

  test("ダイスボット発言を直前のユーザー発言に紐付ける（DiceBot : 名前 形式）", () => {
    const raw: RawLogMessage[] = [
      { channel: "main", characterName: "探索者A", text: "1D100<=70" },
      {
        channel: "main",
        characterName: "DiceBot : 探索者A",
        text: "(1D100<=70) ＞ 15 ＞ 成功",
      },
    ];
    const paired = pairDiceBotMessages(raw);
    expect(paired).toEqual([
      {
        channel: "main",
        characterName: "探索者A",
        text: "1D100<=70",
        rollResult: "(1D100<=70) ＞ 15 ＞ 成功",
      },
    ]);
  });

  test("isDiceBot フラグが立っている場合はキャラ名が一致する直前発言に紐付ける", () => {
    const raw: RawLogMessage[] = [
      { channel: "メイン", characterName: "プレイヤー", text: "CC<=60 【聞き耳】" },
      {
        channel: "メイン",
        characterName: "プレイヤー",
        text: "(1D100<=60) ＞ 70 ＞ 失敗",
        isDiceBot: true,
      },
    ];
    const paired = pairDiceBotMessages(raw);
    expect(paired).toEqual([
      {
        channel: "メイン",
        characterName: "プレイヤー",
        text: "CC<=60 【聞き耳】",
        rollResult: "(1D100<=60) ＞ 70 ＞ 失敗",
      },
    ]);
  });

  test("直前に紐付け先がないダイスボット発言でもターゲットキャラ名があれば復元する", () => {
    const raw: RawLogMessage[] = [
      {
        channel: "main",
        characterName: "<BCDice：単独キャラ>",
        text: "DiceBot : (1D100<=50) → 10 → 成功",
      },
    ];
    const paired = pairDiceBotMessages(raw);
    expect(paired).toEqual([
      {
        channel: "main",
        characterName: "単独キャラ",
        text: "",
        rollResult: "DiceBot : (1D100<=50) → 10 → 成功",
      },
    ]);
  });

  test("紐付け先がなくターゲットキャラ名も不明なシステム発言はスキップする", () => {
    const raw: RawLogMessage[] = [
      {
        channel: "main",
        characterName: "System-BCDice",
        text: "(1D100) ＞ 50",
        isDiceBot: true,
      },
    ];
    const paired = pairDiceBotMessages(raw);
    expect(paired).toEqual([]);
  });

  test("通常のチャット発言はそのまま保持される", () => {
    const raw: RawLogMessage[] = [
      { channel: "main", characterName: "GM", text: "こんにちは" },
      {
        channel: "main",
        characterName: "PL1",
        text: "CC<=50 【目星】",
        rollResult: "(1D100<=50) ＞ 20 ＞ 成功",
      },
    ];
    const paired = pairDiceBotMessages(raw);
    expect(paired).toEqual(raw);
  });
});
