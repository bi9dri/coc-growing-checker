// @vitest-environment happy-dom
import { describe, expect, test } from "vite-plus/test";

import ccfoliaAllHtml from "../../../test/fixtures/ccfolia_all.html?raw";
import ccfoliaLogJson from "../../../test/fixtures/ccfolia_log.json?raw";
import ccfoliaNewHtml from "../../../test/fixtures/ccfolia_new.html?raw";
import tekeyHtml from "../../../test/fixtures/tekey.html?raw";
import tekeyDarkTimestampHtml from "../../../test/fixtures/tekey_dark_timestamp.html?raw";
import tekeyDodontofuHtml from "../../../test/fixtures/tekey_dodontofu.html?raw";
import udonariumDataXml from "../../../test/fixtures/udonarium_data.xml?raw";
import udonariumAxeHtml from "../../../test/fixtures/udonariumaxe.html?raw";
import udonariumAxeGokanHtml from "../../../test/fixtures/udonariumaxe_gokan.html?raw";
import udonariumAxeSoshokuHtml from "../../../test/fixtures/udonariumaxe_soshoku.html?raw";
import udonariumAxeTabHtml from "../../../test/fixtures/udonariumaxe_tab.html?raw";
import udonariumAxeTextHtml from "../../../test/fixtures/udonariumaxe_text.html?raw";
import udonariumLycorisHtml from "../../../test/fixtures/udonariumlycoris.html?raw";
import udonariumLycorisNiwatoriHtml from "../../../test/fixtures/udonariumlycoris_niwatori.html?raw";
import vespernaTxt from "../../../test/fixtures/VESPERNA.txt?raw";
import { parseCcfoliaHtml, parseCcfoliaJson, parseLog } from "./parseLog.ts";

const wrap = (body: string) => `<!DOCTYPE html><html><body>${body}</body></html>`;

describe("parseCcfoliaHtml", () => {
  test("実ログから全発言をチャンネル・名前・本文・BCDice出力に分解する", () => {
    const messages = parseCcfoliaHtml(ccfoliaAllHtml);

    expect(messages).toHaveLength(11);
    expect(messages[1]).toEqual({
      channel: "main",
      characterName: "橘 悠真 (仮名)",
      text: "CC<=70 【正気度ロール】",
      rollResult: "(1D100<=70) ボーナス・ペナルティダイス[0] ＞ 23 ＞ 23 ＞ ハード成功",
    });
  });

  test("キャラクター名の末尾空白をトリムし、チャンネルを取り出す", () => {
    const messages = parseCcfoliaHtml(ccfoliaAllHtml);

    expect(messages[2]?.characterName).toBe("白石 透");
    expect(messages[2]?.channel).toBe("other");
  });

  test("全角スペース区切りのコマンドも本文として保持する", () => {
    const messages = parseCcfoliaHtml(ccfoliaAllHtml);

    expect(messages[4]?.text).toBe("CC<=50　【INT】");
  });

  test("技能名なしの素振りも (1D100 を境界に分離する", () => {
    const messages = parseCcfoliaHtml(ccfoliaAllHtml);

    expect(messages[0]).toMatchObject({ text: "1D100", rollResult: "(1D100) ＞ 23" });
  });

  test("BCDice出力を含まない発言は rollResult を持たない", () => {
    const messages = parseCcfoliaHtml(ccfoliaAllHtml);

    expect(messages[3]).toEqual({
      channel: "main",
      characterName: "KP",
      text: "BMR 狂気の発作（リアルタイム）(9) ＞ 恐怖症：探索者は新しい恐怖症に陥る。(1D10＞8ラウンド)",
    });
    expect(messages[10]?.rollResult).toBeUndefined();
  });

  test("span が3つ揃っていない段落は無視する", () => {
    const html = wrap(`<p><span>[main]</span><span>A</span></p><p>plain</p>`);

    expect(parseCcfoliaHtml(html)).toEqual([]);
  });

  test("チャンネル表記に角括弧がなくてもそのまま採用する", () => {
    const html = wrap(`<p><span>main</span><span>A</span> : <span>hello</span></p>`);

    expect(parseCcfoliaHtml(html)).toEqual([
      { channel: "main", characterName: "A", text: "hello" },
    ]);
  });

  test("本文内の改行・連続空白は1つの半角スペースに正規化する", () => {
    const html = wrap(
      `<p><span>[main]</span><span>A</span> : <span>CC&lt;=50\n  目星   (1D100&lt;=50) ＞ 1</span></p>`,
    );

    expect(parseCcfoliaHtml(html)[0]).toMatchObject({
      text: "CC<=50 目星",
      rollResult: "(1D100<=50) ＞ 1",
    });
  });
});

