export const GIB = 1024 ** 3;

export type PackageCode = "plan-1" | "plan-2" | "plan-3";

export type PackagePolicy = {
  code: PackageCode;
  version: 1;
  name: string;
  grossPriceCents: number;
  miniQrCount: number;
  tableQrCount: number;
  welcomeSignCount: number;
  hardStorageBytes: number | null;
  fairUseSoftCapBytes: number | null;
  uploadWindow: "event-day" | "seven-days";
  digitalRetentionMonths: number;
  physicalRetentionMonths: number;
  revisionLimit: number;
  includedEventCount: number;
  secondEventPrintingIncluded: boolean;
  qualifiesForVolumeCommission: boolean;
};

export const PACKAGE_CATALOG: Readonly<Record<PackageCode, Readonly<PackagePolicy>>> = Object.freeze({
  "plan-1": {
    code: "plan-1",
    version: 1,
    name: "Başlangıç",
    grossPriceCents: 250_000,
    miniQrCount: 10,
    tableQrCount: 0,
    welcomeSignCount: 0,
    hardStorageBytes: 3 * GIB,
    fairUseSoftCapBytes: null,
    uploadWindow: "event-day",
    digitalRetentionMonths: 1,
    physicalRetentionMonths: 0,
    revisionLimit: 1,
    includedEventCount: 1,
    secondEventPrintingIncluded: false,
    qualifiesForVolumeCommission: false,
  },
  "plan-2": {
    code: "plan-2",
    version: 1,
    name: "Davet",
    grossPriceCents: 400_000,
    miniQrCount: 20,
    tableQrCount: 0,
    welcomeSignCount: 1,
    hardStorageBytes: null,
    fairUseSoftCapBytes: 100 * GIB,
    uploadWindow: "seven-days",
    digitalRetentionMonths: 3,
    physicalRetentionMonths: 0,
    revisionLimit: 2,
    includedEventCount: 1,
    secondEventPrintingIncluded: false,
    qualifiesForVolumeCommission: true,
  },
  "plan-3": {
    code: "plan-3",
    version: 1,
    name: "Premium Hikâye",
    grossPriceCents: 1_000_000,
    miniQrCount: 40,
    tableQrCount: 10,
    welcomeSignCount: 2,
    hardStorageBytes: null,
    fairUseSoftCapBytes: 150 * GIB,
    uploadWindow: "seven-days",
    digitalRetentionMonths: 3,
    physicalRetentionMonths: 12,
    revisionLimit: 3,
    includedEventCount: 2,
    secondEventPrintingIncluded: true,
    qualifiesForVolumeCommission: true,
  },
});
for (const policy of Object.values(PACKAGE_CATALOG)) Object.freeze(policy);

export const FAIR_USE_POLICY = {
  maxPhotoBytes: 25 * 1024 ** 2,
  maxVideoBytes: 1 * GIB,
  maxVideoDurationSeconds: 15 * 60,
  allowedContent: ["photo", "video"] as const,
};

export function packageStorageLimit(policy: Pick<PackagePolicy, "hardStorageBytes" | "fairUseSoftCapBytes">) {
  return policy.hardStorageBytes ?? policy.fairUseSoftCapBytes;
}

export function storageBytesInUse(value: {
  media_bytes?: number;
  trashed_bytes?: number;
  reserved_upload_bytes?: number;
}) {
  return Math.max(0, value.media_bytes || 0) +
    Math.max(0, value.trashed_bytes || 0) +
    Math.max(0, value.reserved_upload_bytes || 0);
}

export type CommissionSnapshot = {
  grossCents: number;
  vatRateBps: number;
  netCents: number;
  qualifyingOrdinal: number | null;
  commissionRateBps: 3000 | 4000;
  commissionCents: number;
};

export type AddOnSelection = { product_id: string; quantity: number };
export type AddOnSnapshot = AddOnSelection & {
  name: string;
  unit_gross_cents: number;
  line_gross_cents: number;
  commissionable: boolean;
};

