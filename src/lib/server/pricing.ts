import "server-only";
import type { Db, ClientSession } from "mongodb";
import {
  PACKAGE_CATALOG,
  PHOTOGRAPHER_PACKAGE,
  netCentsFromVatIncluded,
  priceSnapshot,
  type AddOnSelection,
  type PackageCode,
  type PriceSnapshot,
} from "../commercial-policy";
import type {
  AddOnProduct,
  PackageConfiguration,
  PartnerCommissionPolicy,
  PhotographerPackageConfiguration,
  QrQuantitySelection,
} from "../models";
import type { CommissionPolicySnapshot } from "../finance";

export const DEFAULT_VAT_RATE_BPS = 2000;

export function legacyPhotographerPackageConfiguration(): PhotographerPackageConfiguration {
  return {
    ...structuredClone(PHOTOGRAPHER_PACKAGE),
    active: true,
    description: "Profesyonel çekim ve kontrollü dijital teslimat hizmeti.",
    updated_at: "legacy-catalog-v1",
    updated_by: "migration-required",
  };
}

export async function currentPhotographerPackage(database: Db, includeInactive = false) {
  const stored = await database.collection<PhotographerPackageConfiguration>("photographer_package_configurations").findOne(
    { code: "photographer-plan" },
    { projection: { _id: 0 } },
  );
  if (stored && !stored.active && !includeInactive)
    throw new Error("Fotoğrafçı paketi yeni satışlara kapalı.");
  return stored || legacyPhotographerPackageConfiguration();
}

export function legacyPackageConfiguration(code: PackageCode): PackageConfiguration {
  return {
    ...structuredClone(PACKAGE_CATALOG[code]),
    active: true,
    description: "",
    category: "event",
    display_order: Number(code.slice(-1)),
    featured: code === "plan-2",
    vat_rate_bps: DEFAULT_VAT_RATE_BPS,
    target_margin_bps: 2500,
    variable_cost_cents: 0,
    updated_at: "legacy-catalog-v2",
    updated_by: "migration-required",
  };
}

export async function currentPackages(database: Db) {
  const stored = await database
    .collection<PackageConfiguration>("package_configurations")
    .find({}, { projection: { _id: 0 } })
    .sort({ display_order: 1 })
    .toArray();
  const codes = Object.keys(PACKAGE_CATALOG) as PackageCode[];
  const byCode = new Map(stored.map((item) => [item.code, item]));
  const items = codes
    .map((code) => byCode.get(code) || legacyPackageConfiguration(code))
    .sort((left, right) => left.display_order - right.display_order);
  return {
    source: stored.length === codes.length
      ? "database" as const
      : stored.length
        ? "partial_database_migration_required" as const
        : "legacy_catalog_migration_required" as const,
    items,
  };
}

export async function currentPackage(database: Db, code: PackageCode, includeInactive = false) {
  const stored = await database.collection<PackageConfiguration>("package_configurations").findOne(
    { code },
    { projection: { _id: 0 } },
  );
  if (stored && !stored.active && !includeInactive)
    throw new Error("Seçilen paket yeni satışlara kapalı.");
  return stored || legacyPackageConfiguration(code);
}

export async function currentPriceSnapshot(
  database: Db,
  code: PackageCode,
  selections: AddOnSelection[],
): Promise<{ package_snapshot: PackageConfiguration; price_snapshot: PriceSnapshot }> {
  const [packageConfig, products] = await Promise.all([
    currentPackage(database, code),
    database.collection<AddOnProduct>("add_on_products").find({
      id: { $in: selections.map((item) => item.product_id) },
      active: true,
    }).toArray(),
  ]);
  const base = priceSnapshotForPackage(packageConfig, selections, products);
  return { package_snapshot: structuredClone(packageConfig), price_snapshot: base };
}

