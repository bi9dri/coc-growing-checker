import { act } from "react";
import { createRoot } from "react-dom/client";
// @vitest-environment happy-dom
import { describe, expect, test, vi } from "vite-plus/test";

import type { CharacterCandidates } from "../domain/growth/collectCandidates.ts";
import { defaultGrowthSettings } from "../domain/settings.ts";
import { CharacterGrowthView } from "./CharacterGrowthView.tsx";

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe("CharacterGrowthView", () => {
  const dummyCharacter: CharacterCandidates = {
    characterName: "テスト探索者",
    candidates: [],
    knownSkills: [],
  };

  test("IME変換中 (isComposing=true) のEnter押下では技能追加が実行されない", async () => {
    const onUpdateCandidates = vi.fn();
    const onNotify = vi.fn();
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <CharacterGrowthView
          character={dummyCharacter}
          edition={7}
          growthSettings={defaultGrowthSettings(7)}
          onUpdateCandidates={onUpdateCandidates}
          onNotify={onNotify}
        />,
      );
    });

    const input = container.querySelector(
      'input[placeholder^="技能名"]',
    ) as HTMLInputElement | null;
    expect(input).not.toBeNull();

    await act(async () => {
      if (input) {
        const descriptor = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value");
        // oxlint-disable-next-line typescript/unbound-method
        descriptor?.set?.call(input, "目星");
        input.dispatchEvent(new Event("input", { bubbles: true }));
      }
    });

    await act(async () => {
      const event = new KeyboardEvent("keydown", {
        key: "Enter",
        bubbles: true,
        cancelable: true,
      });
      Object.defineProperty(event, "isComposing", { value: true });
      input?.dispatchEvent(event);
    });

    expect(onUpdateCandidates).not.toHaveBeenCalled();

    const VK_PROCESSKEY = 229;
    await act(async () => {
      const event = new KeyboardEvent("keydown", {
        key: "Enter",
        bubbles: true,
        cancelable: true,
      });
      Object.defineProperty(event, "keyCode", { value: VK_PROCESSKEY });
      Object.defineProperty(event, "isComposing", { value: false });
      input?.dispatchEvent(event);
    });

    expect(onUpdateCandidates).not.toHaveBeenCalled();

    const VK_RETURN = 13;
    await act(async () => {
      const event = new KeyboardEvent("keydown", {
        key: "Enter",
        bubbles: true,
        cancelable: true,
      });
      Object.defineProperty(event, "keyCode", { value: VK_RETURN });
      Object.defineProperty(event, "isComposing", { value: false });
      input?.dispatchEvent(event);
    });

    expect(onUpdateCandidates).toHaveBeenCalledTimes(1);
    expect(onUpdateCandidates).toHaveBeenCalledWith([
      {
        skillName: "目星",
        baseSkill: "目星",
        skillValue: 50,
      },
    ]);

    await act(async () => {
      root.unmount();
    });
    container.remove();
  });
});
