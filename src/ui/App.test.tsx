import { act } from "react";
import { createRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
// @vitest-environment happy-dom
import { describe, expect, test, vi } from "vite-plus/test";

import { DEFAULT_CHECK_SETTINGS, defaultGrowthSettings } from "../domain/settings.ts";
import { App } from "./App.tsx";
import { SettingsModal } from "./SettingsModal.tsx";

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe("App コンポーネント", () => {
  test("初期画面の要件を満たして描画する", () => {
    const html = renderToString(<App />);
    expect(html).toContain("CoC");
    expect(html).toContain("成長");
    expect(html).toContain("チェッカー");
    expect(html).toContain("ハウスルール設定");
    expect(html).toContain("ログファイルをドロップ");
    expect(html).toContain("サンプルログで試す");
    expect(html).toContain("ファイルがインターネット上にアップロードされることはありません");
    expect(html).not.toContain("選んだ");
    expect(html).toContain("端末内だけで安全に処理されます");
    expect(html).not.toContain("お使いの端末");

    const headerHtml = html.match(/<header[\s\S]*?<\/header>/)?.[0] ?? "";
    expect(headerHtml).toContain("brand-logo");
    expect(headerHtml).toContain("brand-wordmark");
    expect(headerHtml).not.toContain("brand-mark");
    expect(html).toContain("hero-wordmark");
    expect(headerHtml).not.toContain("自動判別");
    expect(headerHtml).not.toContain("第7版");
    expect(html).not.toContain("初期画面");
    expect(html).not.toContain("セッション画面");
    expect(html).not.toContain("SUPPORTED FORMAT");
    expect(html).not.toContain("PROCESS FLOW");
    expect(html).not.toContain("版数");
  });

  test("サンプルログを読み込むと結果画面へ遷移し、上達チェック・全員まとめコピー・戻るができる", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      configurable: true,
    });

    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(<App />);
    });

    const sampleBtn = [...container.querySelectorAll("button")].find((b) =>
      b.textContent?.includes("サンプルログで試す"),
    );
    expect(sampleBtn).toBeDefined();

    await act(async () => {
      sampleBtn?.click();
    });

    expect(container.textContent).toContain("sample_ccfolia.html");
    expect(container.textContent).toContain("第7版");
    expect(container.textContent).toContain("メイン");
    expect(container.textContent).toContain("雑談");
    expect(container.textContent).toContain("戻る");
    expect(container.textContent).toContain("上達チェック (1D100)");
    expect(container.textContent).toContain("一括ロール (全員)");

    expect(container.textContent).not.toContain("別のログを開く");
    expect(container.textContent).not.toContain("初期画面に戻る");
    expect(container.textContent).not.toContain("全員分をコピー");
    expect(container.textContent).not.toContain("経験チェック");

    const tabs = [...container.querySelectorAll('[role="tab"]')];
    expect(tabs.map((t) => t.textContent)).toEqual(["神崎 凛", "橘 悠真", "白石 透"]);
    expect(tabs[0]?.getAttribute("data-state")).toBe("active");

    expect(container.textContent).toContain("近接戦闘（格闘）");
    expect(container.textContent).toContain("目星");
    expect(container.textContent).toContain("威圧");

    const checkBtn = [...container.querySelectorAll("button")].find(
      (b) => b.textContent?.trim() === "チェック",
    );
    expect(checkBtn).toBeDefined();
    await act(async () => {
      checkBtn?.click();
    });
    expect(container.textContent).toMatch(/✓ 成長|成長なし/);

    const allScopeBtn = [...container.querySelectorAll("button")].find(
      (b) => b.textContent?.trim() === "全員まとめ",
    );
    await act(async () => {
      allScopeBtn?.click();
    });
    const codeWindow = container.querySelector(".tm-code-window");
    const copyPreviewBtn = codeWindow?.querySelector(".code-copy-btn") as HTMLButtonElement | null;
    await act(async () => {
      copyPreviewBtn?.click();
    });
    expect(writeText).toHaveBeenCalledTimes(1);
    const copied = writeText.mock.calls[0]?.[0] as string;
    expect(copied).toContain("【橘 悠真】");
    expect(copied).toContain("【神崎 凛】");
    expect(copied).toContain("【白石 透】");
    expect(copied).toContain("・近接戦闘（格闘）");
    expect(copied).toContain("・回避");
    expect(copied).toContain("・芸術/製作（絵画）");
    expect(copied).not.toContain("sample_ccfolia.html");
    expect(copied).not.toContain("────");
    expect(copied).not.toContain("合計獲得");

    const backBtn = [...container.querySelectorAll("button")].find(
      (b) => b.textContent?.trim() === "戻る",
    );
    await act(async () => {
      backBtn?.click();
    });
    expect(container.textContent).toContain("ログファイルをドロップ");

    await act(async () => {
      root.unmount();
    });
    container.remove();
  });

  test("幸運の回復・転換可能な技能は7版でのみ有効で、6版では無効化される", async () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <SettingsModal
          edition={6}
          checkSettings={DEFAULT_CHECK_SETTINGS}
          onCheckSettingsChange={() => {}}
          growthSettings={{ ...defaultGrowthSettings(6), transferableSkills: true }}
          onGrowthSettingsChange={() => {}}
        />,
      );
    });

    const settingsBtn = [...container.querySelectorAll("button")].find((b) =>
      b.textContent?.includes("ハウスルール設定"),
    );
    await act(async () => {
      settingsBtn?.click();
    });

    const luckSwitch6 = document.querySelector(
      '[aria-label="幸運の回復"]',
    ) as HTMLButtonElement | null;
    const transferSwitch6 = document.querySelector(
      '[aria-label="専門分野：転換可能な技能 (+10%)"]',
    ) as HTMLButtonElement | null;
    expect(luckSwitch6?.disabled).toBe(true);
    expect(luckSwitch6?.getAttribute("data-state")).toBe("unchecked");
    expect(transferSwitch6?.disabled).toBe(true);
    expect(transferSwitch6?.getAttribute("data-state")).toBe("unchecked");
    expect(document.body.textContent).toContain("7版のみ有効");
    expect(document.body.textContent).not.toContain("回復する条件");

    await act(async () => {
      root.render(
        <SettingsModal
          edition={7}
          checkSettings={DEFAULT_CHECK_SETTINGS}
          onCheckSettingsChange={() => {}}
          growthSettings={{ ...defaultGrowthSettings(7), transferableSkills: true }}
          onGrowthSettingsChange={() => {}}
        />,
      );
    });
    const luckSwitch7 = document.querySelector(
      '[aria-label="幸運の回復"]',
    ) as HTMLButtonElement | null;
    const transferSwitch7 = document.querySelector(
      '[aria-label="専門分野：転換可能な技能 (+10%)"]',
    ) as HTMLButtonElement | null;
    expect(luckSwitch7?.disabled).toBe(false);
    expect(luckSwitch7?.getAttribute("data-state")).toBe("checked");
    expect(transferSwitch7?.disabled).toBe(false);
    expect(transferSwitch7?.getAttribute("data-state")).toBe("checked");
    expect(document.body.textContent).toContain("回復する条件");

    await act(async () => {
      root.unmount();
    });

    const appRoot = createRoot(container);
    await act(async () => {
      appRoot.render(<App />);
    });

    const sixthEditionLog = JSON.stringify({
      messages: [
        {
          name: "探索者A",
          text: "CCB<=60 【目星】",
          extend: { roll: { result: "(1D100<=60) ＞ 20 ＞ 成功" } },
          channel: "main",
          channelName: "main",
        },
        {
          name: "探索者A",
          text: "CCB<=50 【幸運】",
          extend: { roll: { result: "(1D100<=50) ＞ 10 ＞ 成功" } },
          channel: "main",
          channelName: "main",
        },
      ],
    });
    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File([sixthEditionLog], "coc6.json", { type: "application/json" });
    Object.defineProperty(fileInput, "files", { value: [file], configurable: true });
    await act(async () => {
      fileInput.dispatchEvent(new Event("change", { bubbles: true }));
      await new Promise((r) => setTimeout(r, 30));
    });

    expect(container.textContent).toContain("第6版");
    expect(container.textContent).toContain("目星");
    expect(container.textContent).not.toContain("★");

    await act(async () => {
      appRoot.unmount();
    });
    container.remove();
  });
});
