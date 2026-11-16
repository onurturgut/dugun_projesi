import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

type RoleScenario = {
  slug: string;
  displayName: string;
  role: "platform" | "partner" | "owner";
  staffRole: string;
  businessTypes?: string[];
  moduleCount: number;
};

const scenarios: RoleScenario[] = [
  { slug: "super-admin", displayName: "ShineQR Yöneticisi", role: "platform", staffRole: "platform_admin", moduleCount: 3 },
  { slug: "organization-owner", displayName: "Hilal ve Oğuz", role: "owner", staffRole: "organization_owner", moduleCount: 3 },
  { slug: "photographer", displayName: "Mavi Kare Stüdyo", role: "partner", staffRole: "partner_owner", businessTypes: ["photography"], moduleCount: 4 },
  { slug: "venue", displayName: "Vista Davet", role: "partner", staffRole: "partner_owner", businessTypes: ["venue"], moduleCount: 4 },
  { slug: "planner", displayName: "Lina Event", role: "partner", staffRole: "partner_owner", businessTypes: ["planner"], moduleCount: 4 },
  { slug: "print-vendor", displayName: "Shine Baskı", role: "partner", staffRole: "partner_owner", businessTypes: ["print_vendor"], moduleCount: 4 },
  { slug: "bridal", displayName: "Eylül Bridal", role: "partner", staffRole: "partner_owner", businessTypes: ["bridal"], moduleCount: 4 },
  { slug: "florist", displayName: "Aura Çiçek", role: "partner", staffRole: "partner_owner", businessTypes: ["florist"], moduleCount: 4 },
];

async function mockDashboardApi(page: Page, scenario: RoleScenario) {
  await page.context().setExtraHTTPHeaders({
    "x-shineqr-visual-qa": "role-panel-contract",
  });
  await page.route("**/api/**", async (route) => {
    const pathname = new URL(route.request().url()).pathname;
    if (pathname === "/api/auth/me") {
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          id: `visual-${scenario.slug}`,
          email: `${scenario.slug}@visual.shineqr.local`,
          display_name: scenario.displayName,
          role: scenario.role,
          staff_role: scenario.staffRole,
          business_types: scenario.businessTypes,
          partner_id: scenario.role === "partner" ? `partner-${scenario.slug}` : null,
          partner_name: scenario.role === "partner" ? scenario.displayName : null,
          disabled: false,
          must_change_password: false,
          theme: "light",
        }),
      });
      return;
    }
    if (pathname === "/api/admin/weddings") {
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({ items: [], total: 0, page: 1, pages: 1 }),
      });
      return;
    }
    if (pathname === "/api/admin/status") {
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({ r2_ready: true, last_cleanup: { at: "2026-11-15T09:00:00.000Z", errors: [] } }),
      });
      return;
    }
    if (pathname === "/api/admin/notifications") {
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({ items: [], total: 0 }),
      });
      return;
    }
    await route.fulfill({ contentType: "application/json", body: "{}" });
  });
}

test.describe("V4 role panel visual contracts", () => {
  for (const scenario of scenarios) {
    test(`${scenario.slug} dashboard visual and accessibility`, async ({ page }) => {
      await mockDashboardApi(page, scenario);
      await page.goto("/admin", { waitUntil: "networkidle" });
      await expect(page.locator(".role-workspace")).toBeVisible();
      await expect(page.locator(".role-workspace-card")).toHaveCount(scenario.moduleCount);
      const horizontalOverflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(horizontalOverflow).toBeLessThanOrEqual(1);
      await page.keyboard.press("Tab");
      await expect(page.locator(".admin-skip")).toBeFocused();
      await page.keyboard.press("Enter");
      await expect(page.locator("#admin-content")).toBeFocused();
      await page.locator("#admin-content").evaluate((element) => (element as HTMLElement).blur());
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.addStyleTag({
        content: "*,*::before,*::after{animation-duration:0s!important;transition-duration:0s!important;caret-color:transparent!important}",
      });
      await page.evaluate(() => document.fonts.ready);
      await expect(page).toHaveScreenshot(`${scenario.slug}-dashboard.png`, {
        fullPage: true,
        timeout: 30_000,
      });
      const results = await new AxeBuilder({ page })
        .include("#admin-content")
        .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
        .analyze();
      expect(
        results.violations.filter(
          (item) => item.impact === "critical" || item.impact === "serious",
        ),
      ).toEqual([]);
    });
  }
});