export function priceSnapshotForPackage(
  packageConfig: PackageConfiguration,
  selections: AddOnSelection[],
  products: AddOnProduct[],
) {
  const code = packageConfig.code;
  const base = priceSnapshot(code, selections, products);
  const delta = packageConfig.grossPriceCents - PACKAGE_CATALOG[code].grossPriceCents;
  const packageNet = netCentsFromVatIncluded(packageConfig.grossPriceCents, packageConfig.vat_rate_bps);
  const addOnNet = base.add_ons.reduce((sum, item) => sum + (item.line_net_cents ?? netCentsFromVatIncluded(Math.max(0, item.line_gross_cents), item.vat_rate_bps ?? packageConfig.vat_rate_bps)), 0);
  const gross = base.gross_cents + delta;
  const net = packageNet + addOnNet;
  return {
    ...base,
    package_gross_cents: packageConfig.grossPriceCents,
    gross_cents: gross,
    commissionable_gross_cents: base.commissionable_gross_cents + delta,
    net_cents: net,
    vat_cents: gross - net,
    commissionable_net_cents: net,
  };
}

export function selectionsWithExtraQr(
  packageConfig: PackageConfiguration,
  selections: AddOnSelection[],
  qrSelections: QrQuantitySelection[],
  products: AddOnProduct[],
) {
  const productsById = new Map(products.map((item) => [item.id, item]));
  const qrIds = new Set(qrSelections.map((item) => item.product_id));
  if (selections.some((item) => qrIds.has(item.product_id)))
    throw new Error("QR ürünü hem ek ürün hem toplam QR adedi olarak gönderilemez.");
  const normalized = [...selections];
  const details = qrSelections.map((selection) => {
    const product = productsById.get(selection.product_id);
    if (!product || !product.active || product.category !== "qr_print" || product.effect_type !== "print_quantity")
      throw new Error("Ekstra QR ürünü bulunamadı veya satışa kapalı.");
    if (product.unit !== "item" || product.effect_value !== 1)
      throw new Error("Ekstra QR ürünü birim adet fiyatıyla tanımlanmalıdır.");
    const included = product.print_format === "table_card"
      ? packageConfig.tableQrCount || 0
      : packageConfig.miniQrCount;
    const extra = Math.max(0, selection.total_quantity - included);
    if (extra > (product.maximum_quantity || 100))
      throw new Error("İstenen ekstra QR adedi ürün üst sınırını aşıyor.");
    if (extra > 0) normalized.push({ product_id: product.id, quantity: extra });
    return {
      product_id: product.id,
      name: product.name,
      included_quantity: included,
      total_quantity: selection.total_quantity,
      extra_quantity: extra,
      unit_gross_cents: product.gross_price_cents,
      extra_gross_cents: extra * product.gross_price_cents,
    };
  });
  return { selections: normalized, qr_details: details };
}

export async function currentCommissionPolicy(
  database: Db,
  partnerId: string,
  occurredAt: string,
  session?: ClientSession,
): Promise<CommissionPolicySnapshot> {
  const policy = await database.collection<PartnerCommissionPolicy>("partner_commission_policies").findOne(
    { partner_id: partnerId, active: true, effective_from: { $lte: occurredAt } },
    { sort: { effective_from: -1, version: -1 }, session },
  );
  if (policy)
    return {
      policy_id: policy.id,
      version: policy.version,
      base_rate_bps: policy.base_rate_bps,
      threshold: policy.threshold,
      elevated_rate_bps: policy.elevated_rate_bps,
      tiered: policy.tiered,
      qualifying_package_codes: policy.qualifying_package_codes,
      effective_from: policy.effective_from,
    };
  return {
    policy_id: "legacy-default-migration-required",
    version: 1,
    base_rate_bps: 3000,
    threshold: 10,
    elevated_rate_bps: 4000,
    tiered: true,
    qualifying_package_codes: ["plan-2", "plan-3"],
    effective_from: "1970-01-01T00:00:00.000Z",
  };
}
