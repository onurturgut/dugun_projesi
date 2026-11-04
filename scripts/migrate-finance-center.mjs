import { MongoClient } from "mongodb";
import { randomUUID } from "node:crypto";

const uri = process.env.MONGODB_URI;
if (!uri) throw new Error("MONGODB_URI gerekli.");
const apply = process.argv.includes("--apply");
const client = new MongoClient(uri);
const packages = [
  { code: "plan-1", version: 2, name: "Başlangıç", grossPriceCents: 350000, miniQrCount: 30, welcomeSignCount: 0, hardStorageBytes: 30 * 1024 ** 3, fairUseSoftCapBytes: null, uploadWindow: "event-day", digitalRetentionMonths: 12, physicalRetentionMonths: 0, revisionLimit: null, includedEventCount: 1, secondEventPrintingIncluded: false, qualifiesForVolumeCommission: false },
  { code: "plan-2", version: 2, name: "Davet", grossPriceCents: 500000, miniQrCount: 50, welcomeSignCount: 1, hardStorageBytes: 50 * 1024 ** 3, fairUseSoftCapBytes: null, uploadWindow: "seven-days", digitalRetentionMonths: 12, physicalRetentionMonths: 0, revisionLimit: null, includedEventCount: 1, secondEventPrintingIncluded: false, qualifiesForVolumeCommission: true },
  { code: "plan-3", version: 2, name: "Premium Hikâye", grossPriceCents: 1000000, miniQrCount: 70, welcomeSignCount: 1, hardStorageBytes: 100 * 1024 ** 3, fairUseSoftCapBytes: null, uploadWindow: "seven-days", digitalRetentionMonths: 12, physicalRetentionMonths: 12, revisionLimit: null, includedEventCount: 2, secondEventPrintingIncluded: true, qualifiesForVolumeCommission: true, digitalInvitationIncluded: true },
];
const photographerPackage = {
  code: "photographer-plan", version: 1, name: "Profesyonel Anı Çekimi",
  description: "Profesyonel çekim ve kontrollü dijital teslimat hizmeti.",
  grossPriceCents: 400000, vatRateBps: 2000,
  settlementPolicy: "fixed-photographer-distribution", digitalRetentionMonths: 12,
  photographerGrossCents: 300000, originatingPartnerGrossCents: 50000,
  platformGrossCents: 50000, active: true,
};

try {
  await client.connect();
  const db = client.db(process.env.MONGODB_DB || "wedding_memories");
  const [storedPackages, storedPhotographerPackage, partners, addOns] = await Promise.all([
    db.collection("package_configurations").find({}, { projection: { _id: 0, code: 1 } }).toArray(),
    db.collection("photographer_package_configurations").findOne({ code: photographerPackage.code }, { projection: { _id: 0, code: 1 } }),
    db.collection("partners").find({ active: true }, { projection: { _id: 0, id: 1 } }).toArray(),
    db.collection("add_on_products").find({}, { projection: { _id: 0, id: 1, unit_cost_cents: 1, vat_rate_bps: 1 } }).toArray(),
  ]);
  const missingPackages = packages.filter((item) => !storedPackages.some((stored) => stored.code === item.code));
  const policyPartnerIds = new Set((await db.collection("partner_commission_policies").find({ active: true }, { projection: { partner_id: 1 } }).toArray()).map((item) => item.partner_id));
  const missingPolicies = partners.filter((partner) => !policyPartnerIds.has(partner.id));
  const report = {
    mode: apply ? "apply" : "dry-run",
    package_records_to_seed: missingPackages.map((item) => item.code),
    photographer_package_to_seed: storedPhotographerPackage ? null : photographerPackage.code,
    partner_policies_to_seed: missingPolicies.map((item) => item.id),
    add_ons_missing_cost: addOns.filter((item) => item.unit_cost_cents == null).map((item) => item.id),
    add_ons_missing_vat: addOns.filter((item) => item.vat_rate_bps == null).map((item) => item.id),
  };
  console.log(JSON.stringify(report, null, 2));
  if (!apply) process.exitCode = 2;
  else {
    const now = new Date().toISOString();
    await Promise.all([
      db.collection("package_configurations").createIndex({ code: 1 }, { unique: true }),
      db.collection("photographer_package_configurations").createIndex({ code: 1 }, { unique: true }),
      db.collection("pricing_change_history").createIndex({ entity_type: 1, entity_id: 1, changed_at: -1 }),
      db.collection("partner_commission_policies").createIndex({ id: 1 }, { unique: true }),
      db.collection("partner_commission_policies").createIndex({ partner_id: 1, version: 1 }, { unique: true }),
      db.collection("expense_records").createIndex({ payment_date: -1, kind: 1, payment_status: 1 }),
      db.collection("tax_configurations").createIndex({ id: 1 }, { unique: true }),
      db.collection("payment_quotes").createIndex({ id: 1 }, { unique: true }),
    ]);
    for (const item of missingPackages) await db.collection("package_configurations").updateOne(
      { code: item.code },
      { $setOnInsert: { ...item, active: true, description: "", category: "event", display_order: Number(item.code.slice(-1)), featured: item.code === "plan-2", vat_rate_bps: 2000, target_margin_bps: 2500, variable_cost_cents: 0, updated_at: now, updated_by: "finance-center-migration" } },
      { upsert: true },
    );
    await db.collection("photographer_package_configurations").updateOne(
      { code: photographerPackage.code },
      { $setOnInsert: { ...photographerPackage, updated_at: now, updated_by: "finance-center-migration" } },
      { upsert: true },
    );
    for (const partner of missingPolicies) await db.collection("partner_commission_policies").updateOne(
      { partner_id: partner.id, active: true },
      { $setOnInsert: { id: randomUUID(), partner_id: partner.id, version: 1, base_rate_bps: 3000, threshold: 10, elevated_rate_bps: 4000, tiered: true, qualifying_package_codes: ["plan-2", "plan-3"], effective_from: "1970-01-01T00:00:00.000Z", active: true, created_at: now, created_by: "finance-center-migration", updated_at: now, updated_by: "finance-center-migration" } },
      { upsert: true },
    );
    await db.collection("tax_configurations").updateOne(
      { id: "default" },
      { $setOnInsert: { id: "default", version: 1, default_vat_rate_bps: 2000, category_vat_rate_bps: {}, carried_vat_cents: 0, effective_from: "1970-01-01T00:00:00.000Z", updated_at: now, updated_by: "finance-center-migration" } },
      { upsert: true },
    );
    console.log("Finance center migration applied idempotently. Existing values were not overwritten.");
  }
} finally {
  await client.close();
}
