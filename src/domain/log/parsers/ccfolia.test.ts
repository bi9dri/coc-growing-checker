// @vitest-environment happy-dom
import { describe, expect, test } from "vite-plus/test";

import { parseCcfoliaNewHtml } from "./ccfolia.ts";

describe("parseCcfoliaNewHtml", () => {
  test("system メッセージや要素が欠損している article はスキップする", () => {
    const doc = new DOMParser().parseFromString(
      `
      <article class="message system"><span class="speaker">System</span><div class="message-text">入室</div></article>
      <article class="message"><span class="speaker"></span><div class="message-text">本文のみ</div></article>
      <article class="message"><span class="speaker">話者のみ</span><div class="message-text"></div></article>
      <article class="message"><div class="message-text">名前なし</div></article>
      <article class="message"><span class="speaker">本文なし</span></article>
      <article class="message">
        <div class="message-content">
          <div class="message-header"><span class="speaker">探索者</span><span class="channel-name">   </span></div>
          <div class="message-text">こんにちは</div>
        </div>
      </article>
      <article class="message" data-channel="[雑談]">
        <div class="message-content">
          <div class="message-header"><span class="speaker">探索者2</span></div>
          <div class="message-text">よろしく</div>
        </div>
      </article>
      `,
      "text/html",
    );
    const messages = parseCcfoliaNewHtml(doc);
    expect(messages).toEqual([
      { channel: "main", characterName: "探索者", text: "こんにちは" },
      { channel: "雑談", characterName: "探索者2", text: "よろしく" },
    ]);
  });
});
