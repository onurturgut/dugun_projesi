import { test } from "node:test";
import assert from "node:assert/strict";
import { canManagePartnerSettings, defaultPartnerSettings, partnerSettingsInput, resolvePartnerSettings } from "../src/lib/partner-settings";

test("partner settings start with safe notification defaults", () => {
  const settings = defaultPartnerSettings({ name: "Işık Davet" });
  assert.equal(settings.profile.public_name, "Işık Davet");
  assert.equal(settings.notifications.quota_warning, true);
  assert.equal(settings.notifications.weekly_summary, false);
});

test("partner settings reject non-HTTPS links and unknown commercial fields", () => {
  const settings = defaultPartnerSettings({ name: "Işık Davet" });
  assert.equal(partnerSettingsInput.safeParse({ ...settings, version: undefined }).success, false);
  const input = {
    profile: { ...settings.profile, website_url: "http://example.com" },
    organization_defaults: settings.organization_defaults,
    notifications: settings.notifications,
  };
  assert.equal(partnerSettingsInput.safeParse(input).success, false);
  assert.equal(partnerSettingsInput.safeParse({ ...input, commission_rate: 50 }).success, false);
});

test("legacy partners receive defaults without mutating stored settings", () => {
  const settings = resolvePartnerSettings({ name: "Salon A" });
  assert.equal(settings.organization_defaults.event_type, "Düğün");
  assert.equal(settings.version, 1);
});

test("only an active partner owner with a tenant can manage partner settings", () => {
  assert.equal(canManagePartnerSettings({ role: "partner", staff_role: "partner_owner", partner_id: "partner-a", disabled: false }), true);
  assert.equal(canManagePartnerSettings({ role: "partner", staff_role: "partner_sales", partner_id: "partner-a", disabled: false }), false);
  assert.equal(canManagePartnerSettings({ role: "partner", staff_role: "partner_owner", partner_id: null, disabled: false }), false);
  assert.equal(canManagePartnerSettings({ role: "platform", staff_role: "platform_admin", partner_id: null, disabled: false }), false);
  assert.equal(canManagePartnerSettings({ role: "partner", staff_role: "partner_owner", partner_id: "partner-a", disabled: true }), false);
});
