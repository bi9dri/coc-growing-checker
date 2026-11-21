import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { chromium } from "@playwright/test";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const logoSvg = await readFile(join(ROOT, "src/assets/logo.svg"), "utf8");
const wordmarkSvg = await readFile(join(ROOT, "src/assets/wordmark.svg"), "utf8");

const html = `<!doctype html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<style>
  @font-face {
    font-family: "Geist Sans";
    src: url("https://cdn.jsdelivr.net/npm/geist@1.7.2/dist/fonts/geist-sans/Geist-Variable.woff2") format("woff2");
  }
  @font-face {
    font-family: "Geist Mono";
    src: url("https://cdn.jsdelivr.net/npm/geist@1.7.2/dist/fonts/geist-mono/GeistMono-Variable.woff2") format("woff2");
  }

  * { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    width: 1200px;
    height: 630px;
    background-color: #fafafa;
    background-image:
      linear-gradient(rgba(150, 150, 150, 0.08) 1px, transparent 1px),
      linear-gradient(90deg, rgba(150, 150, 150, 0.08) 1px, transparent 1px);
    background-size: 30px 30px;
    font-family: "Geist Sans", "Hiragino Kaku Gothic ProN", "Yu Gothic UI", system-ui, sans-serif;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
  }

  .card {
    width: 1080px;
    height: 510px;
    background: #ffffff;
    border: 2px solid #27272a;
    box-shadow: 12px 12px 0 #969696;
    position: relative;
    padding: 48px 56px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
  }

  .accent-bar {
    position: absolute;
    top: 0;
    left: 0;
    width: 140px;
    height: 6px;
    background: #ff5a00;
  }

  .brand-row {
    display: flex;
    align-items: center;
    gap: 28px;
  }

  .logo-wrap {
    width: 96px;
    height: 104px;
    flex-shrink: 0;
  }
  .logo-wrap svg {
    width: 100%;
    height: 100%;
    display: block;
  }

  .wordmark-wrap {
    width: 620px;
    flex-shrink: 0;
  }
  .wordmark-wrap svg {
    width: 100%;
    height: auto;
    display: block;
  }

  .desc {
    font-size: 25px;
    line-height: 1.55;
    color: #52525b;
    font-weight: 500;
    letter-spacing: -0.01em;
  }
  .desc strong {
    color: #27272a;
    font-weight: 700;
  }

  .divider {
    height: 1px;
    background: #d4d4d8;
    width: 100%;
  }

  .badges-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .badges {
    display: flex;
    gap: 12px;
  }

  .badge {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 8px 16px;
    border: 1px solid #969696;
    background: #fafafa;
    font-family: "Geist Mono", monospace;
    font-size: 14px;
    font-weight: 700;
    color: #27272a;
    letter-spacing: 0.02em;
    white-space: nowrap;
  }

  .badge-accent {
    border-color: #27272a;
    background: #ff5a00;
    color: #ffffff;
  }

  .badge-dot {
    width: 8px;
    height: 8px;
    background: #ff5a00;
    display: inline-block;
  }

  .security-note {
    font-family: "Geist Mono", monospace;
    font-size: 13px;
    font-weight: 700;
    color: #52525b;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 8px 14px;
    border: 1px solid #d4d4d8;
    background: #fafafa;
    white-space: nowrap;
  }

  .security-dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: #15803d;
    display: inline-block;
  }

  .footer-group {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
</style>
</head>
<body>
  <div class="card">
    <div class="accent-bar"></div>
    <div class="brand-row">
      <div class="logo-wrap">${logoSvg}</div>
      <div class="wordmark-wrap">${wordmarkSvg}</div>
    </div>
    <div class="desc">
      オンラインセッションログから技能の<strong>成長判定・経験チェック</strong>を自動集計。<br>
      BCDice によるダイスロールとクリップボード共有に対応。
    </div>
    <div class="divider"></div>
    <div class="footer-group">
      <div class="badges-row">
        <div class="badges">
          <span class="badge badge-accent">6版 / 7版 両対応</span>
          <span class="badge"><span class="badge-dot"></span>CCFOLIA / Tekey / Udonarium / VESPERNA 等</span>
        </div>
      </div>
      <div class="badges-row">
        <div class="badges">
          <span class="badge"><span class="badge-dot"></span>BCDice 完全ローカル実行</span>
        </div>
        <div class="security-note">
          <span class="security-dot"></span>完全クライアントサイド動作（サーバー送信なし）
        </div>
      </div>
    </div>
  </div>
</body>
</html>`;

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 1200, height: 630 },
  deviceScaleFactor: 1,
});

await page.setContent(html, { waitUntil: "networkidle" });
await page.evaluate(() => document.fonts.ready);

const outputPath = join(ROOT, "public", "og-image.png");
await page.screenshot({ path: outputPath, type: "png" });

await browser.close();
console.log(`Generated ${outputPath}`);
