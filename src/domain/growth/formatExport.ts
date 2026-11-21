import type { CharacterCandidates } from "./collectCandidates.ts";
import type { SkillGrowth } from "./rollGrowth.ts";

function formatGrowthLine(skillName: string, g: SkillGrowth | undefined): string {
  if (!g) {
    return `・${skillName}`;
  }

  const checkPart = g.check
    ? `1D100=${g.check.roll.total} [${g.check.passed ? "成長" : "成長なし"}]`
    : undefined;

  if (g.check && !g.check.passed) {
    return `・${skillName}: ${checkPart}`;
  }

  if (!g.growth && g.transferBonus === 0) {
    return checkPart ? `・${skillName}: ${checkPart}` : `・${skillName}`;
  }

  const parts: string[] = [];
  if (checkPart) parts.push(checkPart);
  if (g.growth) parts.push(`+${g.growth.total}%`);
  if (g.transferBonus > 0) parts.push(`+${g.transferBonus}% 波及`);

  const extras: string[] = [];
  if (g.sanityRecovery) {
    extras.push(`SAN回復: 2D6=+${g.sanityRecovery.total}`);
  }
  const extraSuffix = extras.length > 0 ? ` ｜ ${extras.join(" / ")}` : "";

  return `・${skillName}: ${parts.join(" → ")} (${g.before}% → ${g.after}%)${extraSuffix}`;
}

export function formatCharacterExport(
  character: CharacterCandidates,
  growths: Map<string, SkillGrowth>,
): string {
  const lines = [`【${character.characterName}】`];
  const candidateNames = new Set(character.candidates.map((c) => c.skillName));

  for (const c of character.candidates) {
    lines.push(formatGrowthLine(c.skillName, growths.get(c.skillName)));
  }

  for (const g of growths.values()) {
    if (g.source === "transfer" && !candidateNames.has(g.skillName) && g.transferBonus > 0) {
      lines.push(formatGrowthLine(g.skillName, g));
    }
  }

  return lines.join("\n");
}

export function formatAllExport(
  characters: CharacterCandidates[],
  growthsByCharacter: Map<string, Map<string, SkillGrowth>>,
): string {
  return characters
    .map((c) => formatCharacterExport(c, growthsByCharacter.get(c.characterName) ?? new Map()))
    .join("\n\n");
}
