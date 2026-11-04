import { test } from "node:test";
import assert from "node:assert/strict";
import {
  breakEvenGrossCents,
  calculateCommissionCents,
  commissionRateForOrdinal,
  extraQuantity,
  monthlyBreakEvenUnits,
  netFromVatIncluded,
  profitability,
} from "../src/lib/finance";

const policy = {
  policy_id: "p",
  version: 1,
  base_rate_bps: 3000,
  threshold: 10,
  elevated_rate_bps: 4000,
  tiered: true,
  qualifying_package_codes: ["plan-2", "plan-3"] as const,
  effective_from: "2026-01-01T00:00:00.000Z",
};

test("10th sale stays at base rate and 11th uses elevated rate", () => {
  assert.equal(commissionRateForOrdinal(policy, "plan-2", 10), 3000);
  assert.equal(commissionRateForOrdinal(policy, "plan-2", 11), 4000);
  assert.equal(commissionRateForOrdinal(policy, "plan-1", null), 3000);
});

test("VAT and commission use integer cents", () => {
  assert.equal(netFromVatIncluded(500_000, 2000), 416_667);
  assert.equal(calculateCommissionCents(416_667, 3000), 125_000);
});

test("extra QR quantity excludes package-included units", () => {
  assert.equal(extraQuantity(10, 15), 5);
  assert.equal(extraQuantity(10, 7), 0);
});

test("profitability and break-even include proportional fees", () => {
  const result = profitability({
    gross_cents: 500_000,
    vat_rate_bps: 2000,
    variable_cost_cents: 50_000,
    commission_rate_bps: 3000,
    payment_rate_bps: 200,
  });
  assert.equal(result.contribution_cents, 231_667);
  assert.equal(breakEvenGrossCents({ vat_rate_bps: 2000, variable_cost_cents: 50_000, commission_rate_bps: 3000, payment_rate_bps: 200 }), 88_758);
  assert.equal(monthlyBreakEvenUnits(1_000_000, 231_667), 5);
  assert.equal(monthlyBreakEvenUnits(1_000_000, 0), null);
});
