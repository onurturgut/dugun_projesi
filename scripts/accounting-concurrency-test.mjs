import assert from "node:assert/strict";
import { MongoClient } from "mongodb";
const client = new MongoClient(process.env.MONGODB_URI || "mongodb://127.0.0.1:27017");
const name = `test_accounting_race_${Date.now()}`;
try {
  await client.connect(); const db = client.db(name);
  await db.collection("sales").insertOne({ id: "sale-1", status: "draft", gross_cents: 10000, paid_cents: 0 });
  await db.collection("payments").createIndex({ reference: 1 }, { unique: true });
  async function pay(reference) { const expectedPaid = 0; const session = client.startSession(); try { return await session.withTransaction(async () => { const changed = await db.collection("sales").updateOne({ id: "sale-1", status: "draft", paid_cents: expectedPaid }, { $set: { paid_cents: expectedPaid + 6000 } }, { session }); if (!changed.modifiedCount) throw new Error("concurrent-change"); await db.collection("payments").insertOne({ reference, amount_cents: 6000 }, { session }); return true; }); } finally { await session.endSession(); } }
  const results = await Promise.allSettled([pay("race-a"), pay("race-b")]);
  assert.equal(results.filter((item) => item.status === "fulfilled").length, 1);
  assert.equal((await db.collection("sales").findOne({ id: "sale-1" })).paid_cents, 6000);
  assert.equal(await db.collection("payments").countDocuments(), 1);
  console.log("PASS: concurrent installments cannot both update the same balance version.");
} finally { if (name.startsWith("test_accounting_race_")) await client.db(name).dropDatabase().catch(() => undefined); await client.close(); }
