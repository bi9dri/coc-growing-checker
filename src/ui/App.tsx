import { ArrowLeft, Check, Copy, Dices } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import logoSvg from "../assets/logo.svg";
import wordmarkSvg from "../assets/wordmark.svg";
import { createBcdiceRoller } from "../domain/dice/bcdiceRoller.ts";
import {
  type SkillEntry,
  collectCandidates,
  inferEdition,
} from "../domain/growth/collectCandidates.ts";
import { formatAllExport, formatCharacterExport } from "../domain/growth/formatExport.ts";
import { type SkillGrowth, rollGrowth } from "../domain/growth/rollGrowth.ts";
import { parseLog } from "../domain/log/parseLog.ts";
import { extractLogFromZip } from "../domain/log/unzip.ts";
import { parseSkillRoll } from "../domain/roll/parseSkillRoll.ts";
import type { Edition } from "../domain/roll/types.ts";
import {
  type CheckSettings,
  type GrowthSettings,
  DEFAULT_CHECK_SETTINGS,
  defaultGrowthSettings,
  resolveCheckSettings,
  resolveGrowthSettings,
} from "../domain/settings.ts";
import { CharacterGrowthView } from "./CharacterGrowthView.tsx";
import { LogDropzone } from "./LogDropzone.tsx";
import { SettingsModal } from "./SettingsModal.tsx";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./Tabs.tsx";
import { cn } from "./utils/cn.ts";

