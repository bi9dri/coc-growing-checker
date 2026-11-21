import { pairDiceBotMessages, type RawLogMessage } from "../pairing.ts";
import type { ChatMessage } from "../types.ts";

const normalizeSpaces = (s: string) =>
  s
    .replace(/\u00a0/g, " ")
    .replace(/[ \t\r\n]+/g, " ")
    .trim();

const TEXT_LINE_PATTERN =
  /^(?:\[\d{1,2}:\d{2}(?::\d{2})?\]\s*)?(?:\[(.*?)\]\s*)?(<BCDice[：:].*?>|.*?)[：:]\s*(.*)$/;

const INLINE_ROLL_BOUNDARY = /(?:[🎲\u{1F3B2}]\s*)(\([1-9]\d*D\d*.*)/u;

export function parseTextLog(content: string): ChatMessage[] {
  const lines = content.split(/\r?\n/);
  const rawList: RawLogMessage[] = [];

  for (const rawLine of lines) {
    const line = normalizeSpaces(rawLine);
    if (!line) continue;

    if (line.startsWith("---") || line.startsWith("===") || line.includes("で書き出し")) {
      continue;
    }

    const match = TEXT_LINE_PATTERN.exec(line);
    if (!match) continue;

    const channel = (match[1] ?? "").trim() || "main";
    const characterName = (match[2] as string).trim();
    const rawBody = (match[3] as string).trim();
    if (!characterName) continue;

    const rollMatch = INLINE_ROLL_BOUNDARY.exec(rawBody);
    let text = rawBody;
    let rollResult: string | undefined;

    if (rollMatch) {
      text = rawBody.slice(0, rollMatch.index).trim();
      rollResult = rollMatch[1]?.trim();
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
