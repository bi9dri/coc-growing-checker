import type { ChatMessage } from "../types.ts";

const normalizeSpaces = (s: string) =>
  s
    .replace(/\u00a0/g, " ")
    .replace(/[ \t\r\n]+/g, " ")
    .trim();

export function parseTekeyHtml(doc: Document): ChatMessage[] {
  const tabMap = new Map<string, string>();
  for (const label of doc.querySelectorAll(".tab-list label.tab-checkbox")) {
    const input = label.querySelector("input[id]");
    if (input) {
      const id = input.id.trim();
      const name = normalizeSpaces(label.textContent);
      if (id && name) tabMap.set(id, name);
    }
  }

  if (!tabMap.has("tab1")) tabMap.set("tab1", "メイン");
  if (!tabMap.has("tab2")) tabMap.set("tab2", "サブ");
  if (!tabMap.has("tab3")) tabMap.set("tab3", "雑談");

  const chatlog = doc.querySelector(".chatlog");
  if (!chatlog) return [];

  const messages: ChatMessage[] = [];

  for (const div of chatlog.children) {
    if (div.tagName.toLowerCase() !== "div") continue;

    let channel = "main";
    for (const cls of div.classList) {
      if (tabMap.has(cls)) {
        channel = tabMap.get(cls) as string;
        break;
      }
    }

    const bEl = div.querySelector(":scope > b");
    if (!bEl) continue;

    const rawName = normalizeSpaces(bEl.textContent)
      .replace(/[：:]$/, "")
      .trim();
    if (!rawName) continue;

    const clone = div.cloneNode(true) as HTMLElement;
    for (const child of Array.from(clone.children)) {
      const tag = child.tagName.toLowerCase();
      if (tag === "b" || tag === "span") {
        child.remove();
      }
    }

    const parts = clone.innerHTML
      .split(/<br\s*\/?>/i)
      .map((p) => {
        const tmp = doc.createElement("div");
        tmp.innerHTML = p;
        return normalizeSpaces(tmp.textContent);
      })
      .filter(Boolean);

    if (parts.length === 0) continue;

    const text = parts[0] as string;
    const rollResult = parts.slice(1).join(" ") || undefined;

    if (rawName === "Tekey" && text.includes("ログインしました")) {
      continue;
    }

    messages.push({
      channel,
      characterName: rawName,
      text,
      ...(rollResult === undefined ? {} : { rollResult }),
    });
  }

  return messages;
}
