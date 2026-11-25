// @vitest-environment happy-dom
import { describe, expect, test } from "vite-plus/test";

import { parseTekeyHtml } from "./tekey.ts";

describe("parseTekeyHtml", () => {
  test("chatlog がない場合は空配列を返す", () => {
    const doc = new DOMParser().parseFromString("<div>empty</div>", "text/html");
    expect(parseTekeyHtml(doc)).toEqual([]);
  });

  test("tab-list に input がない label や不正な要素をスキップする", () => {
    const doc = new DOMParser().parseFromString(
      `
      <div class="tab-list">
        <label class="tab-checkbox">メイン</label>
        <label class="tab-checkbox"><input id="" />空ID</label>
        <label class="tab-checkbox"><input id="tab1" />メイン</label>
      </div>
      <div class="chatlog">
        <p>無視されるタグ</p>
        <div>bタグなし</div>
        <div><b></b>名前が空</div>
        <div class="tab1"><b>PL1:</b></div>
        <div class="tab1"><b>PL1:</b>通常発言</div>
        <div class="tab99"><b>PL2:</b>タブ不明</div>
      </div>
      `,
      "text/html",
    );
    const messages = parseTekeyHtml(doc);
    expect(messages).toEqual([
      { channel: "メイン", characterName: "PL1", text: "通常発言" },
      { channel: "main", characterName: "PL2", text: "タブ不明" },
    ]);
  });

  test("tab-list がなくても既定タブ名を解決し、Tekey のログイン通知のみを除外する", () => {
    const doc = new DOMParser().parseFromString(
      `
      <div class="chatlog">
        <div class="tab1"><b>Tekey:</b>PL1がログインしました</div>
        <div class="tab2"><b>Tekey:</b>通常メッセージ</div>
        <div class="tab3"><b>PL1:</b>ログインしました</div>
      </div>
      `,
      "text/html",
    );
    expect(parseTekeyHtml(doc)).toEqual([
      { channel: "サブ", characterName: "Tekey", text: "通常メッセージ" },
      { channel: "雑談", characterName: "PL1", text: "ログインしました" },
    ]);
  });
});
