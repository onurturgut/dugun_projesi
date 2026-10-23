import { test } from "node:test";
import assert from "node:assert/strict";
import {
  commissionSnapshot,
  priceSnapshot,
  GIB,
  PACKAGE_CATALOG,
  packageSnapshot,
  resolvePackageSnapshot,
  packageUploadDays,
  istanbulCalendarMonth,
  packageStorageLimit,
  storageBytesInUse,
} from "../src/lib/commercial-policy";

test("package catalog reflects approved commercial rules", () => {
  assert.equal(PACKAGE_CATALOG["plan-1"].hardStorageBytes, 3 * GIB);
  assert.equal(PACKAGE_CATALOG["plan-1"].digitalRetentionMonths, 1);
  assert.equal(PACKAGE_CATALOG["plan-2"].fairUseSoftCapBytes, 100 * GIB);
  assert.equal(PACKAGE_CATALOG["plan-3"].fairUseSoftCapBytes, 150 * GIB);
  assert.equal(PACKAGE_CATALOG["plan-3"].includedEventCount, 2);
  assert.equal(PACKAGE_CATALOG["plan-3"].secondEventPrintingIncluded, true);
  assert.equal(packageUploadDays("plan-1"), 1);
  assert.equal(packageUploadDays("plan-2"), 7);
});

test("storage policy includes trash and active upload reservations", () => {
  assert.equal(packageStorageLimit(PACKAGE_CATALOG["plan-1"]), 3 * GIB);
  assert.equal(packageStorageLimit(PACKAGE_CATALOG["plan-2"]), 100 * GIB);
  assert.equal(storageBytesInUse({ media_bytes: 10, trashed_bytes: 20, reserved_upload_bytes: 30 }), 60);
});

test("commission is calculated from VAT-exclusive cents", () => {
  const first = commissionSnapshot("plan-2", 1, 2000);
  assert.equal(first.netCents, 333_333);
  assert.equal(first.grossCents, 400_000);
  assert.equal(first.commissionRateBps, 3000);
  assert.equal(first.commissionCents, 100_000);

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
  assert.equal(PACKAGE_CATALOG["plan-3"].miniQrCount, 40);
});

test("legacy organizations resolve a conservative package without replacing a historical snapshot", () => {
  const historical = packageSnapshot("plan-2");
  historical.miniQrCount = 17;
  assert.equal(resolvePackageSnapshot(historical, "plan-3").miniQrCount, 17);
  assert.equal(resolvePackageSnapshot(undefined, "plan-2").code, "plan-2");
  assert.equal(resolvePackageSnapshot(undefined, undefined).code, "plan-1");
});

test("add-ons update the frozen customer total and only eligible items earn commission", () => {
  const pricing = priceSnapshot("plan-2", [
    { product_id: "print", quantity: 2 },
    { product_id: "shipping", quantity: 1 },
  ], [
    { id: "print", name: "Ek baskı", gross_price_cents: 25_000, commissionable: true },
    { id: "shipping", name: "Özel teslimat", gross_price_cents: 30_000, commissionable: false },
  ]);
  assert.equal(pricing.add_on_gross_cents, 80_000);
  assert.equal(pricing.gross_cents, 480_000);
  assert.equal(pricing.commissionable_gross_cents, 450_000);

  const commission = commissionSnapshot("plan-2", 1, 2000, pricing);
  assert.equal(commission.netCents, 400_000);
  assert.equal(commission.commissionCents, 112_500);
});
