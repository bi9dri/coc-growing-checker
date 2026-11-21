import { Copy, Dices, GitFork, RotateCcw, Sparkles, Trash2 } from "lucide-react";
import { type KeyboardEvent, useState } from "react";

import { createBcdiceRoller } from "../domain/dice/bcdiceRoller.ts";
import type { CharacterCandidates, SkillEntry } from "../domain/growth/collectCandidates.ts";
import { formatCharacterExport } from "../domain/growth/formatExport.ts";
import {
  type SkillGrowth,
  getTransferGroup,
  isSkillEligibleForSanityRecovery,
  isTransferableSkill,
  rollGrowth,
  rollSingleExperienceCheck,
  rollSingleGrowthDice,
  rollSingleSanityRecovery,
  rollSingleSkill,
} from "../domain/growth/rollGrowth.ts";
import type { Edition } from "../domain/roll/types.ts";
import type { GrowthSettings } from "../domain/settings.ts";
import { cn } from "./utils/cn.ts";

interface CharacterGrowthViewProps {
  character: CharacterCandidates;
  edition: Edition;
  growthSettings: GrowthSettings;
  growths?: Map<string, SkillGrowth>;
  onUpdateGrowths?: (growths: Map<string, SkillGrowth>) => void;
  onUpdateCandidates: (updated: SkillEntry[]) => void;
  onNotify?: (message: string) => void;
}

const toGrowthMap = (results: SkillGrowth[]): Map<string, SkillGrowth> => {
  const map = new Map<string, SkillGrowth>();
  for (const g of results) map.set(g.skillName, g);
  return map;
};

