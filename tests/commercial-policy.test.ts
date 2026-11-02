import { test } from "node:test";
import assert from "node:assert/strict";
import {
  commissionSnapshot,
  priceSnapshot,
  GIB,
  PACKAGE_CATALOG,
  PACKAGE_CATALOG_V1,
  PACKAGE_CATALOG_V2,
  packageSnapshotAtVersion,
  PHOTOGRAPHER_PACKAGE,
  photographerSettlementSnapshot,
  packageSnapshot,
  resolvePackageSnapshot,
  packageUploadDays,
  istanbulCalendarMonth,
  packageStorageLimit,
  storageBytesInUse,
} from "../src/lib/commercial-policy";

test("package catalog reflects approved commercial rules", () => {
  assert.equal(PACKAGE_CATALOG, PACKAGE_CATALOG_V2);
  assert.equal(PACKAGE_CATALOG_V1["plan-1"].grossPriceCents, 250_000);
  assert.equal(PACKAGE_CATALOG_V1["plan-2"].grossPriceCents, 400_000);
  assert.equal(PACKAGE_CATALOG_V1["plan-3"].miniQrCount, 40);
  assert.equal(packageSnapshotAtVersion("plan-2", 1).revisionLimit, 2);
  assert.equal(packageSnapshotAtVersion("plan-2", 2).revisionLimit, null);
  assert.equal(PACKAGE_CATALOG["plan-1"].version, 2);
  assert.equal(PACKAGE_CATALOG["plan-1"].grossPriceCents, 350_000);
  assert.equal(PACKAGE_CATALOG["plan-2"].grossPriceCents, 500_000);
  assert.equal(PACKAGE_CATALOG["plan-3"].grossPriceCents, 1_000_000);
  assert.equal(PACKAGE_CATALOG["plan-1"].miniQrCount, 30);
  assert.equal(PACKAGE_CATALOG["plan-2"].miniQrCount, 50);
  assert.equal(PACKAGE_CATALOG["plan-3"].miniQrCount, 70);
  assert.equal(PACKAGE_CATALOG["plan-1"].hardStorageBytes, 30 * GIB);
  assert.equal(PACKAGE_CATALOG["plan-2"].hardStorageBytes, 50 * GIB);
  assert.equal(PACKAGE_CATALOG["plan-3"].hardStorageBytes, 100 * GIB);
  assert.equal(PACKAGE_CATALOG["plan-3"].welcomeSignCount, 1);
  assert.equal(PACKAGE_CATALOG["plan-3"].tableQrCount, undefined);
  assert.equal(PACKAGE_CATALOG["plan-3"].includedEventCount, 2);
  assert.equal(PACKAGE_CATALOG["plan-3"].secondEventPrintingIncluded, true);
  assert.equal(PACKAGE_CATALOG["plan-3"].digitalInvitationIncluded, true);
  assert.equal(PACKAGE_CATALOG["plan-1"].digitalRetentionMonths, 12);
  assert.equal(PACKAGE_CATALOG["plan-2"].digitalRetentionMonths, 12);
  assert.equal(PACKAGE_CATALOG["plan-3"].digitalRetentionMonths, 12);
  assert.equal(PACKAGE_CATALOG["plan-1"].revisionLimit, null);
  assert.equal(packageUploadDays("plan-1"), 1);
  assert.equal(packageUploadDays("plan-2"), 7);
});

test("storage policy includes trash and active upload reservations", () => {
  assert.equal(packageStorageLimit(PACKAGE_CATALOG["plan-1"]), 30 * GIB);
  assert.equal(packageStorageLimit(PACKAGE_CATALOG["plan-2"]), 50 * GIB);
  assert.equal(storageBytesInUse({ media_bytes: 10, trashed_bytes: 20, reserved_upload_bytes: 30 }), 60);
});

test("commission is calculated from VAT-exclusive cents", () => {
  const first = commissionSnapshot("plan-2", 1, 2000);
  assert.equal(first.netCents, 416_667);
  assert.equal(first.grossCents, 500_000);
  assert.equal(first.commissionRateBps, 3000);
  assert.equal(first.commissionCents, 125_000);

  const eleventh = commissionSnapshot("plan-3", 11, 2000);
  assert.equal(eleventh.netCents, 833_333);
  assert.equal(eleventh.grossCents, 1_000_000);
  assert.equal(eleventh.commissionRateBps, 4000);
  assert.equal(eleventh.commissionCents, 333_333);
});

