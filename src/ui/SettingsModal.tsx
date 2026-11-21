import * as Dialog from "@radix-ui/react-dialog";
import { RotateCcw, Settings, X } from "lucide-react";

import type { Edition, RollOutcome } from "../domain/roll/types.ts";
import {
  type CheckSettings,
  type GrowthSettings,
  defaultGrowthSettings,
  isDefaultSettings,
  resetCheckSettings,
} from "../domain/settings.ts";
import { Switch } from "./Switch.tsx";
import { cn } from "./utils/cn.ts";

interface SettingsModalProps {
  edition: Edition;
  checkSettings: CheckSettings;
  onCheckSettingsChange: (s: CheckSettings) => void;
  growthSettings: GrowthSettings;
  onGrowthSettingsChange: (s: GrowthSettings) => void;
}

const OUTCOMES: { key: RollOutcome; label: string; edition?: Edition }[] = [
  { key: "critical", label: "決定的成功 (クリティカル)" },
  { key: "extreme", label: "イクストリーム成功", edition: 7 },
  { key: "hard", label: "ハード成功", edition: 7 },
  { key: "special", label: "スペシャル", edition: 6 },
  { key: "regular", label: "通常成功 / レギュラー成功" },
  { key: "failure", label: "失敗" },
  { key: "fumble", label: "致命的失敗 (ファンブル)" },
];

const GROWTH_DICE_PRESETS = [
  { value: "1D10", label: "1D10" },
  { value: "1D6", label: "1D6" },
  { value: "5", label: "+5 固定" },
] as const;

function EditionBadge({ edition }: { edition: Edition }) {
  return <span className="tag-badge">{edition}版</span>;
}

