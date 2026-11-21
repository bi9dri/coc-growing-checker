import type { ChatMessage } from "../log/types.ts";
import type { Edition, RollOutcome, SkillCategory, SkillRoll } from "./types.ts";

const COMMAND = /^(s)?(CCB|CC)([+-]?\d+)?<=(\d+)((?:[+\-*/]\d+)*)(?:\s+(.*))?$/i;

const BRACKETS: Record<string, string> = {
  "【": "】",
  "〈": "〉",
  "[": "]",
  "(": ")",
  "《": "》",
  "「": "」",
  "『": "』",
};

const OUTCOMES_7: Record<string, RollOutcome> = {
  クリティカル: "critical",
  イクストリーム成功: "extreme",
  ハード成功: "hard",
  レギュラー成功: "regular",
  ファンブル: "fumble",
  critical: "critical",
  "extreme success": "extreme",
  "hard success": "hard",
  "regular success": "regular",
  fumble: "fumble",
};

const OUTCOMES_6: Record<string, RollOutcome> = {
  "決定的成功/スペシャル": "critical",
  決定的成功: "critical",
  スペシャル: "special",
  成功: "regular",
  致命的失敗: "fumble",
  critical: "critical",
  special: "special",
  success: "regular",
  fumble: "fumble",
};

const SANITY = new Set([
  "正気度ロール",
  "正気度",
  "SAN",
  "SANチェック",
  "SANC",
  "SAN値",
  "SAN値チェック",
]);
const CHARACTERISTICS = new Set([
  "STR",
  "CON",
  "POW",
  "DEX",
  "APP",
  "SIZ",
  "INT",
  "EDU",
  "アイデア",
  "知識",
]);
const LUCK = new Set(["幸運", "LUCK"]);
const MYTHOS = new Set(["クトゥルフ神話", "神話技能", "CTHULHU MYTHOS", "MYTHOS"]);
const CREDIT_RATING = new Set(["信用", "CREDIT RATING"]);

function extractLabel(rest: string): string {
  const open = rest.charAt(0);
  const close = BRACKETS[open];
  if (close === undefined) return rest.split(/\s/, 1)[0] as string;

  let depth = 0;
  for (let i = 0; i < rest.length; i++) {
    const c = rest.charAt(i);
    if (c === open) depth++;
    else if (c === close && --depth === 0) return rest.slice(1, i).trim();
  }
  return rest.slice(1).split(/\s/, 1)[0] as string;
}

function parseOutcome(
  result: string,
  command: string,
): { outcome: RollOutcome; edition: Edition } | null {
  const tokens = result.split(/[＞>→]|->/);
  const label = (tokens.pop() as string).trim();
  const lower = label.toLowerCase();
  const isSixth = command.toUpperCase() === "CCB" || !result.includes("ボーナス・ペナルティダイス");
  if (label === "失敗" || lower === "failure")
    return { outcome: "failure", edition: isSixth ? 6 : 7 };

  if (command.toUpperCase() === "CCB") {
    const sixth = OUTCOMES_6[label] ?? OUTCOMES_6[lower];
    if (sixth) return { outcome: sixth, edition: 6 };
    const seventh = OUTCOMES_7[label] ?? OUTCOMES_7[lower];
    if (seventh) return { outcome: seventh, edition: 7 };
  } else {
    const seventh = OUTCOMES_7[label] ?? OUTCOMES_7[lower];
    if (seventh) return { outcome: seventh, edition: 7 };
    const sixth = OUTCOMES_6[label] ?? OUTCOMES_6[lower];
    if (sixth) return { outcome: sixth, edition: 6 };
  }
  return null;
}

function categorize(baseSkill: string): SkillCategory {
  const key = baseSkill
    .toUpperCase()
    .replace(/(?:\s*(?:ロール|判定|チェック))+$/, "")
    .replace(/(?:\s*(?:[×*✕✖/+-]|X)\s*\d+)+\s*倍?$/, "")
    .trim();
  if (SANITY.has(key)) return "sanity";
  if (CHARACTERISTICS.has(key)) return "characteristic";
  if (LUCK.has(key)) return "luck";
  if (MYTHOS.has(key)) return "mythos";
  if (CREDIT_RATING.has(key)) return "creditRating";
  return "skill";
}

export function parseSkillRoll(message: ChatMessage): SkillRoll | null {
  if (message.rollResult === undefined) return null;
  const command = COMMAND.exec(message.text.normalize("NFKC").trim());
  if (!command) return null;
  const [, secret, commandName, , value, , rest] = command;

  const rawLabel = rest === undefined ? "" : extractLabel(rest);
  const label = rawLabel.replace(/\(\s*\)$/, "").trim();
  if (label === "") return null;

  const outcome = parseOutcome(message.rollResult, commandName as string);
  if (!outcome) return null;

  const spec = /^(.+?)\((.+)\)$/.exec(label);
  const baseSkill = spec ? (spec[1] as string) : label;
  const specialization = spec?.[2];

  return {
    channel: message.channel,
    characterName: message.characterName,
    skillName: specialization === undefined ? baseSkill : `${baseSkill}（${specialization}）`,
    baseSkill,
    ...(specialization === undefined ? {} : { specialization }),
    skillValue: Number(value),
    ...outcome,
    category: categorize(baseSkill),
    secret: secret !== undefined,
  };
}