test("calendar month uses Europe/Istanbul rather than UTC", () => {
  assert.equal(istanbulCalendarMonth("2026-09-30T21:30:00.000Z"), "2026-10");
});

test("Plan 1 remains at thirty percent and does not consume the shared counter", () => {
  const result = commissionSnapshot("plan-1", null, 2000);
  assert.equal(result.commissionRateBps, 3000);
  assert.equal(result.qualifyingOrdinal, null);
});

test("package snapshots cannot mutate the catalog", () => {
  const snapshot = packageSnapshot("plan-3");
  snapshot.miniQrCount = 1;
  assert.equal(PACKAGE_CATALOG["plan-3"].miniQrCount, 70);
});

test("photographer package uses a fixed gross distribution outside standard commission", () => {
  assert.equal(PHOTOGRAPHER_PACKAGE.grossPriceCents, 400_000);
  const snapshot = photographerSettlementSnapshot();
  assert.equal(snapshot.netCents, 333_333);
  assert.equal(snapshot.vatCents, 66_667);
  assert.equal(snapshot.photographerGrossCents, 300_000);
  assert.equal(snapshot.originatingPartnerGrossCents, 50_000);
  assert.equal(snapshot.platformGrossCents, 50_000);
  assert.equal(
    snapshot.photographerGrossCents +
      snapshot.originatingPartnerGrossCents +
      snapshot.platformGrossCents,
    snapshot.grossCents,
  );
});

test("legacy organizations resolve a conservative package without replacing a historical snapshot", () => {
  const historical = packageSnapshot("plan-2");
  historical.miniQrCount = 17;
  assert.equal(resolvePackageSnapshot(historical, "plan-3").miniQrCount, 17);
  assert.equal(resolvePackageSnapshot(undefined, "plan-2").code, "plan-2");
  assert.equal(resolvePackageSnapshot(undefined, undefined).code, "plan-1");
});

test("all add-ons update the frozen customer total and earn commission", () => {
  const pricing = priceSnapshot("plan-2", [
    { product_id: "print", quantity: 2 },
    { product_id: "shipping", quantity: 1 },
  ], [
    { id: "print", name: "Ek baskı", gross_price_cents: 25_000, commissionable: true, effect_type: "print_quantity", effect_value: 20, print_format: "vertical_mini" },
    { id: "shipping", name: "Özel teslimat", gross_price_cents: 30_000, commissionable: false },
  ]);
  assert.equal(pricing.add_on_gross_cents, 80_000);
  assert.equal(pricing.gross_cents, 580_000);
  assert.equal(pricing.commissionable_gross_cents, 580_000);
  assert.equal(pricing.add_ons[0].print_format, "vertical_mini");

  const commission = commissionSnapshot("plan-2", 1, 2000, pricing);
  assert.equal(commission.netCents, 483_333);
  assert.equal(commission.commissionCents, 145_000);
});

test("second organization discount reduces both sale total and commission base", () => {
  const pricing = priceSnapshot(
    "plan-2",
    [{ product_id: "second-event", quantity: 1 }],
    [{
      id: "second-event",
      name: "İkinci organizasyon",
      gross_price_cents: 0,
      commissionable: true,
      pricing_type: "package_percentage_discount",
      percentage_bps: 1000,
      effect_type: "second_event",
      effect_value: 1,
    }],
  );
  assert.equal(pricing.add_ons[0].unit_gross_cents, -50_000);
  assert.equal(pricing.gross_cents, 450_000);
  assert.equal(pricing.commissionable_gross_cents, 450_000);

  const commission = commissionSnapshot("plan-2", 1, 2000, pricing);
  assert.equal(commission.netCents, 375_000);
  assert.equal(commission.commissionCents, 112_500);
  assert.throws(
    () => priceSnapshot("plan-2", [{ product_id: "second-event", quantity: 2 }], [{
      id: "second-event",
      name: "İkinci organizasyon",
      gross_price_cents: 0,
      commissionable: true,
      pricing_type: "package_percentage_discount",
      percentage_bps: 1000,
    }]),
    /yalnızca bir kez/,
  );
  assert.throws(
    () => priceSnapshot("plan-2", [
      { product_id: "second-event", quantity: 1 },
      { product_id: "second-event", quantity: 1 },
    ], [{
      id: "second-event",
      name: "İkinci organizasyon",
      gross_price_cents: 0,
      commissionable: true,
      pricing_type: "package_percentage_discount",
      percentage_bps: 1000,
    }]),
    /birden fazla satır/,
  );
});
