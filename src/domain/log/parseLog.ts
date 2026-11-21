import { parseCcfoliaHtml, parseCcfoliaJson, parseCcfoliaNewHtml } from "./parsers/ccfolia.ts";
import { parseTekeyHtml } from "./parsers/tekey.ts";
import { parseTextLog } from "./parsers/text.ts";
import {
  parseDodontofuHtml,
  parseLycorisNiwatori,
  parseUdonariumAxeNormal,
  parseUdonariumAxeSoshoku,
} from "./parsers/udonariumHtml.ts";
import { parseUdonariumXml } from "./parsers/udonariumXml.ts";
import type { ChatMessage } from "./types.ts";

export { parseCcfoliaHtml, parseCcfoliaJson };

export function parseLog(content: string): ChatMessage[] {
  const trimmed = content.trim();

  if (trimmed.startsWith("{")) {
    return parseCcfoliaJson(content);
  }

  if (trimmed.includes("<chat-tab")) {
    return parseUdonariumXml(content);
  }

  const isHtml =
    trimmed.includes("<html") ||
    trimmed.includes("<!DOCTYPE") ||
    trimmed.includes("<!doctype") ||
    trimmed.includes("<body") ||
    trimmed.includes("<div") ||
    trimmed.includes("<article") ||
    trimmed.includes("<font") ||
    trimmed.includes("<p");

  if (isHtml) {
    const doc = new DOMParser().parseFromString(content, "text/html");

    if (doc.querySelector("article.message")) {
      return parseCcfoliaNewHtml(doc);
    }

    if (doc.querySelector("article.msg")) {
      return parseUdonariumAxeSoshoku(doc);
    }

    if (doc.querySelector(".chatlog")) {
      return parseTekeyHtml(doc);
    }

    if (doc.querySelector(".m")) {
      return parseUdonariumAxeNormal(doc);
    }

    if (
      (content.includes("<BCDice") || content.includes("&lt;BCDice")) &&
      doc.querySelector("p > span")
    ) {
      return parseLycorisNiwatori(doc);
    }

    if (doc.querySelector("font")) {
      const res = parseDodontofuHtml(doc);
      if (res.length > 0) return res;
    }

    const ccfoliaOld = parseCcfoliaHtml(content);
    if (ccfoliaOld.length > 0) {
      return ccfoliaOld;
    }

    return [];
  }

  return parseTextLog(content);
}
