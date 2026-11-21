import { act, useState } from "react";
import { createRoot } from "react-dom/client";
// @vitest-environment happy-dom
import { describe, expect, test } from "vite-plus/test";

import type { Edition } from "../domain/roll/types.ts";
import {
  type CheckSettings,
  DEFAULT_CHECK_SETTINGS,
  type GrowthSettings,
  defaultGrowthSettings,
} from "../domain/settings.ts";
import { SettingsModal } from "./SettingsModal.tsx";

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function renderModal(
  edition: Edition,
  initialCheck: CheckSettings = DEFAULT_CHECK_SETTINGS,
  initialGrowth: GrowthSettings = defaultGrowthSettings(edition),
) {
  let latestCheck = initialCheck;
  let latestGrowth = initialGrowth;

  function Harness() {
    const [checkSettings, setCheckSettings] = useState(initialCheck);
    const [growthSettings, setGrowthSettings] = useState(initialGrowth);
    return (
      <SettingsModal
        edition={edition}
        checkSettings={checkSettings}
        onCheckSettingsChange={(next) => {
          latestCheck = next;
          setCheckSettings(next);
        }}
        growthSettings={growthSettings}
        onGrowthSettingsChange={(next) => {
          latestGrowth = next;
          setGrowthSettings(next);
        }}
      />
    );
  }

  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);

  return {
    async open() {
      await act(async () => {
        root.render(<Harness />);
      });
      const trigger = [...container.querySelectorAll("button")].find((b) =>
        b.textContent?.includes("ハウスルール設定"),
      );
      await act(async () => {
        trigger?.click();
      });
    },
    getLatest() {
      return { checkSettings: latestCheck, growthSettings: latestGrowth };
    },
    async cleanup() {
      await act(async () => {
        root.unmount();
      });
      container.remove();
    },
  };
}

describe("SettingsModal", () => {
  test("版数ラベルとセクション見出しが要件通りに表示される", async () => {
    const harness = renderModal(7);
    await harness.open();

    const dialog = document.querySelector('[role="dialog"]');
    expect(dialog).not.toBeNull();

    const titles = [...(dialog?.querySelectorAll(".rule-group__title") ?? [])].map((el) =>
      el.textContent?.replace(/\s+/g, " ").trim(),
    );
    expect(titles).toContain("除外するロール");
    expect(titles).not.toContain("除外設定");
    expect(titles).toContain("幸運の回復 7版");
    expect(titles).not.toContain("幸運の成長設定");

    const labels = [...(dialog?.querySelectorAll(".rule-check-item") ?? [])].map((el) =>
      el.textContent?.replace(/\s+/g, " ").trim(),
    );
    expect(labels).toContain("イクストリーム成功 7版");
    expect(labels).toContain("ハード成功 7版");
    expect(labels).toContain("スペシャル 6版");
    expect(labels).not.toContain("スペシャル (6版)");
    expect(labels).toContain("信用 7版");

    const transferRow = [...(dialog?.querySelectorAll(".rule-check-item") ?? [])].find((el) =>
      el.textContent?.includes("専門分野：転換可能な技能"),
    );
    expect(transferRow?.textContent).toContain("7版");

    await harness.cleanup();
  });

  test("デフォルトに戻すボタンは変更後に有効になり、channels を維持して初期値へ戻す", async () => {
    const harness = renderModal(7, {
      ...DEFAULT_CHECK_SETTINGS,
      channels: ["メイン", "雑談"],
    });
    await harness.open();

    const findResetButton = () =>
      [...document.querySelectorAll('[role="dialog"] button')].find((b) =>
        b.textContent?.includes("デフォルトに戻す"),
      ) as HTMLButtonElement | undefined;

    expect(findResetButton()?.disabled).toBe(true);

    const fumbleCheckbox = [...document.querySelectorAll('[role="dialog"] label')]
      .find((l) => l.textContent?.includes("致命的失敗"))
      ?.querySelector('input[type="checkbox"]') as HTMLInputElement | null;
    await act(async () => {
      fumbleCheckbox?.click();
    });

    const preset1D6 = [...document.querySelectorAll('[role="dialog"] button')].find(
      (b) => b.textContent?.trim() === "1D6",
    ) as HTMLButtonElement | undefined;
    await act(async () => {
      preset1D6?.click();
    });

    expect(findResetButton()?.disabled).toBe(false);

    await act(async () => {
      findResetButton()?.click();
    });

    expect(harness.getLatest().checkSettings).toEqual({
      ...DEFAULT_CHECK_SETTINGS,
      channels: ["メイン", "雑談"],
    });
    expect(harness.getLatest().growthSettings).toEqual(defaultGrowthSettings(7));
    expect(findResetButton()?.disabled).toBe(true);

    await harness.cleanup();
  });

  test("6版ではデフォルトに戻すと6版のデフォルト成長設定に戻る", async () => {
    const harness = renderModal(6, DEFAULT_CHECK_SETTINGS, {
      ...defaultGrowthSettings(6),
      sanityRecoveryAt90: true,
      growthDice: "1D6",
    });
    await harness.open();

    const resetBtn = [...document.querySelectorAll('[role="dialog"] button')].find((b) =>
      b.textContent?.includes("デフォルトに戻す"),
    ) as HTMLButtonElement | undefined;
    expect(resetBtn?.disabled).toBe(false);

    await act(async () => {
      resetBtn?.click();
    });

    expect(harness.getLatest().growthSettings).toEqual(defaultGrowthSettings(6));
    expect(resetBtn?.disabled).toBe(true);

    await harness.cleanup();
  });
});
