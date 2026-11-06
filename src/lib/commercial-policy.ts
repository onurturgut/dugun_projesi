export const GIB = 1024 ** 3;

export type PackageCode = "plan-1" | "plan-2" | "plan-3";

export type PackagePolicy = {
  code: PackageCode;
  version: number;
  name: string;
  grossPriceCents: number;
  miniQrCount: number;
  /** Historical package snapshots only. New catalogs do not offer table cards. */
  tableQrCount?: number;
  welcomeSignCount: number;
  hardStorageBytes: number | null;
  fairUseSoftCapBytes: number | null;
  uploadWindow: "event-day" | "seven-days";
  digitalRetentionMonths: number;
  physicalRetentionMonths: number;
  revisionLimit: number | null;
  includedEventCount: number;
  secondEventPrintingIncluded: boolean;
  qualifiesForVolumeCommission: boolean;
  digitalInvitationIncluded?: boolean;
};

export const PACKAGE_CATALOG_V1: Readonly<
  Record<PackageCode, Readonly<PackagePolicy>>
> = Object.freeze({
  "plan-1": Object.freeze({
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
  }),
  "plan-2": Object.freeze({
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
  }),
  "plan-3": Object.freeze({
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
  }),
});

export const PACKAGE_CATALOG_V2: Readonly<Record<PackageCode, Readonly<PackagePolicy>>> = Object.freeze({
  "plan-1": {
    code: "plan-1",
    version: 2,
    name: "Başlangıç",
    grossPriceCents: 350_000,
    miniQrCount: 30,
    welcomeSignCount: 0,
    hardStorageBytes: 30 * GIB,
    fairUseSoftCapBytes: null,
    uploadWindow: "event-day",
    digitalRetentionMonths: 12,
    physicalRetentionMonths: 0,
    revisionLimit: null,
    includedEventCount: 1,
    secondEventPrintingIncluded: false,
    qualifiesForVolumeCommission: false,
  },
  "plan-2": {
    code: "plan-2",
    version: 2,
    name: "Davet",
    grossPriceCents: 500_000,
    miniQrCount: 50,
    welcomeSignCount: 1,
    hardStorageBytes: 50 * GIB,
    fairUseSoftCapBytes: null,
    uploadWindow: "seven-days",
    digitalRetentionMonths: 12,
    physicalRetentionMonths: 0,
    revisionLimit: null,
    includedEventCount: 1,
    secondEventPrintingIncluded: false,
    qualifiesForVolumeCommission: true,
  },
  "plan-3": {
    code: "plan-3",
    version: 2,
    name: "Premium Hikâye",
    grossPriceCents: 1_000_000,
    miniQrCount: 70,
    welcomeSignCount: 1,
    hardStorageBytes: 100 * GIB,
    fairUseSoftCapBytes: null,
    uploadWindow: "seven-days",
    digitalRetentionMonths: 12,
    physicalRetentionMonths: 12,
    revisionLimit: null,
    includedEventCount: 2,
    secondEventPrintingIncluded: true,
    qualifiesForVolumeCommission: true,
    digitalInvitationIncluded: true,
  },
});
for (const policy of Object.values(PACKAGE_CATALOG_V2)) Object.freeze(policy);

export const PACKAGE_CATALOG_VERSIONS = Object.freeze({
  1: PACKAGE_CATALOG_V1,
  2: PACKAGE_CATALOG_V2,
});

export const PACKAGE_CATALOG = PACKAGE_CATALOG_V2;

export type PhotographerPackagePolicy = {
  code: "photographer-plan";
  version: number;
  name: string;
  grossPriceCents: number;
  vatRateBps: number;
  settlementPolicy: "fixed-photographer-distribution";
  digitalRetentionMonths: number;
  photographerGrossCents: number;
  originatingPartnerGrossCents: number;
  platformGrossCents: number;
};

export const PHOTOGRAPHER_PACKAGE: Readonly<PhotographerPackagePolicy> =
  Object.freeze({
    code: "photographer-plan",
    version: 1,
    name: "Profesyonel Anı Çekimi",
    grossPriceCents: 400_000,
    vatRateBps: 2000,
    settlementPolicy: "fixed-photographer-distribution",
    digitalRetentionMonths: 12,
    photographerGrossCents: 300_000,
    originatingPartnerGrossCents: 50_000,
    platformGrossCents: 50_000,
  });

export type PhotographerSettlementSnapshot = {
  packageCode: "photographer-plan";
  packageVersion: number;
  grossCents: number;
  vatRateBps: number;
  netCents: number;
  vatCents: number;
  photographerGrossCents: number;
  originatingPartnerGrossCents: number;
  platformGrossCents: number;
};

