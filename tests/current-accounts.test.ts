import { test } from "node:test";
import assert from "node:assert/strict";
import { buildCustomerCurrentAccounts } from "../src/lib/current-accounts";
import type { SaleRecord } from "../src/lib/models";

const sale = (id: string, status: SaleRecord["status"], gross_cents: number): SaleRecord => ({ id, idempotency_key: id, partner_id: "p1", wedding_id: "w1", package_code: "plan-1", status, period: "2026-11", occurred_at: "2026-11-01T09:00:00.000Z", recorded_at: "2026-11-01T09:00:00.000Z", recorded_by: "admin", net_cents: 0, vat_rate_bps: 2000, vat_cents: 0, gross_cents, qualifying_ordinal: null, commission_rate_bps: 3000, commission_cents: 0, platform_cents: 0, paid_at: status === "paid" || status === "refunded" ? "2026-11-02T09:00:00.000Z" : null, refunded_at: status === "refunded" ? "2026-11-03T09:00:00.000Z" : null });
const wedding = [{ id: "w1", owner_id: "o1", customer_account_id: "c1", customer_name: "Ayşe Yılmaz", customer_email: "ayse@example.com", customer_phone: "05320000000", title: "Ayşe & Can" }];

test("customer current account derives open balance from unpaid sales", () => {
  const [account] = buildCustomerCurrentAccounts([sale("s1", "paid", 500_000), sale("s2", "draft", 100_000), sale("s3", "paid", 200_000)], wedding);
  assert.equal(account.total_sales_cents, 800_000);
  assert.equal(account.total_paid_cents, 700_000);
  assert.equal(account.balance_cents, 100_000);
});

test("refund keeps historical sale and payment while recording reversal", () => {
  const [account] = buildCustomerCurrentAccounts([sale("s1", "refunded", 500_000)], wedding);
  assert.equal(account.total_sales_cents, 500_000);
  assert.equal(account.total_paid_cents, 500_000);
  assert.equal(account.total_refunded_cents, 500_000);
  assert.deepEqual(account.entries.map((entry) => entry.type).sort(), ["payment", "refund", "sale"]);
});
