import type { ChatMessage } from "../types.ts";

const normalizeSpaces = (s: string) => s.replace(/[ \t\r\n]+/g, " ").trim();

const ROLL_RESULT_BOUNDARY = /\s\((?=[1-9]\d*D\d*|CC)/;

function splitRollText(raw: string): Pick<ChatMessage, "text" | "rollResult"> {
  const body = normalizeSpaces(raw);
  const match = ROLL_RESULT_BOUNDARY.exec(body);
  if (!match) return { text: body };
  return {
    text: body.slice(0, match.index).trim(),
    rollResult: body.slice(match.index + 1),
  };
}

export function parseCcfoliaHtml(html: string): ChatMessage[] {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const messages: ChatMessage[] = [];
  for (const p of doc.querySelectorAll("p")) {
    const [channelSpan, nameSpan, bodySpan] = p.querySelectorAll(":scope > span");
    if (!channelSpan || !nameSpan || !bodySpan) continue;
    const channel = normalizeSpaces(channelSpan.textContent).replace(/^\[(.*)\]$/, "$1");
    messages.push({
      channel,
      characterName: normalizeSpaces(nameSpan.textContent),
      ...splitRollText(bodySpan.textContent),
    });
  }
  return messages;
}

export function parseCcfoliaNewHtml(doc: Document): ChatMessage[] {
  const messages: ChatMessage[] = [];
  for (const article of doc.querySelectorAll("article.message")) {
    if (article.classList.contains("system")) continue;

    const speakerEl = article.querySelector(".speaker");
    const textEl = article.querySelector(".message-text");
    if (!speakerEl || !textEl) continue;

    const channelEl = article.querySelector(".channel-name");
    const rawChannel =
      channelEl?.textContent?.trim() ?? article.getAttribute("data-channel") ?? "main";
    const channel = rawChannel.replace(/^\[(.*)\]$/, "$1").trim() || "main";

    const characterName = normalizeSpaces(speakerEl.textContent);
    const text = normalizeSpaces(textEl.textContent);
    if (!characterName || !text) continue;

    const rollResultEl = article.querySelector(".roll-result");
    const rollResult = rollResultEl ? normalizeSpaces(rollResultEl.textContent) : undefined;

    messages.push({
      channel,
      characterName,
      text,
      ...(rollResult === undefined ? {} : { rollResult }),
    });
  }
  return messages;
}

interface CcfoliaJsonMessage {
  name?: unknown;
  text?: unknown;
  channel?: unknown;
  channelName?: unknown;
  extend?: { roll?: { result?: unknown } };
}

const asString = (v: unknown): string | undefined => (typeof v === "string" ? v : undefined);

export function parseCcfoliaJson(json: string): ChatMessage[] {
  const data: unknown = JSON.parse(json);
  const rawMessages = (data as { messages?: unknown } | null)?.messages;
  if (!Array.isArray(rawMessages)) throw new Error("CCFOLIA のログ JSON ではありません");

  const messages: ChatMessage[] = [];
  for (const m of rawMessages as (CcfoliaJsonMessage | null)[]) {
    const name = asString(m?.name);
    const text = asString(m?.text);
    if (name === undefined || text === undefined) continue;
    const rollResult = asString(m?.extend?.roll?.result);
    messages.push({
      channel: asString(m?.channelName) ?? asString(m?.channel) ?? "main",
      characterName: name.trim(),
      text: normalizeSpaces(text),
      ...(rollResult === undefined ? {} : { rollResult: normalizeSpaces(rollResult) }),
    });
  }
  return messages;
}
