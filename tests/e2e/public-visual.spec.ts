import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const pages = [
  { name: "home", path: "/" },
  { name: "business-directory", path: "/isletmeler" },
  { name: "digital-invitations", path: "/dijital-davetiyeler" },
  { name: "photographer-package", path: "/fotografci-paketi" },
  { name: "business-onboarding", path: "/isletmeler-icin" },
] as const;

for (const target of pages) {
  test(`${target.name} visual baseline`, async ({ page }) => {
    if (target.path === "/") {
      await page.route("**/api/partners", async (route) => {
        await route.fulfill({
          contentType: "application/json",
          body: JSON.stringify([
            { id: "visual-partner-1", name: "Mavi Kare Stüdyo", logo_url: "/covers/couple-1.jpg" },
            { id: "visual-partner-2", name: "ShineQR Tasarım", logo_url: "/marketing/album-gallery-card.webp" },
          ]),
        });
      });
    }
    await page.goto(target.path, { waitUntil: "networkidle" });
    await expect(page.locator("body")).toBeVisible();
    if (target.path === "/") {
      await expect(page.getByText("İş ortaklarımız yükleniyor…")).toHaveCount(0, {
        timeout: 15_000,
      });
    }
    await page.addStyleTag({
      content: "*,*::before,*::after{animation-duration:0s!important;transition-duration:0s!important;caret-color:transparent!important} video{visibility:hidden!important}",
    });
    await page.evaluate(() => document.fonts.ready);
    await expect(page).toHaveScreenshot(`${target.name}.png`, {
      fullPage: true,
      timeout: 30_000,
    });
  });
}

test("public critical routes have no serious or critical axe violations", async ({ page }) => {
  for (const target of pages) {
    await page.goto(target.path, { waitUntil: "networkidle" });
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
      .analyze();
    const blocking = results.violations.filter((item) =>
      item.impact === "critical" || item.impact === "serious",
    );
    expect(blocking, `${target.path}: ${blocking.map((item) => item.id).join(", ")}`).toEqual([]);
  }
});