export function SettingsModal({
  edition,
  checkSettings,
  onCheckSettingsChange,
  growthSettings,
  onGrowthSettingsChange,
}: SettingsModalProps) {
  const isSeventhEdition = edition === 7;
  const luckEnabled = isSeventhEdition && !checkSettings.exclude.luck;
  const isDefault = isDefaultSettings(checkSettings, growthSettings, edition);

  const toggleOutcome = (outcome: RollOutcome) => {
    const next = checkSettings.eligibleOutcomes.includes(outcome)
      ? checkSettings.eligibleOutcomes.filter((o) => o !== outcome)
      : [...checkSettings.eligibleOutcomes, outcome];
    onCheckSettingsChange({ ...checkSettings, eligibleOutcomes: next });
  };

  const toggleExclude = (key: keyof CheckSettings["exclude"], checked: boolean) => {
    onCheckSettingsChange({
      ...checkSettings,
      exclude: { ...checkSettings.exclude, [key]: checked },
    });
  };

  const handleReset = () => {
    onCheckSettingsChange(resetCheckSettings(checkSettings));
    onGrowthSettingsChange(defaultGrowthSettings(edition));
  };

  return (
    <Dialog.Root>
      <Dialog.Trigger asChild>
        <button type="button" className="tm-button tm-button-secondary tm-button-sm">
          <Settings className="h-3.5 w-3.5" aria-hidden="true" />
          ハウスルール設定
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="rules-dialog-overlay" />
        <Dialog.Content className="rules-dialog-content">
          <div className="dialog-header">
            <Dialog.Title asChild>
              <h2>ハウスルール設定</h2>
            </Dialog.Title>
            <Dialog.Close asChild>
              <button type="button" className="icon-btn" aria-label="設定を閉じる">
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </Dialog.Close>
          </div>

          <div className="dialog-body text-sm">
            <div className="rule-group">
              <div className="rule-group__title">成長対象とする判定結果</div>
              <div className="rule-options-grid">
                {OUTCOMES.map(({ key, label, edition: outcomeEdition }) => {
                  const active = checkSettings.eligibleOutcomes.includes(key);
                  return (
                    <label key={key} className={cn("rule-check-item", active && "is-active")}>
                      <input type="checkbox" checked={active} onChange={() => toggleOutcome(key)} />
                      <span className="inline-flex flex-wrap items-center gap-1.5">
                        <span>{label}</span>
                        {outcomeEdition && (
                          <>
                            {" "}
                            <EditionBadge edition={outcomeEdition} />
                          </>
                        )}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="rule-group">
              <div className="rule-group__title">除外するロール</div>
              <div className="rule-options-grid">
                <label className="rule-check-item">
                  <input
                    type="checkbox"
                    checked={checkSettings.exclude.sanity}
                    onChange={(e) => toggleExclude("sanity", e.target.checked)}
                  />
                  <span>SANチェック</span>
                </label>
                <label className="rule-check-item">
                  <input
                    type="checkbox"
                    checked={checkSettings.exclude.characteristic}
                    onChange={(e) => toggleExclude("characteristic", e.target.checked)}
                  />
                  <span>能力値 / アイデア / 知識</span>
                </label>
                <label className="rule-check-item">
                  <input
                    type="checkbox"
                    checked={checkSettings.exclude.secret}
                    onChange={(e) => toggleExclude("secret", e.target.checked)}
                  />
                  <span>シークレットダイス (sCC)</span>
                </label>
                <label className="rule-check-item">
                  <input
                    type="checkbox"
                    checked={checkSettings.exclude.mythos}
                    onChange={(e) => toggleExclude("mythos", e.target.checked)}
                  />
                  <span>クトゥルフ神話技能</span>
                </label>
                <label className="rule-check-item">
                  <input
                    type="checkbox"
                    checked={checkSettings.exclude.creditRating}
                    onChange={(e) => toggleExclude("creditRating", e.target.checked)}
                  />
                  <span className="inline-flex flex-wrap items-center gap-1.5">
                    <span>信用</span> <EditionBadge edition={7} />
                  </span>
                </label>
              </div>
            </div>

            <div className="rule-row-split">
              <div className="rule-group space-y-3">
                <div className="rule-group__title">
                  <span>幸運の回復</span> <EditionBadge edition={7} />
                </div>
                <div
                  className={cn(
                    "flex items-center justify-between gap-3 border border-[var(--border-soft)] bg-[var(--surface)] px-3 py-2",
                    !isSeventhEdition && "opacity-60",
                  )}
                >
                  <div>
                    <div className="text-[13px] font-bold">幸運の回復</div>
                    {!isSeventhEdition && (
                      <div className="text-[11px] text-[var(--muted)]">7版のみ有効</div>
                    )}
                  </div>
                  <Switch
                    aria-label="幸運の回復"
                    checked={luckEnabled}
                    disabled={!isSeventhEdition}
                    onCheckedChange={(checked) => toggleExclude("luck", !checked)}
                  />
                </div>
                {luckEnabled && (
                  <div className="space-y-1.5">
                    <div className="text-[11px] font-bold text-[var(--muted)]">回復する条件</div>
                    <label className="rule-check-item">
                      <input
                        type="radio"
                        name="luckCondition"
                        checked={checkSettings.luckCandidateCondition === "all"}
                        onChange={() =>
                          onCheckSettingsChange({
                            ...checkSettings,
                            luckCandidateCondition: "all",
                          })
                        }
                      />
                      <span className="text-[12px]">無条件で回復</span>
                    </label>
                    <label className="rule-check-item">
                      <input
                        type="radio"
                        name="luckCondition"
                        checked={checkSettings.luckCandidateCondition === "unconditional"}
                        onChange={() =>
                          onCheckSettingsChange({
                            ...checkSettings,
                            luckCandidateCondition: "unconditional",
                          })
                        }
                      />
                      <span className="text-[12px]">幸運ロールがあれば回復</span>
                    </label>
                    <label className="rule-check-item">
                      <input
                        type="radio"
                        name="luckCondition"
                        checked={checkSettings.luckCandidateCondition === "outcome"}
                        onChange={() =>
                          onCheckSettingsChange({
                            ...checkSettings,
                            luckCandidateCondition: "outcome",
                          })
                        }
                      />
                      <span className="text-[12px]">幸運ロールが成功していたら回復</span>
                    </label>
                  </div>
                )}
              </div>

              <div className="rule-group space-y-3">
                <div className="rule-group__title">上昇値</div>
                <div className="flex items-center justify-between gap-3 border border-[var(--border-soft)] bg-[var(--surface)] px-3 py-2">
                  <div>
                    <div className="text-[13px] font-bold">上達チェック (1D100)</div>
                    <div className="text-[11px] text-[var(--muted)]">OFFで無条件成長</div>
                  </div>
                  <Switch
                    checked={growthSettings.experienceCheck}
                    onCheckedChange={(checked) =>
                      onGrowthSettingsChange({ ...growthSettings, experienceCheck: checked })
                    }
                  />
                </div>

                <div className="space-y-1.5">
                  <label
                    htmlFor="ruleGrowthDice"
                    className="block text-[11px] font-bold text-[var(--muted)]"
                  >
                    成長ダイス
                  </label>
                  <div className="flex gap-2">
                    <input
                      id="ruleGrowthDice"
                      type="text"
                      value={growthSettings.growthDice}
                      onChange={(e) =>
                        onGrowthSettingsChange({ ...growthSettings, growthDice: e.target.value })
                      }
                      className="form-input tabular w-24 font-bold"
                      placeholder="1D10"
                    />
                    <div className="flex flex-wrap gap-1">
                      {GROWTH_DICE_PRESETS.map((preset) => (
                        <button
                          key={preset.value}
                          type="button"
                          onClick={() =>
                            onGrowthSettingsChange({
                              ...growthSettings,
                              growthDice: preset.value,
                            })
                          }
                          className={cn(
                            "channel-chip",
                            growthSettings.growthDice === preset.value && "is-active",
                          )}
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="rule-group">
              <div className="rule-group__title">その他</div>
              <div className="grid gap-2.5">
                <label className="rule-check-item justify-between">
                  <div>
                    <div className="font-bold">90%到達時の SAN 回復 (2D6)</div>
                    <div className="text-[11px] text-[var(--muted)]">
                      技能値が90未満から90以上に成長した際に2D6回復
                    </div>
                  </div>
                  <Switch
                    checked={growthSettings.sanityRecoveryAt90}
                    onCheckedChange={(checked) =>
                      onGrowthSettingsChange({
                        ...growthSettings,
                        sanityRecoveryAt90: checked,
                      })
                    }
                  />
                </label>

                <label
                  className={cn(
                    "rule-check-item justify-between",
                    !isSeventhEdition && "is-disabled",
                  )}
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-1.5 font-bold">
                      <span>専門分野：転換可能な技能 (+10%)</span> <EditionBadge edition={7} />
                    </div>
                    <div className="text-[11px] text-[var(--muted)]">
                      {isSeventhEdition
                        ? "近接戦闘・射撃・言語・サバイバルの専門技能が50%/90%到達時に同分野の技能が+10%"
                        : "7版のみ有効（近接戦闘・射撃・言語・サバイバルの専門技能が50%/90%到達時に+10%）"}
                    </div>
                  </div>
                  <Switch
                    aria-label="専門分野：転換可能な技能 (+10%)"
                    checked={isSeventhEdition && growthSettings.transferableSkills}
                    disabled={!isSeventhEdition}
                    onCheckedChange={(checked) =>
                      onGrowthSettingsChange({
                        ...growthSettings,
                        transferableSkills: checked,
                      })
                    }
                  />
                </label>
              </div>
            </div>
          </div>

          <div className="dialog-footer">
            <button
              type="button"
              onClick={handleReset}
              disabled={isDefault}
              className="tm-button tm-button-secondary tm-button-sm"
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
              デフォルトに戻す
            </button>
            <Dialog.Close asChild>
              <button type="button" className="tm-button tm-button-primary tm-button-sm">
                閉じる
              </button>
            </Dialog.Close>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
