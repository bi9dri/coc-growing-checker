import { pairDiceBotMessages, type RawLogMessage } from "../pairing.ts";
import type { ChatMessage } from "../types.ts";

const normalizeSpaces = (s: string) => s.replace(/[ \t\r\n]+/g, " ").trim();

export function parseUdonariumXml(xml: string): ChatMessage[] {
  const doc = new DOMParser().parseFromString(xml, "application/xml");
  const rawList: RawLogMessage[] = [];

  const tabs = doc.querySelectorAll("chat-tab");
  for (const tab of tabs) {
    const channel = (tab.getAttribute("name") ?? "").trim() || "main";
    for (const chat of tab.querySelectorAll("chat")) {
      const characterName = (chat.getAttribute("name") ?? "").trim();
      const from = (chat.getAttribute("from") ?? "").trim().toLowerCase();
      const text = normalizeSpaces(chat.textContent as string);

      const isDiceBot = from.includes("system-bcdice") || characterName.startsWith("DiceBot :");

      rawList.push({
        channel,
        characterName,
        text,
        isDiceBot,
      });
    }
  }

  return pairDiceBotMessages(rawList);
}
