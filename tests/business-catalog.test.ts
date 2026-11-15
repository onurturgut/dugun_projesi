import test from "node:test";
import assert from "node:assert/strict";
import {
  businessCatalogItemInput,
  publicCatalogItem,
} from "../src/lib/business-catalog";
import type { BusinessCatalogItem } from "../src/lib/models";

const base = {
  kind: "service" as const,
  name: "Düğün fotoğraf çekimi",
  description: "Organizasyon gününe özel profesyonel fotoğraf çekimi.",
  category: "Düğün",
  image_url: "",
  price_display: "quote_only" as const,
  gross_price_cents: null,
  unit_label: "organizasyon",
  active: true,
  display_order: 1,
};

test("quote-only catalog items never carry a price", () => {
  assert.equal(businessCatalogItemInput.safeParse(base).success, true);
  assert.equal(
    businessCatalogItemInput.safeParse({ ...base, gross_price_cents: 50_000 })
      .success,
    false,
  );
});

test("fixed and starting prices require positive integer cents", () => {
  assert.equal(
    businessCatalogItemInput.safeParse({
      ...base,
      price_display: "fixed",
      gross_price_cents: 125_000,
    }).success,
    true,
  );
  assert.equal(
    businessCatalogItemInput.safeParse({
      ...base,
      price_display: "from",
      gross_price_cents: 0,
    }).success,
    false,
  );
});

test("only active catalog records receive a public projection", () => {
  const item: BusinessCatalogItem = {
    id: "catalog-1",
    partner_id: "partner-1",
    ...base,
    currency: "TRY",
    created_at: "2026-11-14T00:00:00.000Z",
    created_by: "owner-1",
    updated_at: "2026-11-14T00:00:00.000Z",
    updated_by: "owner-1",
  };
  assert.equal(publicCatalogItem(item)?.name, item.name);
  assert.equal(publicCatalogItem({ ...item, active: false }), null);
  assert.equal("partner_id" in publicCatalogItem(item)!, false);
});
