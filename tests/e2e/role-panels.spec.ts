import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

type VisualAccount = { label: string; email: string; password: string };

function accounts(): VisualAccount[] {
  const value = process.env.VISUAL_QA_ACCOUNTS_JSON;
  if (!value) return [];
  const parsed: unknown = JSON.parse(value);
  if (!Array.isArray(parsed)) throw new Error("VISUAL_QA_ACCOUNTS_JSON dizi olmalıdır.");
  return parsed.map((item) => {
    if (!item || typeof item !== "object") throw new Error("Geçersiz görsel QA hesabı.");
    const candidate = item as Record<string, unknown>;
    if (![candidate.label, candidate.email, candidate.password].every((field) => typeof field === "string" && field.length > 0))
      throw new Error("Her görsel QA hesabında label, email ve password gereklidir.");
    return candidate as VisualAccount;
  });
}

const visualAccounts = accounts();

test.describe("authenticated V4 role panels", () => {
  test.skip(visualAccounts.length === 0, "VISUAL_QA_ACCOUNTS_JSON sağlanmadı.");
  for (const account of visualAccounts) {
    test(`${account.label} dashboard visual and accessibility`, async ({ page }) => {
      await page.goto("/auth");
      await page.getByLabel(/e-posta/i).fill(account.email);
      await page.getByLabel(/şifre/i).fill(account.password);
      await page.getByRole("button", { name: /giriş/i }).click();
      await page.waitForURL(/\/admin/);
      await expect(page.locator(".role-workspace")).toBeVisible();
      await page.addStyleTag({ content: "*,*::before,*::after{animation-duration:0s!important;transition-duration:0s!important;caret-color:transparent!important}" });
      await expect(page).toHaveScreenshot(`${account.label}-dashboard.png`, { fullPage: true });
      const results = await new AxeBuilder({ page })
        .include("#admin-content")
        .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
        .analyze();
      expect(results.violations.filter((item) => item.impact === "critical" || item.impact === "serious")).toEqual([]);
    });
  }
});
