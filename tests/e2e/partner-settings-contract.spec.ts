import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const account = {
  id: "visual-partner-owner",
  email: "owner@visual.shineqr.local",
  display_name: "Mavi Kare Stüdyo",
  role: "partner",
  staff_role: "partner_owner",
  business_types: ["photography"],
  partner_id: "partner-photographer",
  partner_name: "Mavi Kare Stüdyo",
  disabled: false,
  must_change_password: false,
  theme: "light",
  two_factor_enabled: false,
};

const partnerSettings = {
  version: 1,
  profile: {
    public_name: "Mavi Kare Stüdyo",
    website_url: "https://example.com",
    instagram_url: "https://instagram.com/example",
    service_cities: ["Elazığ", "Malatya"],
    working_hours: "Pazartesi - Cumartesi 09:00 - 19:00",
    operations_contact_name: "Operasyon Ekibi",
    operations_contact_email: "operasyon@example.com",
  },
  brand: {
    customer_facing_name: "Mavi Kare Stüdyo",
    support_phone: "05321234567",
    support_email: "destek@example.com",
    primary_color: "#B78A42",
    welcome_text: "Hikâyenizi birlikte ölümsüzleştirelim.",
    completion_text: "Fotoğraflarınız hazır olduğunda sizi bilgilendireceğiz.",
    show_partner_brand: true,
  },
  locations: [],
  organization_defaults: {
    event_type: "Düğün",
    venue: "",
    hero_message: "Anılarınızı bizimle paylaşın.",
    thank_you_message: "Bu özel günümüzde yanımızda olduğunuz için teşekkür ederiz.",
  },
  notifications: {
    approval_updates: true,
    photographer_delivery: true,
    quota_warning: true,
    retention_warning: true,
    print_updates: true,
    finance_updates: true,
    weekly_summary: false,
  },
  privacy: {
    customer_data_contact_email: "kvkk@example.com",
    security_alerts: true,
  },
};

const storefront = {
  version: 1,
  slug: "mavi-kare-studyo",
  status: "draft",
  short_description: "Düğün ve özel gün fotoğrafçılığı.",
  about: "Doğal ve zamansız karelerle çiftlerin hikâyesini anlatıyoruz.",
  cover_images: [],
  service_cities: ["Elazığ", "Malatya"],
  featured_services: ["Düğün çekimi", "Albüm", "Drone"],
  whatsapp_phone: "05321234567",
  show_phone: true,
  show_address: true,
  updated_at: "2026-11-16T08:00:00.000Z",
  updated_by: "visual-partner-owner",
};

async function mockPartnerApi(page: Page, theme: "light" | "dark") {
  await page.context().setExtraHTTPHeaders({
    "x-shineqr-visual-qa": "role-panel-contract",
  });
  await page.route("**/api/**", async (route) => {
    const pathname = new URL(route.request().url()).pathname;
    const responses: Record<string, unknown> = {
      "/api/auth/me": { ...account, theme },
      "/api/auth/sessions": [],
      "/api/admin/partner-settings": partnerSettings,
      "/api/admin/integrations/readiness": {
        external_actions_enabled: false,
        items: [
          { capability: "payment", provider: null, status: "not_configured" },
          { capability: "banking", provider: null, status: "not_configured" },
          { capability: "sms", provider: null, status: "not_configured" },
          { capability: "whatsapp", provider: null, status: "not_configured" },
          { capability: "email", provider: null, status: "not_configured" },
          { capability: "calendar", provider: null, status: "not_configured" },
          { capability: "accounting", provider: null, status: "not_configured" },
        ],
      },
      "/api/admin/integrations/outbox": {
        counts: { pending: 0, processing: 0, delivered: 0, retry_scheduled: 0, dead_letter: 0 },
      },
      "/api/admin/storefront": {
        storefront,
        business_types: ["photography"],
        preview_url: "/isletmeler/mavi-kare-studyo",
      },
      "/api/admin/storefront-catalog": [
        {
          id: "catalog-1",
          partner_id: "partner-photographer",
          kind: "service",
          name: "Düğün Dış Çekim",
          description: "Doğal mekânlarda profesyonel çift çekimi.",
          category: "Düğün",
          image_url: "",
          price_display: "quote_only",
          gross_price_cents: null,
          currency: "TRY",
          unit_label: "paket",
          active: true,
          display_order: 1,
          created_at: "2026-11-16T08:00:00.000Z",
          updated_at: "2026-11-16T08:00:00.000Z",
          updated_by: "visual-partner-owner",
        },
      ],
      "/api/admin/status": { r2_ready: true, last_cleanup: null },
      "/api/admin/notifications": { items: [], total: 0 },
    };
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify(responses[pathname] ?? {}),
    });
  });
}

const surfaces = [
  { slug: "account-settings", path: "/account/settings#business-settings", ready: "#business-settings" },
  { slug: "storefront-settings", path: "/admin/storefront", ready: ".storefront-workspace" },
];

for (const surface of surfaces) {
  for (const theme of ["light", "dark"] as const) {
    test(`${surface.slug} ${theme} visual, responsive and accessibility contract`, async ({ page }) => {
      await mockPartnerApi(page, theme);
      await page.goto(surface.path, { waitUntil: "networkidle" });
      await expect(page.locator(surface.ready)).toBeVisible();
      await expect(page.locator("html")).toHaveAttribute("data-admin-theme", theme);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow).toBeLessThanOrEqual(1);
      await page.addStyleTag({
        content: "*,*::before,*::after{animation-duration:0s!important;transition-duration:0s!important;caret-color:transparent!important}",
      });
      await page.evaluate(() => document.fonts.ready);
      await expect(page).toHaveScreenshot(
        `${surface.slug}${theme === "dark" ? "-dark" : ""}.png`,
        {
          fullPage: true,
          timeout: 30_000,
        },
      );
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
}