export function CharacterGrowthView({
  character,
  edition,
  growthSettings,
  growths: externalGrowths,
  onUpdateGrowths,
  onUpdateCandidates,
  onNotify,
}: CharacterGrowthViewProps) {
  const [internalGrowths, setInternalGrowths] = useState<Map<string, SkillGrowth>>(new Map());
  const growths = externalGrowths ?? internalGrowths;
  const [newSkillName, setNewSkillName] = useState("");
  const [newSkillValue, setNewSkillValue] = useState(50);

  const updateGrowths = (
    updater:
      | Map<string, SkillGrowth>
      | ((prev: Map<string, SkillGrowth>) => Map<string, SkillGrowth>),
  ) => {
    const next = typeof updater === "function" ? updater(growths) : updater;
    if (onUpdateGrowths) {
      onUpdateGrowths(next);
    } else {
      setInternalGrowths(next);
    }
  };

  const handleRollAllForCharacter = () => {
    const dice = createBcdiceRoller();
    const results = rollGrowth(character, growthSettings, edition, dice);
    updateGrowths(toGrowthMap(results));
    onNotify?.(`${character.characterName} を一括ロールしました`);
  };

  const handleResetCharacter = () => {
    updateGrowths(new Map());
    onNotify?.(`${character.characterName} の判定をリセットしました`);
  };

  const handleCopyCharacter = () => {
    const text = formatCharacterExport(character, growths);
    void navigator.clipboard?.writeText(text);
    onNotify?.(`${character.characterName} の結果をコピーしました`);
  };

  const handleRollSingleCheck = (skillName: string) => {
    const dice = createBcdiceRoller();
    const results = rollSingleExperienceCheck(
      character,
      skillName,
      growthSettings,
      edition,
      dice,
      growths,
    );
    updateGrowths(toGrowthMap(results));
  };

  const handleRollSingleGrowth = (skillName: string) => {
    const dice = createBcdiceRoller();
    const results = rollSingleGrowthDice(character, skillName, growthSettings, dice, growths);
    updateGrowths(toGrowthMap(results));
  };

  const handleRollSingleSanity = (skillName: string) => {
    const dice = createBcdiceRoller();
    const results = rollSingleSanityRecovery(skillName, growthSettings, dice, growths);
    updateGrowths(toGrowthMap(results));
  };

  const handleRollSingleFull = (skillName: string) => {
    const dice = createBcdiceRoller();
    const results = rollSingleSkill(character, skillName, growthSettings, edition, dice, growths);
    updateGrowths(toGrowthMap(results));
    onNotify?.(`「${skillName}」をロールしました`);
  };

  const handleValueChange = (skillName: string, rawValue: number) => {
    const clamped = Math.max(1, Math.min(99, Number.isFinite(rawValue) ? rawValue : 1));
    onUpdateCandidates(
      character.candidates.map((c) =>
        c.skillName === skillName ? { ...c, skillValue: clamped } : c,
      ),
    );
  };

  const handleDelete = (skillName: string) => {
    onUpdateCandidates(character.candidates.filter((c) => c.skillName !== skillName));
    updateGrowths((prev) => {
      const next = new Map(prev);
      next.delete(skillName);
      return next;
    });
    onNotify?.(`「${skillName}」を候補から削除しました`);
  };

  const handleAddSkill = () => {
    const trimmed = newSkillName.trim();
    if (!trimmed) {
      onNotify?.("追加する技能名を入力してください");
      return;
    }
    const spec = /^(.+?)[（(](.+)[）)]$/.exec(trimmed);
    const baseSkill = spec ? (spec[1] as string).trim() : trimmed;
    const specialization = spec ? (spec[2] as string).trim() : undefined;
    const normalizedName = specialization ? `${baseSkill}（${specialization}）` : baseSkill;
    const clampedValue = Math.max(
      1,
      Math.min(99, Number.isFinite(newSkillValue) ? newSkillValue : 50),
    );

    if (character.candidates.some((c) => c.skillName === normalizedName)) {
      onNotify?.(`「${normalizedName}」はすでに候補に含まれています`);
      return;
    }

    const entry: SkillEntry = {
      skillName: normalizedName,
      baseSkill,
      ...(specialization ? { specialization } : {}),
      skillValue: clampedValue,
    };
    onUpdateCandidates([...character.candidates, entry]);
    setNewSkillName("");
    setNewSkillValue(50);
    onNotify?.(
      `${character.characterName} に「${normalizedName}（${clampedValue}%）」を追加しました`,
    );
  };

  const handleAddKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      const isImeComposing = e.nativeEvent.isComposing || e.keyCode === 229;
      if (isImeComposing) {
        return;
      }
      e.preventDefault();
      handleAddSkill();
    }
  };

  const candidateNames = new Set(character.candidates.map((c) => c.skillName));
  const transferOnlyGrowths = [...growths.values()].filter(
    (g) => g.source === "transfer" && !candidateNames.has(g.skillName) && g.transferBonus > 0,
  );

  const hasCandidates = character.candidates.length > 0;

  return (
    <div>
      <div className="action-bar justify-end" aria-label="探索者アクションバー">
        <div className="bulk-actions">
          <button
            type="button"
            onClick={handleResetCharacter}
            disabled={growths.size === 0}
            className="tm-button tm-button-secondary tm-button-sm"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            リセット
          </button>
          <button
            type="button"
            onClick={handleRollAllForCharacter}
            disabled={!hasCandidates}
            title="この探索者の全技能を一括ロールします"
            className="tm-button tm-button-accent tm-button-sm"
          >
            <Sparkles className="h-3.5 w-3.5" />
            一括ロール
          </button>
          <button
            type="button"
            onClick={handleCopyCharacter}
            className="tm-button tm-button-primary tm-button-sm"
          >
            <Copy className="h-3.5 w-3.5" />
            コピー
          </button>
        </div>
      </div>

      <div className="table-scroll">
        <table className="growth-table" aria-label="探索者技能成長テーブル">
          <thead>
            <tr>
              <th style={{ width: "26%" }}>技能名</th>
              <th className="col-num" style={{ width: "11%" }}>
                現在値
              </th>
              <th className="col-num" style={{ width: "22%" }}>
                上達チェック (1D100)
              </th>
              <th className="col-num" style={{ width: "16%" }}>
                成長値 ({growthSettings.growthDice})
              </th>
              <th className="col-num" style={{ width: "17%" }}>
                成長後
              </th>
              <th className="col-center" style={{ width: "8%" }}>
                操作
              </th>
            </tr>
          </thead>
          <tbody>
            {character.candidates.length === 0 && transferOnlyGrowths.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-sm text-[var(--muted)]">
                  成長候補の技能がありません。下のフォームから手動で技能を追加してください。
                </td>
              </tr>
            ) : (
              <>
                {character.candidates.map((candidate) => {
                  const growth = growths.get(candidate.skillName);
                  const isLuck = candidate.baseSkill === "幸運";
                  const isTransferable =
                    growthSettings.transferableSkills && isTransferableSkill(candidate);
                  const transferGroup = isTransferable ? getTransferGroup(candidate) : undefined;

                  const before = growth?.before ?? candidate.skillValue;
                  const after = growth?.after ?? candidate.skillValue;
                  const isGrown = after > before;

                  const canRollGrowth =
                    !growthSettings.experienceCheck || growth?.check?.passed === true;
                  const expAfter = growth ? growth.before + (growth.growth?.total ?? 0) : before;
                  const isSanEligible =
                    growthSettings.sanityRecoveryAt90 &&
                    growth?.source === "experience" &&
                    isSkillEligibleForSanityRecovery(growth.baseSkill) &&
                    growth.before < 90 &&
                    expAfter >= 90;

                  return (
                    <tr key={candidate.skillName} className={cn(isGrown && "row-grown")}>
                      <td>
                        <div className="skill-cell">
                          {isLuck && (
                            <span className="luck-icon" title="幸運">
                              ★
                            </span>
                          )}
                          <span className="skill-name">{candidate.skillName}</span>
                          {isTransferable && (
                            <span
                              className="tag-badge tag-badge--spillover"
                              title={`転換可能な専門技能：${transferGroup}系`}
                            >
                              <GitFork className="h-3 w-3" />
                              転換可能
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="text-right">
                        <input
                          type="number"
                          min={1}
                          max={99}
                          value={candidate.skillValue}
                          aria-label={`${candidate.skillName} の現在値`}
                          onChange={(e) =>
                            handleValueChange(candidate.skillName, Number(e.target.value))
                          }
                          className="val-input"
                        />
                      </td>

                      <td className="text-right">
                        <div className="check-result-box">
                          {!growthSettings.experienceCheck ? (
                            <span className="status-chip">省略</span>
                          ) : !growth?.check ? (
                            <button
                              type="button"
                              onClick={() => handleRollSingleCheck(candidate.skillName)}
                              className="tm-button tm-button-secondary tm-button-xs"
                            >
                              チェック
                            </button>
                          ) : (
                            <>
                              <span
                                className={cn(
                                  "tabular text-xs font-bold",
                                  !growth.check.passed && "text-[var(--muted)]",
                                )}
                              >
                                1D100 → {growth.check.roll.total}
                              </span>
                              <span
                                className={cn(
                                  "status-chip",
                                  growth.check.passed ? "status-chip--pass" : "status-chip--fail",
                                )}
                              >
                                {growth.check.passed ? "✓ 成長" : "成長なし"}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleRollSingleCheck(candidate.skillName)}
                                title={`${candidate.skillName} の上達チェックを再ロール`}
                                aria-label={`${candidate.skillName} の上達チェックを再ロール`}
                                className="icon-btn icon-btn-mini"
                              >
                                <RotateCcw className="h-3 w-3" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>

                      <td className="text-right">
                        <div className="check-result-box">
                          {!canRollGrowth ? (
                            <span className="tabular text-[var(--muted)]">—</span>
                          ) : !growth?.growth ? (
                            <button
                              type="button"
                              onClick={() => handleRollSingleGrowth(candidate.skillName)}
                              className="tm-button tm-button-secondary tm-button-xs"
                            >
                              {growthSettings.growthDice} ロール
                            </button>
                          ) : (
                            <>
                              <strong className="tabular text-[15px] text-[var(--accent)]">
                                +{growth.growth.total}
                              </strong>
                              <button
                                type="button"
                                onClick={() => handleRollSingleGrowth(candidate.skillName)}
                                title={`${candidate.skillName} の成長値を再ロール`}
                                aria-label={`${candidate.skillName} の成長値を再ロール`}
                                className="icon-btn icon-btn-mini"
                              >
                                <RotateCcw className="h-3 w-3" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>

                      <td className="text-right">
                        <div className="after-cell">
                          <span
                            className={cn("after-transition", isGrown && "after-transition--up")}
                          >
                            {before}% → {after}%
                          </span>
                          {isSanEligible &&
                            (growth.sanityRecovery ? (
                              <span className="bonus-pill bonus-pill--san">
                                SAN 2D6 (+{growth.sanityRecovery.total})
                                <button
                                  type="button"
                                  onClick={() => handleRollSingleSanity(candidate.skillName)}
                                  title="SAN回復を再ロール"
                                  aria-label={`${candidate.skillName} のSAN回復を再ロール`}
                                  className="ml-1 inline-flex items-center hover:opacity-75"
                                >
                                  <RotateCcw className="h-2.5 w-2.5" />
                                </button>
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleRollSingleSanity(candidate.skillName)}
                                className="tm-button tm-button-secondary tm-button-xs"
                              >
                                SAN回復 (2D6)
                              </button>
                            ))}
                          {growth && growth.transferBonus > 0 && (
                            <span className="bonus-pill bonus-pill--spill">
                              同分野 +{growth.transferBonus}
                            </span>
                          )}
                        </div>
                      </td>

                      <td>
                        <div className="row-actions">
                          <button
                            type="button"
                            onClick={() => handleRollSingleFull(candidate.skillName)}
                            title={`${candidate.skillName} を個別一括ロール`}
                            aria-label={`${candidate.skillName} を個別ロール`}
                            className="icon-btn"
                          >
                            <Dices className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(candidate.skillName)}
                            title="候補から削除"
                            aria-label={`${candidate.skillName} を削除`}
                            className="icon-btn icon-btn--del"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {transferOnlyGrowths.map((g) => (
                  <tr key={`transfer-${g.skillName}`} className="row-grown">
                    <td>
                      <div className="skill-cell">
                        <span className="skill-name">{g.skillName}</span>
                        <span className="tag-badge tag-badge--spillover">波及のみ</span>
                      </div>
                    </td>
                    <td className="tabular text-right font-bold">{g.before}%</td>
                    <td className="text-right">
                      <span className="status-chip">対象外</span>
                    </td>
                    <td className="tabular text-right text-[var(--muted)]">—</td>
                    <td className="text-right">
                      <div className="after-cell">
                        <span className="after-transition after-transition--up">
                          {g.before}% → {g.after}%
                        </span>
                        <span className="bonus-pill bonus-pill--spill">
                          同分野 +{g.transferBonus}
                        </span>
                      </div>
                    </td>
                    <td />
                  </tr>
                ))}
              </>
            )}
          </tbody>
        </table>
      </div>

      <div className="add-skill-bar" role="region" aria-label="技能を手動追加">
        <div className="flex-1 min-w-[180px]">
          <input
            type="text"
            placeholder="技能名（例: 図書館, 近接戦闘（剣）, 幸運）"
            value={newSkillName}
            onChange={(e) => setNewSkillName(e.target.value)}
            onKeyDown={handleAddKeyDown}
            className="form-input w-full"
          />
        </div>
        <div className="w-24">
          <input
            type="number"
            min={1}
            max={99}
            value={newSkillValue}
            onChange={(e) => setNewSkillValue(Number(e.target.value))}
            aria-label="追加する技能の現在値"
            className="form-input tabular w-full text-right font-bold"
          />
        </div>
        <button
          type="button"
          onClick={handleAddSkill}
          className="tm-button tm-button-primary"
          style={{ height: 40, minHeight: 40 }}
        >
          追加
        </button>
      </div>
    </div>
  );
}