describe("parseCcfoliaJson", () => {
  test("実ログから発言を取り出し、名前をトリムする", () => {
    const messages = parseCcfoliaJson(ccfoliaLogJson);

    expect(messages).toEqual([
      {
        channel: "main",
        characterName: "橘 悠真 (仮名)",
        text: "CC<=70 【正気度ロール】",
        rollResult: "(1D100<=70) ボーナス・ペナルティダイス[0] ＞ 23 ＞ 23 ＞ ハード成功",
      },
      {
        channel: "other",
        characterName: "白石 透",
        text: "CC<=70 【近接戦闘（格闘）】",
        rollResult: "(1D100<=70) ボーナス・ペナルティダイス[0] ＞ 34 ＞ 34 ＞ ハード成功",
      },
    ]);
  });

  test("ロールのない発言と、channelName が無い場合は channel を使う", () => {
    const json = JSON.stringify({
      messages: [{ name: "KP", text: "こんにちは", channel: "info" }],
    });

    expect(parseCcfoliaJson(json)).toEqual([
      { channel: "info", characterName: "KP", text: "こんにちは" },
    ]);
  });

  test("channel も無い場合は main とみなす", () => {
    const json = JSON.stringify({ messages: [{ name: "KP", text: "x" }] });

    expect(parseCcfoliaJson(json)[0]?.channel).toBe("main");
  });

  test("messages 配列が無い JSON はエラー", () => {
    expect(() => parseCcfoliaJson("{}")).toThrow("CCFOLIA のログ JSON ではありません");
    expect(() => parseCcfoliaJson("null")).toThrow("CCFOLIA のログ JSON ではありません");
  });

  test("name / text が文字列でないメッセージは読み飛ばす", () => {
    const json = JSON.stringify({
      messages: [null, { name: 1, text: "x" }, { name: "A", text: 2 }],
    });

    expect(parseCcfoliaJson(json)).toEqual([]);
  });
});

