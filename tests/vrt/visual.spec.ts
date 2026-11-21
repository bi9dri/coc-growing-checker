import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => document.fonts.ready);
});

test("landing page", async ({ page }) => {
  await expect(page.getByRole("heading", { name: "ログファイルをドロップ" })).toBeVisible();
  await expect(page.getByRole("button", { name: "サンプルログで試す" })).toBeVisible();

  await expect(page).toHaveScreenshot("landing.png", { fullPage: true });
});

test("workspace with sample log loaded", async ({ page }) => {
  await page.getByRole("button", { name: "サンプルログで試す" }).click();

  await expect(page.locator(".file-name-text")).toHaveText("sample_ccfolia.html");
  await expect(page.getByRole("tab", { name: "神崎 凛" })).toBeVisible();

  await expect(page.locator(".toast-banner")).not.toBeVisible();

  await expect(page).toHaveScreenshot("workspace-sample-loaded.png", { fullPage: true });
});

test("workspace tab switch to another character", async ({ page }) => {
  await page.getByRole("button", { name: "サンプルログで試す" }).click();
  await expect(page.getByRole("tab", { name: "神崎 凛" })).toBeVisible();

  await page.getByRole("tab", { name: "橘 悠真" }).click();
  await expect(page.getByRole("tab", { name: "橘 悠真" })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("cell", { name: "★ 幸運" })).toBeVisible();

  await expect(page.locator(".toast-banner")).not.toBeVisible();

  await expect(page).toHaveScreenshot("workspace-tab-switched.png", { fullPage: true });
});

test("settings modal", async ({ page }) => {
  await page.getByRole("button", { name: "ハウスルール設定" }).click();

  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("heading", { name: "ハウスルール設定" })).toBeVisible();

  await expect(page).toHaveScreenshot("settings-modal.png", { fullPage: true });
});
