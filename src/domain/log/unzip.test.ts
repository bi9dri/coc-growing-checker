import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, test } from "vite-plus/test";

import { extractLogFromZip, unzipFiles } from "./unzip.ts";

const FIXTURES_DIR = join(process.cwd(), "test/fixtures");

const readZip = (name: string): ArrayBuffer => {
  const buf = readFileSync(join(FIXTURES_DIR, name));
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
};

function createTestZip(entries: { name: string; content: string; method?: number }[]): ArrayBuffer {
  const encoder = new TextEncoder();
  const fileChunks: Uint8Array[] = [];
  const cdChunks: Uint8Array[] = [];

  let offset = 0;
  for (const entry of entries) {
    const nameBytes = encoder.encode(entry.name);
    const contentBytes = encoder.encode(entry.content);
    const method = entry.method ?? 0;

    const localHeader = new Uint8Array(30 + nameBytes.length + contentBytes.length);
    const lv = new DataView(localHeader.buffer);
    lv.setUint32(0, 0x04034b50, true);
    lv.setUint16(8, method, true);
    lv.setUint32(18, contentBytes.length, true);
    lv.setUint32(22, contentBytes.length, true);
    lv.setUint16(26, nameBytes.length, true);
    localHeader.set(nameBytes, 30);
    localHeader.set(contentBytes, 30 + nameBytes.length);
    fileChunks.push(localHeader);

    const cdHeader = new Uint8Array(46 + nameBytes.length);
    const cv = new DataView(cdHeader.buffer);
    cv.setUint32(0, 0x02014b50, true);
    cv.setUint16(10, method, true);
    cv.setUint32(20, contentBytes.length, true);
    cv.setUint32(24, contentBytes.length, true);
    cv.setUint16(28, nameBytes.length, true);
    cv.setUint32(42, offset, true);
    cdHeader.set(nameBytes, 46);
    cdChunks.push(cdHeader);

    offset += localHeader.length;
  }

  const filesTotalLen = fileChunks.reduce((acc, c) => acc + c.length, 0);
  const cdTotalLen = cdChunks.reduce((acc, c) => acc + c.length, 0);

  const eocd = new Uint8Array(22);
  const ev = new DataView(eocd.buffer);
  ev.setUint32(0, 0x06054b50, true);
  ev.setUint16(8, entries.length, true);
  ev.setUint16(10, entries.length, true);
  ev.setUint32(12, cdTotalLen, true);
  ev.setUint32(16, filesTotalLen, true);

  const total = new Uint8Array(filesTotalLen + cdTotalLen + 22);
  let pos = 0;
  for (const chunk of fileChunks) {
    total.set(chunk, pos);
    pos += chunk.length;
  }
  for (const chunk of cdChunks) {
    total.set(chunk, pos);
    pos += chunk.length;
  }
  total.set(eocd, pos);

  return total.buffer;
}

describe("unzipFiles", () => {
  test("ccfolia_html.zip を解凍してすべてのファイルを取得できる", async () => {
    const zipBuffer = readZip("ccfolia_html.zip");
    const files = await unzipFiles(zipBuffer);
    expect(files.length).toBe(4);
    const names = files.map((f) => f.name);
    expect(names.some((n) => n.includes("すべて"))).toBe(true);
    expect(names.some((n) => n.includes("メイン"))).toBe(true);
  });

  test("udonarium.zip を解凍して data.xml を取得できる", async () => {
    const zipBuffer = readZip("udonarium.zip");
    const files = await unzipFiles(zipBuffer);
    expect(files.length).toBe(1);
    expect(files[0]?.name).toBe("data.xml");
    expect(files[0]?.text).toContain("<chat-tab");
  });

  test("ZIP以外のバイナリが渡された場合はエラーを投げる", async () => {
    const invalid = new Uint8Array([0, 1, 2, 3]).buffer;
    await expect(unzipFiles(invalid)).rejects.toThrow("有効なZIPファイルではありません");
  });

  test("EOCDの末尾にコメント等がある場合も正しくEOCDを検出する", async () => {
    const zip = createTestZip([{ name: "test.txt", content: "hello" }]);
    const padded = new Uint8Array(zip.byteLength + 10);
    padded.set(new Uint8Array(zip), 0);
    const files = await unzipFiles(padded.buffer);
    expect(files[0]?.name).toBe("test.txt");
  });

  test("未対応の圧縮メソッドの場合はエラーを投げる", async () => {
    const zip = createTestZip([{ name: "test.txt", content: "hello", method: 99 }]);
    await expect(unzipFiles(zip)).rejects.toThrow("サポートされていないZIP圧縮形式です: 99");
  });

  test("CDシグネチャが壊れている場合はエントリ読み込みを終了する", async () => {
    const zip = createTestZip([{ name: "test.txt", content: "hello" }]);
    const bytes = new Uint8Array(zip);
    const eocdOffset = bytes.length - 22;
    const view = new DataView(bytes.buffer);
    const cdOffset = view.getUint32(eocdOffset + 16, true);
    bytes[cdOffset] = 0x00;
    const files = await unzipFiles(bytes.buffer);
    expect(files).toEqual([]);
  });
});

describe("extractLogFromZip", () => {
  test("ccfolia_html.zip から [すべて].html を優先抽出する", async () => {
    const zipBuffer = readZip("ccfolia_html.zip");
    const result = await extractLogFromZip(zipBuffer);
    expect(result.filename).toContain("すべて");
    expect(result.content).toContain("<!DOCTYPE html>");
  });

  test("udonarium.zip から data.xml を抽出する", async () => {
    const zipBuffer = readZip("udonarium.zip");
    const result = await extractLogFromZip(zipBuffer);
    expect(result.filename).toBe("data.xml");
    expect(result.content).toContain("<chat-tab");
  });

  test("他のログファイルがあっても data.xml を優先抽出する", async () => {
    const zip = createTestZip([
      { name: "memo.txt", content: "memo content" },
      { name: "data.xml", content: "<chat-tab />" },
    ]);
    const result = await extractLogFromZip(zip);
    expect(result.filename).toBe("data.xml");
    expect(result.content).toBe("<chat-tab />");
  });

  test("すべて/all/data.xml がなく、メインを含むファイルがあればそれを抽出する", async () => {
    const zip = createTestZip([
      { name: "sub.html", content: "sub content" },
      { name: "log_メイン.html", content: "main content" },
    ]);
    const result = await extractLogFromZip(zip);
    expect(result.filename).toBe("log_メイン.html");
    expect(result.content).toBe("main content");
  });

  test("メインも含まない場合は先頭のログファイルを抽出する", async () => {
    const zip = createTestZip([
      { name: "chat.txt", content: "text content" },
      { name: "other.html", content: "other content" },
    ]);
    const result = await extractLogFromZip(zip);
    expect(result.filename).toBe("chat.txt");
    expect(result.content).toBe("text content");
  });

  test("ログファイルが含まれないZIPはエラーを投げる", async () => {
    const zip = createTestZip([{ name: "image.png", content: "binary" }]);
    await expect(extractLogFromZip(zip)).rejects.toThrow(
      "ZIP内に対応するログファイルが見つかりません",
    );
  });
});
