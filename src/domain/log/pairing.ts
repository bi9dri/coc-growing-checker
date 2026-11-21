import type { ChatMessage } from "./types.ts";

export interface RawLogMessage {
  channel: string;
  characterName: string;
  text: string;
  rollResult?: string;
  isDiceBot?: boolean;
}

const BCDICE_NAME_PATTERN = /^(?:<BCDice[：:](.*?)>|DiceBot\s*[：:]\s*(.*))$/i;

export function pairDiceBotMessages(rawMessages: RawLogMessage[]): ChatMessage[] {
  const result: ChatMessage[] = [];

  for (const raw of rawMessages) {
    const match = BCDICE_NAME_PATTERN.exec(raw.characterName);
    const isDiceBot = raw.isDiceBot === true || match !== null;
    const targetName = (match ? (match[1] ?? match[2]) : undefined)?.trim();

    if (isDiceBot) {
      const diceResult = raw.text;
      const prev = result[result.length - 1];

      if (
        prev &&
        prev.channel === raw.channel &&
        prev.rollResult === undefined &&
        (targetName === undefined || prev.characterName === targetName)
      ) {
        prev.rollResult = diceResult;
        continue;
      }

      if (targetName) {
        result.push({
          channel: raw.channel,
          characterName: targetName,
          text: "",
          rollResult: diceResult,
        });
        continue;
      }

      continue;
    }

    result.push({
      channel: raw.channel,
      characterName: raw.characterName,
      text: raw.text,
      ...(raw.rollResult === undefined ? {} : { rollResult: raw.rollResult }),
    });
  }

  return result;
}
