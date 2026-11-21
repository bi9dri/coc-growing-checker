import { pairDiceBotMessages, type RawLogMessage } from "../pairing.ts";
import type { ChatMessage } from "../types.ts";

const normalizeSpaces = (s: string) =>
  s
    .replace(/\u00a0/g, " ")
    .replace(/[ \t\r\n]+/g, " ")
    .trim();

export function parseUdonariumAxeSoshoku(doc: Document): ChatMessage[] {
  const rawList: RawLogMessage[] = [];
  for (const article of doc.querySelectorAll("article.msg")) {
    const isRoll = article.classList.contains("roll");
    const nameEl = article.querySelector(".nm");
    const channelEl = article.querySelector(".tg");
    const textEl = article.querySelector(".tx");

    const characterName = nameEl ? normalizeSpaces(nameEl.textContent) : "";
    const channel = channelEl ? normalizeSpaces(channelEl.textContent) : "main";
    const text = textEl ? normalizeSpaces(textEl.textContent) : "";

    if (!characterName && !text) continue;

    rawList.push({
      channel,
      characterName,
      text,
      isDiceBot: isRoll,
    });
  }
  return pairDiceBotMessages(rawList);
}

export function parseUdonariumAxeNormal(doc: Document): ChatMessage[] {
  const titleChannel = doc.title.replace(/^チャットログ[：:]/, "").trim() || "main";
  const rawList: RawLogMessage[] = [];

  for (const m of doc.querySelectorAll(".m")) {
    const tcEl = m.querySelector(".tc");
    const channel = tcEl
      ? normalizeSpaces(tcEl.textContent)
          .replace(/^\[(.*)\]$/, "$1")
          .trim() || titleChannel
      : titleChannel;

    const ctEl = m.querySelector(".ct");
    if (!ctEl) continue;

    const bEl = ctEl.querySelector("b");
    const spanEl = ctEl.querySelector("span");
    const nameEl = bEl ?? spanEl;
    if (!nameEl) continue;

    const characterName = normalizeSpaces(nameEl.textContent)
      .replace(/[：:]$/, "")
      .trim();

    const clone = ctEl.cloneNode(true) as HTMLElement;
    const cloneName = clone.querySelector("b") ?? clone.querySelector("span");
    cloneName?.remove();
    const text = normalizeSpaces(clone.textContent).replace(/^[：:]\s*/, "");

    const isDiceBot =
      characterName.startsWith("<BCDice") ||
      characterName.startsWith("DiceBot") ||
      text.startsWith("DiceBot :");

    rawList.push({
      channel,
      characterName,
      text,
      isDiceBot,
    });
  }

  return pairDiceBotMessages(rawList);
}

export function parseLycorisNiwatori(doc: Document): ChatMessage[] {
  const rawList: RawLogMessage[] = [];
  for (const p of doc.querySelectorAll("p")) {
    const spans = p.querySelectorAll(":scope > span");
    if (spans.length < 3) continue;

    const channel =
      normalizeSpaces((spans[0] as HTMLSpanElement).textContent)
        .replace(/^\[(.*)\]$/, "$1")
        .trim() || "main";
    const characterName = normalizeSpaces((spans[1] as HTMLSpanElement).textContent);
    const text = normalizeSpaces((spans[2] as HTMLSpanElement).textContent);

    const isDiceBot =
      characterName.startsWith("<BCDice") ||
      characterName.startsWith("DiceBot") ||
      text.startsWith("DiceBot :");

    rawList.push({
      channel,
      characterName,
      text,
      isDiceBot,
    });
  }

  return pairDiceBotMessages(rawList);
}

export function parseDodontofuHtml(doc: Document): ChatMessage[] {
  const rawList: RawLogMessage[] = [];
  const body = doc.body;
  if (!body) return [];

  for (const font of body.querySelectorAll("font")) {
    let channel = "main";
    let prev = font.previousSibling;
    while (prev) {
      if (prev.nodeType === Node.TEXT_NODE) {
        const match = /\[(.*?)\]\s*$/.exec(prev.textContent as string);
        if (match) {
          channel = (match[1] as string).trim() || "main";
          break;
        }
      }
      prev = prev.previousSibling;
    }

    const bEl = font.querySelector("b");
    if (!bEl) continue;

    const characterName = normalizeSpaces(bEl.textContent)
      .replace(/[：:]$/, "")
      .trim();

    const clone = font.cloneNode(true) as HTMLElement;
    clone.querySelector("b")?.remove();

    const parts = clone.innerHTML
      .split(/<br\s*\/?>/i)
      .map((p) => {
        const tmp = doc.createElement("div");
        tmp.innerHTML = p;
        return normalizeSpaces(tmp.textContent).replace(/^[：:]\s*/, "");
      })
      .filter(Boolean);

    if (parts.length === 0) continue;

    const text = parts[0] as string;
    const rollResult = parts.slice(1).join(" ") || undefined;

    if (characterName === "Tekey" && text.includes("ログインしました")) {
      continue;
    }

    const isDiceBot =
      characterName.startsWith("<BCDice") ||
      characterName.startsWith("DiceBot") ||
      text.startsWith("DiceBot :");

    rawList.push({
      channel,
      characterName,
      text,
      ...(rollResult === undefined ? {} : { rollResult }),
      isDiceBot,
    });
  }

  return pairDiceBotMessages(rawList);
}