describe("parseLog: オンラインセッションツール対応", () => {
  test("CCFOLIA 新HTML (HTML出力)", () => {
    const messages = parseLog(ccfoliaNewHtml);
    expect(messages.length).toBeGreaterThan(10);
    const rin = messages.find((m) => m.characterName === "神崎 凛");
    expect(rin).toBeDefined();
    expect(rin?.channel).toBe("メイン");
    expect(rin?.text).toBe("1D100");
    expect(rin?.rollResult).toBe("(1D100) ＞ 23");
  });

  test("Tekey 形式 (tekey.html)", () => {
    const messages = parseLog(tekeyHtml);
    expect(messages).toHaveLength(2);
    expect(messages[0]).toEqual({
      channel: "メイン",
      characterName: "キャラいち",
      text: "CC<=500",
      rollResult: "Cthulhu:English : (1D100<=500) → 46 → Special",
    });
    expect(messages[1]).toEqual({
      channel: "メイン",
      characterName: "キャラいち",
      text: "CC<=50 [やる気]",
      rollResult: "Cthulhu:English : (1D100<=50) → 56 → Failure",
    });
  });

  test("Tekey ダークテーマかつタイムスタンプあり (tekey_dark_timestamp.html)", () => {
    const messages = parseLog(tekeyDarkTimestampHtml);
    expect(messages).toHaveLength(2);
    expect(messages[0]?.characterName).toBe("キャラいち");
    expect(messages[0]?.rollResult).toContain("Special");
  });

  test("Tekey どどんとふ形式 (tekey_dodontofu.html)", () => {
    const messages = parseLog(tekeyDodontofuHtml);
    expect(messages).toHaveLength(2);
    expect(messages[0]).toEqual({
      channel: "メイン",
      characterName: "キャラいち",
      text: "CC<=500",
      rollResult: "Cthulhu:English : (1D100<=500) → 46 → Special",
    });
    expect(messages[1]).toEqual({
      channel: "メイン",
      characterName: "キャラいち",
      text: "CC<=50 [やる気]",
      rollResult: "Cthulhu:English : (1D100<=50) → 56 → Failure",
    });
  });

  test("Udonarium data.xml", () => {
    const messages = parseLog(udonariumDataXml);
    expect(messages).toHaveLength(1);
    expect(messages[0]).toEqual({
      channel: "メインタブ",
      characterName: "プレイヤー",
      text: "1D100<=50",
      rollResult: "(1D100<=50) ＞ 85 ＞ 失敗",
    });
  });

  test("Udonarium Lycoris 通常ログ (udonariumlycoris.html)", () => {
    const messages = parseLog(udonariumLycorisHtml);
    expect(messages).toHaveLength(1);
    expect(messages[0]).toEqual({
      channel: "メインタブ",
      characterName: "プレイヤー",
      text: "1D100<=50",
      rollResult: "DiceBot : (1D100<=50) → 84 → 失敗",
    });
  });

  test("Udonarium Lycoris にわとり風ログ (udonariumlycoris_niwatori.html)", () => {
    const messages = parseLog(udonariumLycorisNiwatoriHtml);
    expect(messages).toHaveLength(1);
    expect(messages[0]).toEqual({
      channel: "メインタブ",
      characterName: "プレイヤー",
      text: "1D100<=50",
      rollResult: "DiceBot : (1D100<=50) ＞ 84 ＞ 失敗",
    });
  });

  test("Udonarium Axe 通常ログ (udonariumaxe.html)", () => {
    const messages = parseLog(udonariumAxeHtml);
    expect(messages).toHaveLength(1);
    expect(messages[0]).toEqual({
      channel: "メインタブ",
      characterName: "プレイヤー",
      text: "1D100<=50",
      rollResult: "DiceBot : (1D100<=50) → 55 → 失敗",
    });
  });

  test("Udonarium Axe タブ別ログ (udonariumaxe_tab.html)", () => {
    const messages = parseLog(udonariumAxeTabHtml);
    expect(messages).toEqual([]);
  });

  test("Udonarium Axe 装飾ログ (udonariumaxe_soshoku.html)", () => {
    const messages = parseLog(udonariumAxeSoshokuHtml);
    expect(messages).toHaveLength(1);
    expect(messages[0]).toEqual({
      channel: "メインタブ",
      characterName: "プレイヤー",
      text: "1D100<=50",
      rollResult: "DiceBot : (1D100<=50) → 55 → 失敗",
    });
  });

  test("Udonarium Axe 互換形式ログ (udonariumaxe_gokan.html)", () => {
    const messages = parseLog(udonariumAxeGokanHtml);
    expect(messages).toHaveLength(1);
    expect(messages[0]).toEqual({
      channel: "メインタブ",
      characterName: "プレイヤー",
      text: "1D100<=50",
      rollResult: "DiceBot : (1D100<=50) ＞ 55 ＞ 失敗",
    });
  });

  test("Udonarium Axe テキストログ (udonariumaxe_text.html)", () => {
    const messages = parseLog(udonariumAxeTextHtml);
    expect(messages).toHaveLength(1);
    expect(messages[0]).toEqual({
      channel: "メインタブ",
      characterName: "プレイヤー",
      text: "1D100<=50",
      rollResult: "DiceBot : (1D100<=50) → 55 → 失敗",
    });
  });

  test("VESPERNA (VESPERNA.txt)", () => {
    const messages = parseLog(vespernaTxt);
    expect(messages.length).toBeGreaterThanOrEqual(6);
    const diceRoll = messages.find((m) => m.text.includes("CCB<=70"));
    expect(diceRoll).toEqual({
      channel: "main",
      characterName: "柚木 灯",
      text: "CCB<=70 【目星】",
      rollResult: "(1D100<=70) ＞ 72 ＞ 失敗",
    });
  });

  test("HTMLタグが含まれるが発言がないファイルは空配列を返す", () => {
    const html = "<html><body><p>発言のない文章</p></body></html>";
    expect(parseLog(html)).toEqual([]);

    const fontHtml = "<font color='#000'>bタグなし</font>";
    expect(parseLog(fontHtml)).toEqual([]);
  });
});
