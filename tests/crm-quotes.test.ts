import assert from "node:assert/strict";
import test from "node:test";
import {
  canTransitionCrmQuote,
  crmQuoteInput,
  crmQuoteStatusInput,
  quotePriceSnapshot,
  quoteFinanceSnapshot,
  quoteTotals,
  snapshotQuoteLine,
} from "../src/lib/crm-quotes";

test("quote input requires VAT-inclusive integer cents and explicit VAT", () => {
  assert.equal(
    crmQuoteInput.safeParse({
      lead_id: "11111111-1111-4111-8111-111111111111",
      lines: [
        {
          catalog_item_id: null,
          name: "Fotoğraf paketi",
          quantity: 1,
          unit_gross_cents: 120_000,
          vat_rate_bps: 2000,
        },
      ],
    }).success,
    true,
  );
  assert.equal(
    crmQuoteInput.safeParse({
      lead_id: "11111111-1111-4111-8111-111111111111",
      lines: [{ name: "Paket", quantity: 1, unit_gross_cents: 12.5 }],
    }).success,
    false,
  );
});

test("fixed catalog price is frozen instead of trusting client price", () => {
  const line = snapshotQuoteLine(
    {
      catalog_item_id: "22222222-2222-4222-8222-222222222222",
      name: "İstemci adı",
      description: "",
      quantity: 2,
      unit_gross_cents: 1,
      vat_rate_bps: 2000,
    },
    {
      id: "22222222-2222-4222-8222-222222222222",
      partner_id: "partner-a",
      kind: "package",
      name: "Düğün paketi",
      description: "Tarihsel açıklama",
      category: "Düğün",
      image_url: "",
      price_display: "fixed",
      gross_price_cents: 300_000,
      currency: "TRY",
      unit_label: "paket",
      active: true,
      display_order: 1,
      created_at: "2026-01-01T00:00:00.000Z",
      created_by: "owner",
      updated_at: "2026-02-01T00:00:00.000Z",
      updated_by: "owner",
    },
  );
  assert.equal(line.unit_gross_cents, 300_000);
  assert.equal(line.line_gross_cents, 600_000);
  assert.equal(line.name, "Düğün paketi");
  assert.equal(quoteTotals([line]).gross_cents, 600_000);
});

test("accepted and superseded quotes are terminal", () => {
  assert.equal(canTransitionCrmQuote("draft", "sent"), true);
  assert.equal(canTransitionCrmQuote("sent", "accepted"), true);
  assert.equal(canTransitionCrmQuote("accepted", "sent"), false);
  assert.equal(canTransitionCrmQuote("superseded", "accepted"), false);
});

test("manual accept or reject requires a customer decision evidence note", () => {
  assert.equal(
    crmQuoteStatusInput.safeParse({ status: "accepted" }).success,
    false,
  );
  assert.equal(
    crmQuoteStatusInput.safeParse({
      status: "accepted",
      evidence_note: "Müşteri 15 Kasım telefon görüşmesinde onayladı.",
    }).success,
    true,
  );
  assert.equal(crmQuoteStatusInput.safeParse({ status: "sent" }).success, true);
});

test("accepted quote becomes a non-commissionable frozen sale snapshot", () => {
  const line = snapshotQuoteLine({
    catalog_item_id: null,
    name: "Özel çekim",
    description: "",
    quantity: 1,
    unit_gross_cents: 120_000,
    vat_rate_bps: 2000,
  });
  const totals = quoteTotals([line]);
  const snapshot = quotePriceSnapshot({ lines: [line], ...totals });
  assert.equal(snapshot.gross_cents, 120_000);
  assert.equal(snapshot.net_cents, line.line_net_cents);
  assert.equal(snapshot.vat_cents, line.line_vat_cents);
  assert.equal(snapshot.commissionable_gross_cents, 0);
  assert.equal(snapshot.add_ons[0].commissionable, false);
});

test("finance approval calculates partner commission from VAT-exclusive eligible lines", () => {
  const eligible = snapshotQuoteLine({
    catalog_item_id: null,
    name: "Paket",
    description: "",
    quantity: 1,
    unit_gross_cents: 120_000,
    vat_rate_bps: 2000,
  });
  const excluded = snapshotQuoteLine({
    catalog_item_id: null,
    name: "Harici hizmet",
    description: "",
    quantity: 1,
    unit_gross_cents: 60_000,
    vat_rate_bps: 2000,
  });
  const totals = quoteTotals([eligible, excluded]);
  const snapshot = quoteFinanceSnapshot(
    { lines: [eligible, excluded], net_cents: totals.net_cents },
    {
      eligible_line_ids: [eligible.id],
      partner_rate_bps: 3000,
      variable_cost_cents: 10_000,
    },
    "finance-user",
    "2026-11-15T12:00:00.000Z",
  );
  assert.equal(snapshot.eligible_net_cents, eligible.line_net_cents);
  assert.equal(
    snapshot.partner_commission_cents,
    Math.round(eligible.line_net_cents * 0.3),
  );
  assert.equal(
    snapshot.platform_net_cents,
    totals.net_cents - snapshot.partner_commission_cents,
  );
});