export function App() {
  const [rawLog, setRawLog] = useState<string | null>(null);
  const [logFileName, setLogFileName] = useState<string>("");
  const [checkSettings, setCheckSettings] = useState<CheckSettings>(DEFAULT_CHECK_SETTINGS);
  const [growthSettings, setGrowthSettings] = useState<GrowthSettings>(() =>
    defaultGrowthSettings(7),
  );
  const [activeTab, setActiveTab] = useState<string>("");
  const [exportScope, setExportScope] = useState<"single" | "all">("single");
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimerRef = useRef<number | null>(null);

  const [customCandidates, setCustomCandidates] = useState<Map<string, SkillEntry[]>>(
    () => new Map(),
  );
  const [characterGrowths, setCharacterGrowths] = useState<Map<string, Map<string, SkillGrowth>>>(
    () => new Map(),
  );

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    if (toastTimerRef.current !== null) {
      window.clearTimeout(toastTimerRef.current);
    }
    toastTimerRef.current = window.setTimeout(() => {
      setToastMessage(null);
    }, 2600);
  }, []);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current !== null) {
        window.clearTimeout(toastTimerRef.current);
      }
    };
  }, []);

  const { rolls, availableChannels, inferredEdition } = useMemo(() => {
    if (!rawLog) return { rolls: [], availableChannels: ["main"], inferredEdition: 7 as Edition };
    try {
      const messages = parseLog(rawLog);
      const parsedRolls = messages.flatMap((m) => {
        const r = parseSkillRoll(m);
        return r ? [r] : [];
      });
      const channels = [...new Set(messages.map((m) => m.channel).filter(Boolean))];
      return {
        rolls: parsedRolls,
        availableChannels: channels.length > 0 ? channels : ["main"],
        inferredEdition: inferEdition(parsedRolls),
      };
    } catch {
      return { rolls: [], availableChannels: ["main"], inferredEdition: 7 as Edition };
    }
  }, [rawLog]);

  const edition = inferredEdition;
  const effectiveCheckSettings = useMemo(
    () => resolveCheckSettings(checkSettings, edition),
    [checkSettings, edition],
  );
  const effectiveGrowthSettings = useMemo(
    () => resolveGrowthSettings(growthSettings, edition),
    [growthSettings, edition],
  );

  const characters = useMemo(() => {
    if (!rawLog) return [];
    const baseList = collectCandidates(rolls, effectiveCheckSettings);
    return baseList.map((c) => {
      const custom = customCandidates.get(c.characterName);
      return custom ? { ...c, candidates: custom } : c;
    });
  }, [rawLog, rolls, effectiveCheckSettings, customCandidates]);

  const totalCandidatesCount = useMemo(
    () => characters.reduce((sum, c) => sum + c.candidates.length, 0),
    [characters],
  );

  const handleLogLoad = useCallback(
    (content: string, filename: string) => {
      setRawLog(content);
      setLogFileName(filename);
      setCustomCandidates(new Map());
      setCharacterGrowths(new Map());

      try {
        const messages = parseLog(content);
        const channels = [...new Set(messages.map((m) => m.channel).filter(Boolean))];
        const initialChannels = channels.includes("main")
          ? ["main"]
          : channels.includes("メイン")
            ? ["メイン"]
            : channels.slice(0, 1);
        const nextCheckSettings: CheckSettings = { ...checkSettings, channels: initialChannels };
        setCheckSettings(nextCheckSettings);

        const parsedRolls = messages.flatMap((m) => {
          const r = parseSkillRoll(m);
          return r ? [r] : [];
        });
        const detectedEdition = inferEdition(parsedRolls);
        setGrowthSettings((prev) => ({
          ...prev,
          sanityRecoveryAt90: detectedEdition === 7,
        }));

        const cList = collectCandidates(
          parsedRolls,
          resolveCheckSettings(nextCheckSettings, detectedEdition),
        );
        if (cList[0]) setActiveTab(cList[0].characterName);
      } catch {}
      showToast(`${filename} を読み込みました`);
    },
    [checkSettings, showToast],
  );

  useEffect(() => {
    const handleWindowDragOver = (e: DragEvent) => {
      e.preventDefault();
    };
    const handleWindowDrop = async (e: DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer?.files?.[0];
      if (!file) return;

      if (file.name.toLowerCase().endsWith(".zip") || file.type.includes("zip")) {
        try {
          const buffer = await file.arrayBuffer();
          const { filename, content } = await extractLogFromZip(buffer);
          handleLogLoad(content, filename);
        } catch {}
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === "string") {
          handleLogLoad(reader.result, file.name);
        }
      };
      reader.readAsText(file);
    };
    window.addEventListener("dragover", handleWindowDragOver);
    window.addEventListener("drop", handleWindowDrop);
    return () => {
      window.removeEventListener("dragover", handleWindowDragOver);
      window.removeEventListener("drop", handleWindowDrop);
    };
  }, [handleLogLoad]);

  const handleUpdateCandidates = (characterName: string, updated: SkillEntry[]) => {
    setCustomCandidates((prev) => new Map(prev).set(characterName, updated));
  };

  const handleToggleChannel = (channel: string) => {
    const next = checkSettings.channels.includes(channel)
      ? checkSettings.channels.filter((c) => c !== channel)
      : [...checkSettings.channels, channel];
    setCheckSettings({ ...checkSettings, channels: next });
  };

  const handleRollAllCharacters = () => {
    const dice = createBcdiceRoller();
    const nextMap = new Map<string, Map<string, SkillGrowth>>();
    for (const c of characters) {
      if (c.candidates.length === 0) continue;
      const results = rollGrowth(c, effectiveGrowthSettings, edition, dice);
      const cMap = new Map<string, SkillGrowth>();
      for (const g of results) cMap.set(g.skillName, g);
      nextMap.set(c.characterName, cMap);
    }
    setCharacterGrowths(nextMap);
    showToast("全探索者を一括ロールしました");
  };

  const currentTabName = activeTab || characters[0]?.characterName || "";
  const activeCharacter =
    characters.find((c) => c.characterName === currentTabName) ?? characters[0];

  const exportText = useMemo(() => {
    if (characters.length === 0) return "";
    if (exportScope === "all" || !activeCharacter) {
      return formatAllExport(characters, characterGrowths);
    }
    return formatCharacterExport(
      activeCharacter,
      characterGrowths.get(activeCharacter.characterName) ?? new Map(),
    );
  }, [activeCharacter, characterGrowths, characters, exportScope]);

  const handleCopyPreview = () => {
    void navigator.clipboard?.writeText(exportText);
    showToast(
      exportScope === "all"
        ? "全員分の成長結果をコピーしました"
        : `${activeCharacter?.characterName ?? ""} の成長結果をコピーしました`,
    );
  };

  return (
    <div className="flex min-h-screen flex-col">
      <header className="site-header">
        <div className="tm-container header-inner">
          <div className="brand-group">
            <img src={logoSvg} alt="" aria-hidden="true" className="brand-logo" />
            <h1 className="brand-title">
              <img src={wordmarkSvg} alt="CoC 成長チェッカー" className="brand-wordmark" />
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <SettingsModal
              edition={edition}
              checkSettings={checkSettings}
              onCheckSettingsChange={setCheckSettings}
              growthSettings={growthSettings}
              onGrowthSettingsChange={setGrowthSettings}
            />
          </div>
        </div>
      </header>

      <main className="tm-container tm-main">
        {!rawLog ? (
          <LogDropzone onLoad={handleLogLoad} />
        ) : (
          <section aria-label="成長判定ワークスペース">
            <div className="file-status-bar">
              <div className="file-meta-group">
                <span className="file-name-text">{logFileName}</span>
                <span className="file-stat-pill" title="ログから自動判別されたルール版">
                  <span className="file-stat-pill__dot" aria-hidden="true" />第{edition}版
                </span>
                <div className="channel-strip" role="group" aria-label="対象チャンネル切替">
                  {availableChannels.map((ch) => {
                    const active = checkSettings.channels.includes(ch);
                    return (
                      <button
                        key={ch}
                        type="button"
                        onClick={() => handleToggleChannel(ch)}
                        aria-pressed={active}
                        className={cn("channel-chip", active && "is-active")}
                      >
                        {ch}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="file-actions">
                <button
                  type="button"
                  onClick={handleRollAllCharacters}
                  disabled={totalCandidatesCount === 0}
                  title={
                    totalCandidatesCount === 0
                      ? "成長対象の技能がありません"
                      : "全探索者の成長ロールを一括実行します"
                  }
                  className="tm-button tm-button-primary tm-button-sm"
                >
                  <Dices className="h-3.5 w-3.5" />
                  一括ロール (全員)
                </button>
                <button
                  type="button"
                  onClick={() => setRawLog(null)}
                  className="tm-button tm-button-secondary tm-button-sm"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  戻る
                </button>
              </div>
            </div>

            {characters.length === 0 ? (
              <div className="border border-dashed border-[var(--border)] bg-[var(--surface)] p-12 text-center text-sm text-[var(--muted)]">
                ログから条件に一致する探索者・ロールが見つかりませんでした。
                上部のチャンネル切替や右上の「ハウスルール設定」をご確認ください。
              </div>
            ) : (
              <>
                <Tabs value={currentTabName} onValueChange={setActiveTab} className="w-full">
                  <div className="tabs-header">
                    <TabsList>
                      {characters.map((c) => {
                        const cGrowths = characterGrowths.get(c.characterName);
                        const allRolled =
                          c.candidates.length > 0 &&
                          c.candidates.every((cand) => {
                            const g = cGrowths?.get(cand.skillName);
                            if (!g) return false;
                            if (growthSettings.experienceCheck && !g.check) return false;
                            if (g.check && !g.check.passed) return true;
                            return g.growth !== undefined;
                          });
                        return (
                          <TabsTrigger key={c.characterName} value={c.characterName}>
                            <span>{c.characterName}</span>
                            {allRolled && <span className="inv-tab__done-dot" title="判定完了" />}
                          </TabsTrigger>
                        );
                      })}
                    </TabsList>
                  </div>

                  {characters.map((c) => (
                    <TabsContent key={c.characterName} value={c.characterName}>
                      <div className="workspace-frame">
                        <CharacterGrowthView
                          character={c}
                          edition={edition}
                          growthSettings={effectiveGrowthSettings}
                          growths={characterGrowths.get(c.characterName) ?? new Map()}
                          onUpdateGrowths={(updatedMap) =>
                            setCharacterGrowths((prev) =>
                              new Map(prev).set(c.characterName, updatedMap),
                            )
                          }
                          onUpdateCandidates={(updated) =>
                            handleUpdateCandidates(c.characterName, updated)
                          }
                          onNotify={showToast}
                        />
                      </div>
                    </TabsContent>
                  ))}
                </Tabs>

                <div className="tm-code-window">
                  <div className="tm-code-header">
                    <div className="tm-code-header__left">
                      <span className="tm-code-dots" aria-hidden="true">
                        <span />
                        <span />
                        <span />
                      </span>
                      <span className="tm-code-title">
                        EXPORT PREVIEW —{" "}
                        {exportScope === "all" ? "全員まとめ" : activeCharacter?.characterName}
                      </span>
                    </div>
                    <div className="tm-code-controls">
                      <button
                        type="button"
                        onClick={() => setExportScope("single")}
                        className={cn("code-scope-btn", exportScope === "single" && "is-active")}
                      >
                        現在の探索者
                      </button>
                      <button
                        type="button"
                        onClick={() => setExportScope("all")}
                        className={cn("code-scope-btn", exportScope === "all" && "is-active")}
                      >
                        全員まとめ
                      </button>
                      <button type="button" onClick={handleCopyPreview} className="code-copy-btn">
                        <Copy className="h-3.5 w-3.5" />
                        コピー
                      </button>
                    </div>
                  </div>
                  <div className="tm-code-body">
                    <pre>{exportText}</pre>
                  </div>
                </div>
              </>
            )}
          </section>
        )}
      </main>

      {toastMessage && (
        <div className="toast-banner" role="status" aria-live="polite">
          <Check className="h-4 w-4 text-[var(--accent)]" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
