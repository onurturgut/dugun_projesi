import assert from "node:assert/strict";
import test from "node:test";
import { workspaceForAccount } from "../src/lib/role-workspace";

test("every approved business type receives a dedicated V4 workspace", () => {
  const cases = [
    ["photography", "FOTOĞRAFÇI"], ["venue", "DÜĞÜN SALONU"], ["planner", "ORGANİZASYON"],
    ["print_vendor", "BASKI"], ["bridal", "GELİNLİK"], ["florist", "ÇİÇEKÇİ"],
  ] as const;
  for (const [businessType, expected] of cases) {
    const workspace = workspaceForAccount({ role: "partner", staff_role: "partner_owner", business_types: [businessType] });
    assert.match(workspace.eyebrow, new RegExp(expected));
    assert.ok(workspace.modules.length >= 4);
  }
});

test("guest owner and platform never inherit partner workspaces", () => {
  assert.match(workspaceForAccount({ role: "owner" }).eyebrow, /ORGANİZASYON SAHİBİ/);
  assert.match(workspaceForAccount({ role: "platform" }).eyebrow, /PLATFORM/);
});

test("partner storefront is a dedicated workspace instead of account settings", () => {
  const workspace = workspaceForAccount({
    role: "partner",
    staff_role: "partner_owner",
    business_types: ["photography"],
  });
  const storefront = workspace.modules.find((module) => module.href === "/admin/storefront");
  assert.equal(storefront?.href, "/admin/storefront");
});
