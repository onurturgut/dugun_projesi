import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { MongoClient, MongoServerError } from "mongodb";
import { calculateCommissionCents, commissionRateForOrdinal, netFromVatIncluded, type CommissionPolicySnapshot } from "../src/lib/finance";
import { istanbulCalendarMonth, type PackageCode } from "../src/lib/commercial-policy";

const uri = process.env.MONGODB_URI;
if (!uri) throw new Error("MONGODB_URI gerekli.");
const databaseName = `t_fin_${Date.now().toString(36)}_${randomUUID().slice(0, 8)}`;
if (!/^t_fin_[a-z0-9]+_[0-9a-f]{8}$/.test(databaseName))
  throw new Error("Güvenli test veritabanı adı üretilemedi.");
const client = new MongoClient(uri, { appName: "shineqr-finance-integration-test" });

type TestSale = { id: string; idempotency_key: string; partner_id: string; period: string; package_code: PackageCode; qualifying_ordinal: number; commission_rate_bps: number; commission_cents: number; commission_policy_snapshot: CommissionPolicySnapshot; status: "paid" | "refunded" };

try {
  await client.connect();
  const database = client.db(databaseName);
  await Promise.all([
    database.collection("sales").createIndex({ idempotency_key: 1 }, { unique: true }),
    database.collection("monthly_sales_counters").createIndex({ partner_id: 1, period: 1 }, { unique: true }),
    database.collection("partner_commission_policies").createIndex({ partner_id: 1, version: 1 }, { unique: true }),
  ]);
  const now = new Date().toISOString();
  await database.collection("partner_commission_policies").insertMany([
    { id: "policy-a", partner_id: "partner-a", version: 1, base_rate_bps: 3000, threshold: 10, elevated_rate_bps: 4000, tiered: true, qualifying_package_codes: ["plan-2", "plan-3"], effective_from: "2026-01-01T00:00:00.000Z", active: true, created_at: now },
    { id: "policy-b", partner_id: "partner-b", version: 1, base_rate_bps: 2500, threshold: 10, elevated_rate_bps: 3500, tiered: true, qualifying_package_codes: ["plan-2", "plan-3"], effective_from: "2026-01-01T00:00:00.000Z", active: true, created_at: now },
  ]);

  async function record(partnerId: string, occurredAt: string, idempotencyKey: string) {
    const existing = await database.collection<TestSale>("sales").findOne({ idempotency_key: idempotencyKey });
    if (existing) return existing;
    const session = client.startSession();
    let created: TestSale | null = null;
    try {
      await session.withTransaction(async () => {
        const raw = await database.collection("partner_commission_policies").findOne({ partner_id: partnerId, active: true, effective_from: { $lte: occurredAt } }, { session, sort: { effective_from: -1, version: -1 } });
        assert.ok(raw);
        const policy: CommissionPolicySnapshot = { policy_id: String(raw.id), version: Number(raw.version), base_rate_bps: Number(raw.base_rate_bps), threshold: Number(raw.threshold), elevated_rate_bps: Number(raw.elevated_rate_bps), tiered: Boolean(raw.tiered), qualifying_package_codes: raw.qualifying_package_codes as PackageCode[], effective_from: String(raw.effective_from) };
        const period = istanbulCalendarMonth(occurredAt);
        const counter = await database.collection("monthly_sales_counters").findOneAndUpdate(
          { partner_id: partnerId, period },
          { $setOnInsert: { partner_id: partnerId, period, refunded_count: 0 }, $inc: { paid_count: 1, net_count: 1 } },
          { upsert: true, returnDocument: "after", session },
        );
        const ordinal = Number(counter?.net_count || 1);
        const rate = commissionRateForOrdinal(policy, "plan-2", ordinal);
        created = { id: randomUUID(), idempotency_key: idempotencyKey, partner_id: partnerId, period, package_code: "plan-2", qualifying_ordinal: ordinal, commission_rate_bps: rate, commission_cents: calculateCommissionCents(netFromVatIncluded(500_000, 2000), rate), commission_policy_snapshot: structuredClone(policy), status: "paid" };
        await database.collection<TestSale>("sales").insertOne(created, { session });
      });
    } catch (reason) {
      if (reason instanceof MongoServerError && reason.code === 11000) {
        created = await database.collection<TestSale>("sales").findOne({ idempotency_key: idempotencyKey });
      } else throw reason;
    } finally { await session.endSession(); }
    assert.ok(created);
    return created;
  }

  await database.collection("monthly_sales_counters").insertOne({ partner_id: "partner-a", period: "2026-11", paid_count: 9, net_count: 9, refunded_count: 0 });
  const concurrent = await Promise.all([
    record("partner-a", "2026-11-20T09:00:00.000Z", "sale-a-10"),
    record("partner-a", "2026-11-20T09:00:00.001Z", "sale-a-11"),
  ]);
  assert.deepEqual(concurrent.map((item) => item.qualifying_ordinal).sort((a, b) => a - b), [10, 11]);
  assert.equal(concurrent.find((item) => item.qualifying_ordinal === 10)?.commission_rate_bps, 3000);
  assert.equal(concurrent.find((item) => item.qualifying_ordinal === 11)?.commission_rate_bps, 4000);

  const partnerB = await record("partner-b", "2026-11-20T10:00:00.000Z", "sale-b-1");
  assert.equal(partnerB.commission_rate_bps, 2500);
  const december = await record("partner-a", "2026-11-30T21:00:00.000Z", "sale-a-december-1");
  assert.equal(december.period, "2026-12");
  assert.equal(december.qualifying_ordinal, 1);
  assert.equal(december.commission_rate_bps, 3000);

  const beforeDuplicate = await database.collection("monthly_sales_counters").findOne({ partner_id: "partner-b", period: "2026-11" });
  const duplicate = await Promise.all([record("partner-b", "2026-11-21T10:00:00.000Z", "same-payment"), record("partner-b", "2026-11-21T10:00:00.000Z", "same-payment")]);
  assert.equal(duplicate[0].id, duplicate[1].id);
  const afterDuplicate = await database.collection("monthly_sales_counters").findOne({ partner_id: "partner-b", period: "2026-11" });
  assert.equal(Number(afterDuplicate?.net_count), Number(beforeDuplicate?.net_count) + 1);

  const tenth = concurrent.find((item) => item.qualifying_ordinal === 10)!;
  await database.collection<TestSale>("sales").updateOne({ id: tenth.id, status: "paid" }, { $set: { status: "refunded" } });
  await database.collection("monthly_sales_counters").updateOne({ partner_id: "partner-a", period: "2026-11" }, { $inc: { refunded_count: 1, net_count: -1 } });
  const afterRefund = await record("partner-a", "2026-11-22T10:00:00.000Z", "sale-after-refund");
  assert.equal(afterRefund.qualifying_ordinal, 11);
  assert.equal(afterRefund.commission_rate_bps, 4000);
  assert.equal((await database.collection<TestSale>("sales").findOne({ id: concurrent.find((item) => item.qualifying_ordinal === 11)!.id }))?.commission_rate_bps, 4000);

  await database.collection("partner_commission_policies").insertOne({ id: "policy-a-v2", partner_id: "partner-a", version: 2, base_rate_bps: 2800, threshold: 10, elevated_rate_bps: 4200, tiered: true, qualifying_package_codes: ["plan-2"], effective_from: "2026-11-23T00:00:00.000Z", active: true });
  const frozen = await database.collection<TestSale>("sales").findOne({ id: concurrent.find((item) => item.qualifying_ordinal === 10)!.id });
  assert.equal(frozen?.commission_policy_snapshot.base_rate_bps, 3000);
  const afterPolicyChange = await record("partner-a", "2026-11-24T10:00:00.000Z", "sale-after-policy-change");
  assert.equal(afterPolicyChange.commission_rate_bps, 4200);
  assert.equal(afterPolicyChange.commission_policy_snapshot.version, 2);
  console.log("PASS: MongoDB transactions, partner-specific rates, Istanbul month boundary, refund handling, idempotency and frozen snapshots.");
} finally {
  if (/^t_fin_[a-z0-9]+_[0-9a-f]{8}$/.test(databaseName))
    await client.db(databaseName).dropDatabase().catch(() => undefined);
  await client.close();
}