export type PriceSnapshot = {
  package_gross_cents: number;
  add_ons: AddOnSnapshot[];
  add_on_gross_cents: number;
  gross_cents: number;
  commissionable_gross_cents: number;
};

export function priceSnapshot(
  code: PackageCode,
  selections: AddOnSelection[],
  products: Array<{ id: string; name: string; gross_price_cents: number; commissionable: boolean }>,
): PriceSnapshot {
  const byId = new Map(products.map((product) => [product.id, product]));
  const addOns = selections.map((selection) => {
    const product = byId.get(selection.product_id);
    if (!product) throw new Error("Ek ürün bulunamadı veya satışa kapalı.");
    if (!Number.isInteger(selection.quantity) || selection.quantity < 1 || selection.quantity > 100)
      throw new Error("Ek ürün adedi 1 ile 100 arasında olmalı.");
    return {
      ...selection,
      name: product.name,
      unit_gross_cents: product.gross_price_cents,
      line_gross_cents: product.gross_price_cents * selection.quantity,
      commissionable: product.commissionable,
    };
  });
  const packageGross = PACKAGE_CATALOG[code].grossPriceCents;
  const addOnGross = addOns.reduce((sum, item) => sum + item.line_gross_cents, 0);
  return {
    package_gross_cents: packageGross,
    add_ons: addOns,
    add_on_gross_cents: addOnGross,
    gross_cents: packageGross + addOnGross,
    commissionable_gross_cents: packageGross + addOns.filter((item) => item.commissionable).reduce((sum, item) => sum + item.line_gross_cents, 0),
  };
}

export function netCentsFromVatIncluded(grossCents: number, vatRateBps: number) {
  if (!Number.isInteger(grossCents) || grossCents < 0)
    throw new Error("Brüt tutar kuruş cinsinden pozitif bir tam sayı olmalı.");
  if (!Number.isInteger(vatRateBps) || vatRateBps < 0)
    throw new Error("KDV oranı baz puan cinsinden pozitif bir tam sayı olmalı.");
  return Math.round((grossCents * 10_000) / (10_000 + vatRateBps));
}

export function commissionSnapshot(
  packageCode: PackageCode,
  qualifyingOrdinal: number | null,
  vatRateBps: number,
  pricing?: Pick<PriceSnapshot, "gross_cents" | "commissionable_gross_cents">,
): CommissionSnapshot {
  const selected = PACKAGE_CATALOG[packageCode];
  if (selected.qualifiesForVolumeCommission && (!qualifyingOrdinal || qualifyingOrdinal < 1))
    throw new Error("Plan 2 ve Plan 3 satışlarında aylık satış sırası gerekli.");
  const commissionRateBps =
    selected.qualifiesForVolumeCommission && qualifyingOrdinal! >= 11 ? 4000 : 3000;
  const grossCents = pricing?.gross_cents ?? selected.grossPriceCents;
  const netCents = netCentsFromVatIncluded(grossCents, vatRateBps);
  const commissionableNetCents = netCentsFromVatIncluded(
    pricing?.commissionable_gross_cents ?? selected.grossPriceCents,
    vatRateBps,
  );
  return {
    grossCents,
    vatRateBps,
    netCents,
    qualifyingOrdinal: selected.qualifiesForVolumeCommission ? qualifyingOrdinal : null,
    commissionRateBps,
    commissionCents: Math.round((commissionableNetCents * commissionRateBps) / 10_000),
  };
}

export function packageUploadDays(code: PackageCode) {
  return PACKAGE_CATALOG[code].uploadWindow === "event-day" ? 1 : 7;
}

export function packageSnapshot(code: PackageCode): PackagePolicy {
  return structuredClone(PACKAGE_CATALOG[code]);
}

export function istanbulCalendarMonth(instant: Date | string) {
  const date = typeof instant === "string" ? new Date(instant) : instant;
  if (Number.isNaN(date.getTime())) throw new Error("Geçersiz satış tarihi.");
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Istanbul",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  return `${year}-${month}`;
}
