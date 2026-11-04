import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI;
if (!uri) throw new Error("MONGODB_URI gerekli.");

const expectedPackages = [
  { code: "plan-1", version: 2, name: "Başlangıç", grossPriceCents: 350000, miniQrCount: 30 },
  { code: "plan-2", version: 2, name: "Davet", grossPriceCents: 500000, miniQrCount: 50 },
  { code: "plan-3", version: 2, name: "Premium Hikâye", grossPriceCents: 1000000, miniQrCount: 70 },
];
const requiredPackageFields = [
  "code", "version", "name", "grossPriceCents", "miniQrCount", "welcomeSignCount",
  "active", "vat_rate_bps", "target_margin_bps", "variable_cost_cents",
];
const expectedPhotographerPackage = {
  code: "photographer-plan", version: 1, name: "Profesyonel Anı Çekimi",
  grossPriceCents: 400000, vatRateBps: 2000, digitalRetentionMonths: 12,
  photographerGrossCents: 300000, originatingPartnerGrossCents: 50000,
  platformGrossCents: 50000,
};

const client = new MongoClient(uri, { appName: "shineqr-finance-readonly-check" });
try {
  await client.connect();
  const database = client.db(process.env.MONGODB_DB || "wedding_memories");
  const [storedPackages, photographerPackages, partners, policies, addOns, taxes, historyCount, salesCount] = await Promise.all([
    database.collection("package_configurations").find({}, { projection: { _id: 0 } }).toArray(),
    database.collection("photographer_package_configurations").find({}, { projection: { _id: 0 } }).toArray(),
    database.collection("partners").find({ active: true }, { projection: { _id: 0, id: 1, name: 1 } }).toArray(),
    database.collection("partner_commission_policies").find({ active: true }, { projection: { _id: 0 } }).toArray(),
    database.collection("add_on_products").find({}, { projection: { _id: 0 } }).toArray(),
    database.collection("tax_configurations").find({}, { projection: { _id: 0 } }).toArray(),
    database.collection("pricing_change_history").countDocuments(),
    database.collection("sales").countDocuments(),
  ]);
  const packageCodes = new Map(storedPackages.map((item) => [item.code, item]));
  const missingPackages = expectedPackages.filter((item) => !packageCodes.has(item.code));
  const duplicatePackageCodes = Object.entries(Object.groupBy(storedPackages, (item) => String(item.code)))
    .filter(([, items]) => (items?.length || 0) > 1)
    .map(([code]) => code);
  const packageConflicts = expectedPackages.flatMap((expected) => {
    const stored = packageCodes.get(expected.code);
    if (!stored) return [];
    return Object.entries(expected)
      .filter(([field, value]) => stored[field] !== value)
      .map(([field, expectedValue]) => ({ code: expected.code, field, stored: stored[field], migration_default: expectedValue, action: "preserve_stored_value" }));
  });
  const missingPackageFields = storedPackages.flatMap((item) =>
    requiredPackageFields.filter((field) => item[field] == null).map((field) => ({ code: item.code, field })),
  );
  const activePoliciesByPartner = Object.groupBy(policies, (item) => String(item.partner_id));
  const duplicatePolicyVersions = Object.entries(Object.groupBy(policies, (item) => `${String(item.partner_id)}:${String(item.version)}`))
    .filter(([, items]) => (items?.length || 0) > 1)
    .map(([partner_version, items]) => ({ partner_version, policy_ids: items?.map((item) => item.id) || [] }));
  const missingPolicyPartners = partners.filter((partner) => !activePoliciesByPartner[partner.id]);
  const orphanPolicyIds = policies.filter((policy) => !partners.some((partner) => partner.id === policy.partner_id)).map((policy) => policy.id);
  const addOnMissingFields = addOns.map((item) => ({
    id: item.id,
    missing: ["unit_cost_cents", "vat_rate_bps", "minimum_quantity", "maximum_quantity", "eligible_package_codes"]
      .filter((field) => item[field] == null),
  })).filter((item) => item.missing.length > 0);
  const photographerPackage = photographerPackages.find((item) => item.code === expectedPhotographerPackage.code);
  const photographerPackageConflicts = photographerPackage
    ? Object.entries(expectedPhotographerPackage)
      .filter(([field, value]) => photographerPackage[field] !== value)
      .map(([field, migrationDefault]) => ({ field, stored: photographerPackage[field], migration_default: migrationDefault, action: "preserve_stored_value" }))
    : [];
  const report = {
    mode: "read-only",
    collections: {
      active_partners: partners.length,
      package_configurations: storedPackages.length,
      photographer_package_configurations: photographerPackages.length,
      add_on_products: addOns.length,
      active_commission_policies: policies.length,
      tax_configurations: taxes.length,
      pricing_change_history: historyCount,
      historical_sales: salesCount,
    },
    would_create: {
      packages: missingPackages.map((item) => item.code),
      photographer_package: photographerPackage ? null : expectedPhotographerPackage.code,
      commission_policies: missingPolicyPartners.map((item) => ({ partner_id: item.id, partner_name: item.name })),
      default_tax_configuration: !taxes.some((item) => item.id === "default"),
    },
    would_change: {
      existing_packages: [],
      existing_add_ons: [],
      note: "Apply migration uses $setOnInsert; existing package and add-on values are not overwritten.",
    },
    missing_or_conflicting: {
      duplicate_package_codes: duplicatePackageCodes,
      package_value_conflicts: packageConflicts,
      photographer_package_value_conflicts: photographerPackageConflicts,
      missing_package_fields: missingPackageFields,
      duplicate_commission_policy_versions: duplicatePolicyVersions,
      orphan_active_policy_ids: orphanPolicyIds,
      add_ons_missing_finance_fields: addOnMissingFields,
    },
    rollback: {
      automatic: false,
      strategy: "Delete only records whose created_by/updated_by is finance-center-migration and that have no later pricing history; never rewrite sales or organization snapshots.",
    },
  };
  console.log(JSON.stringify(report, null, 2));
  if (
    duplicatePackageCodes.length || duplicatePolicyVersions.length || orphanPolicyIds.length
  ) process.exitCode = 3;
} finally {
  await client.close();
}