export function photographerSettlementSnapshot(
  policy: PhotographerPackagePolicy = PHOTOGRAPHER_PACKAGE,
): PhotographerSettlementSnapshot {
  const netCents = netCentsFromVatIncluded(
    policy.grossPriceCents,
    policy.vatRateBps,
  );
  const snapshot: PhotographerSettlementSnapshot = {
    packageCode: policy.code,
    packageVersion: policy.version,
    grossCents: policy.grossPriceCents,
    vatRateBps: policy.vatRateBps,
    netCents,
    vatCents: policy.grossPriceCents - netCents,
    photographerGrossCents: policy.photographerGrossCents,
    originatingPartnerGrossCents: policy.originatingPartnerGrossCents,
    platformGrossCents: policy.platformGrossCents,
  };
  const allocatedGross =
    snapshot.photographerGrossCents +
    snapshot.originatingPartnerGrossCents +
    snapshot.platformGrossCents;
  if (allocatedGross !== snapshot.grossCents)
    throw new Error("Fotoğrafçı paketi dağılımı satış toplamına eşit olmalı.");
  return snapshot;
}

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
  vat_rate_bps?: number;
  line_net_cents?: number;
  line_vat_cents?: number;
  commissionable: boolean;
  unit_cost_cents?: number;
  line_cost_cents?: number;
  pricing_type?: "fixed" | "package_percentage_discount";
  percentage_bps?: number;
  effect_type?: string;
  effect_value?: number;
  print_format?: "vertical_mini" | "table_card";
};

export type PriceSnapshot = {
  package_gross_cents: number;
  add_ons: AddOnSnapshot[];
  add_on_gross_cents: number;
  gross_cents: number;
  commissionable_gross_cents: number;
  net_cents?: number;
  vat_cents?: number;
  commissionable_net_cents?: number;
  qr_details?: Array<{
    product_id: string;
    name: string;
    included_quantity: number;
    total_quantity: number;
    extra_quantity: number;
    unit_gross_cents: number;
    extra_gross_cents: number;
  }>;
};

export function priceSnapshot(
  code: PackageCode,
  selections: AddOnSelection[],
  products: Array<{
    id: string;
    name: string;
    gross_price_cents: number;
    commissionable: boolean;
    unit_cost_cents?: number;
    pricing_type?: "fixed" | "package_percentage_discount";
    percentage_bps?: number;
    effect_type?: string;
    effect_value?: number;
    print_format?: "vertical_mini" | "table_card";
    minimum_quantity?: number;
    maximum_quantity?: number;
    eligible_package_codes?: PackageCode[];
    vat_rate_bps?: number;
  }>,
): PriceSnapshot {
  const byId = new Map(products.map((product) => [product.id, product]));
  if (new Set(selections.map((selection) => selection.product_id)).size !== selections.length)
    throw new Error("Aynı ek ürün satışa birden fazla satır olarak eklenemez.");
  const packageGross = PACKAGE_CATALOG[code].grossPriceCents;
  const addOns = selections.map((selection) => {
    const product = byId.get(selection.product_id);
    if (!product) throw new Error("Ek ürün bulunamadı veya satışa kapalı.");
    const minimum = product.minimum_quantity || 1;
    const maximum = product.maximum_quantity || 100;
    if (!Number.isInteger(selection.quantity) || selection.quantity < minimum || selection.quantity > maximum)
      throw new Error("Ek ürün adedi 1 ile 100 arasında olmalı.");
    if (product.eligible_package_codes?.length && !product.eligible_package_codes.includes(code))
      throw new Error("Ek ürün seçilen paketle birlikte sunulmuyor.");
    if (product.pricing_type === "package_percentage_discount" && selection.quantity !== 1)
      throw new Error("Yüzde indirimli ek ürün yalnızca bir kez seçilebilir.");
    if (
      product.pricing_type === "package_percentage_discount" &&
      (!Number.isInteger(product.percentage_bps) || product.percentage_bps! < 1 || product.percentage_bps! > 9000)
    )
      throw new Error("Yüzde indirimli ek ürün için geçerli bir indirim oranı gerekli.");
    const unitGross = product.pricing_type === "package_percentage_discount"
      ? -Math.round((packageGross * (product.percentage_bps || 0)) / 10_000)
      : product.gross_price_cents;
    const lineGross = unitGross * selection.quantity;
    const lineNet = lineGross >= 0
      ? netCentsFromVatIncluded(lineGross, product.vat_rate_bps ?? 2000)
      : -netCentsFromVatIncluded(Math.abs(lineGross), product.vat_rate_bps ?? 2000);
    return {
      ...selection,
      name: product.name,
      unit_gross_cents: unitGross,
      line_gross_cents: lineGross,
      vat_rate_bps: product.vat_rate_bps ?? 2000,
      line_net_cents: lineNet,
      line_vat_cents: lineGross - lineNet,
      commissionable: true,
      unit_cost_cents: product.unit_cost_cents || 0,
      line_cost_cents: (product.unit_cost_cents || 0) * selection.quantity,
      pricing_type: product.pricing_type || "fixed",
      percentage_bps: product.percentage_bps,
      effect_type: product.effect_type,
      effect_value: product.effect_value,
      print_format: product.print_format,
    };
  });
  const addOnGross = addOns.reduce((sum, item) => sum + item.line_gross_cents, 0);
  const gross = packageGross + addOnGross;
  if (gross < 0) throw new Error("Ek ürünler satış toplamını sıfırın altına düşüremez.");
  return {
    package_gross_cents: packageGross,
    add_ons: addOns,
    add_on_gross_cents: addOnGross,
    gross_cents: gross,
    commissionable_gross_cents: gross,
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

export function packageSnapshotAtVersion(
  code: PackageCode,
  version: 1 | 2,
): PackagePolicy {
  return structuredClone(PACKAGE_CATALOG_VERSIONS[version][code]);
}

export function resolvePackageSnapshot(
  snapshot?: PackagePolicy,
  code?: PackageCode,
): PackagePolicy {
  if (snapshot) return snapshot;
  return packageSnapshot(code === "plan-2" || code === "plan-3" ? code : "plan-1");
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
