// @vitest-environment happy-dom
import { describe, expect, test } from "vite-plus/test";

import {
  parseDodontofuHtml,
  parseLycorisNiwatori,
  parseUdonariumAxeNormal,
  parseUdonariumAxeSoshoku,
} from "./udonariumHtml.ts";

describe("parseUdonariumAxeSoshoku", () => {
  test("名前もテキストもない article はスキップする", () => {
    const doc = new DOMParser().parseFromString(
      `
      <article class="msg"><div class="hd"></div><div class="tx"></div></article>
      <article class="msg"><div class="hd"><span class="nm">PL</span></div><div class="tx">テスト</div></article>
      <article class="msg"><div class="hd"><span class="nm">PL2</span><span class="tg">サブ</span></div><div class="tx">テスト2</div></article>
      <article class="msg"><div class="hd"><span class="nm">PL3</span></div></article>
      `,
      "text/html",
    );
    expect(parseUdonariumAxeSoshoku(doc)).toEqual([
      { channel: "main", characterName: "PL", text: "テスト" },
      { channel: "サブ", characterName: "PL2", text: "テスト2" },
      { channel: "main", characterName: "PL3", text: "" },
    ]);
  });
});

describe("parseUdonariumAxeNormal", () => {
  test(".ct がない要素や名前がない要素をスキップする", () => {
    const doc = new DOMParser().parseFromString(
      `
      <div class="m"></div>
      <div class="m"><div class="ct">名前なし</div></div>
      <div class="m"><div class="ct"><b>PL:</b>発言</div></div>
      <div class="m"><span class="tc">[]</span><div class="ct"><b>PL2:</b>空チャンネル</div></div>
      `,
      "text/html",
    );
    expect(parseUdonariumAxeNormal(doc)).toEqual([
      { channel: "main", characterName: "PL", text: "発言" },
      { channel: "main", characterName: "PL2", text: "空チャンネル" },
    ]);
  });
});

describe("parseLycorisNiwatori", () => {
  test("span が3つ未満の段落はスキップする、また空チャンネルはmainにする", () => {
    const doc = new DOMParser().parseFromString(
      `
      <p><span>1</span><span>2</span></p>
      <p><span>[]</span><span>PL</span><span>発言</span></p>
      `,
      "text/html",
    );
    expect(parseLycorisNiwatori(doc)).toEqual([
      { channel: "main", characterName: "PL", text: "発言" },
    ]);
  });
});

describe("parseDodontofuHtml", () => {
  test("チャンネル指定テキストがない font もデフォルトチャンネルでパースする", () => {
    const doc = new DOMParser().parseFromString(
      `
      <font color="#000"><b>PL</b>：テスト発言</font>
      []<font color="#000"><b>PL2</b>：空チャンネル発言</font>
      `,
      "text/html",
    );
    expect(parseDodontofuHtml(doc)).toEqual([
      { channel: "main", characterName: "PL", text: "テスト発言" },
      { channel: "main", characterName: "PL2", text: "空チャンネル発言" },
    ]);
  });

  test("b タグがない font や空の font をスキップする", () => {
    const doc = new DOMParser().parseFromString(
      `
      <font color="#000">bタグなし</font>
      <font color="#000"><b></b></font>
      <font color="#000"><b>PL</b>：</font>
      `,
      "text/html",
    );
    expect(parseDodontofuHtml(doc)).toEqual([]);
  });

  test("body がない Document の場合は空配列を返す", () => {
    const doc = document.implementation.createHTMLDocument();
    doc.body?.remove();
    expect(parseDodontofuHtml(doc)).toEqual([]);
  });
});
