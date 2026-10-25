import { test } from "node:test";
import assert from "node:assert/strict";
import {
  accountHasPermission,
  defaultStaffRole,
  effectiveStaffRole,
  hasPermission,
  initialPartnerStaffRole,
} from "../src/lib/access-control";
import type { Account } from "../src/lib/models";

test("legacy roles receive safe standard role presets", () => {
  assert.equal(defaultStaffRole("platform"), "platform_admin");
  assert.equal(defaultStaffRole("partner"), "partner_owner");
  assert.equal(defaultStaffRole("owner"), "organization_owner");
});

test("business type assigns the initial partner account role", () => {
  assert.equal(initialPartnerStaffRole(["venue"]), "partner_owner");
  assert.equal(initialPartnerStaffRole(["planner"]), "partner_owner");
  assert.equal(initialPartnerStaffRole(["photography"]), "photographer");
  assert.equal(initialPartnerStaffRole(["print_vendor"]), "print_vendor");
  assert.equal(initialPartnerStaffRole(["other"]), "partner_owner");
});

test("multiple business types do not grant an operational role implicitly", () => {
  assert.equal(
    initialPartnerStaffRole(["photography", "print_vendor"]),
    "partner_owner",
  );
});

test("sales cannot approve organizations or view all finance", () => {
  assert.equal(hasPermission("partner_sales", "organization.submit"), true);
  assert.equal(hasPermission("partner_sales", "organization.approve"), false);
  assert.equal(hasPermission("partner_sales", "finance.view_all"), false);
});

test("photographers can upload professional files but cannot access albums", () => {
  assert.equal(
    hasPermission("photographer", "media.upload_professional"),
    true,
  );
  assert.equal(hasPermission("photographer", "album.view"), false);
  assert.equal(hasPermission("photographer", "album.download"), false);
  assert.equal(hasPermission("photographer", "album.manage"), false);
  assert.equal(hasPermission("photographer", "organization.update"), false);
  assert.equal(hasPermission("photographer", "finance.view_own"), false);
});

test("print vendors can operate assigned jobs but cannot access albums", () => {
  assert.equal(hasPermission("print_vendor", "print_job.view_assigned"), true);
  assert.equal(hasPermission("print_vendor", "print_job.update_status"), true);
  assert.equal(hasPermission("print_vendor", "print_job.manage"), false);
  assert.equal(hasPermission("print_vendor", "album.view"), false);
  assert.equal(hasPermission("print_vendor", "album.download"), false);
});

test("only platform administration preset can impersonate", () => {
  assert.equal(
    hasPermission("platform_admin", "account.impersonate_readonly"),
    true,
  );
  assert.equal(
    hasPermission("partner_owner", "account.impersonate_readonly"),
    false,
  );
});

test("only platform administration can manage agent reports by default", () => {
  assert.equal(hasPermission("platform_admin", "agent.report.manage"), true);
  assert.equal(hasPermission("platform_admin", "agent.report.view"), true);
  assert.equal(hasPermission("design_manager", "agent.report.view"), false);
  assert.equal(hasPermission("partner_owner", "agent.report.view"), false);
});

test("partner owners cannot receive album access from legacy media flags", () => {
  const account = {
    role: "partner",
    staff_role: "partner_owner",
    permission_overrides: { "album.download": false },
  } as Account;
  assert.equal(accountHasPermission(account, "album.view"), false);
  assert.equal(accountHasPermission(account, "album.download"), false);
});

test("overrides cannot grant permissions outside the compatible role", () => {
  const account = {
    role: "partner",
    staff_role: "platform_admin",
    permission_overrides: { "account.impersonate_readonly": true },
  } as Account;
  assert.equal(effectiveStaffRole(account), "partner_owner");
  assert.equal(
    accountHasPermission(account, "account.impersonate_readonly"),
    false,
  );
});

test("disabled accounts have no effective permissions", () => {
  const account = { role: "platform", disabled: true } as Account;
  assert.equal(accountHasPermission(account, "partner.manage"), false);
});
