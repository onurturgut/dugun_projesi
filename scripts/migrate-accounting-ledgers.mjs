import { MongoClient } from "mongodb";
import { randomUUID } from "node:crypto";
const uri = process.env.MONGODB_URI; if (!uri) throw new Error("MONGODB_URI gerekli.");
const apply = process.argv.includes("--apply"), rollback = process.argv.includes("--rollback");
if (apply === rollback) throw new Error("--apply veya --rollback seçeneklerinden tam olarak birini kullanın.");
const client = new MongoClient(uri);
try {
  await client.connect(); const db = client.db(process.env.MONGODB_DB || "wedding_memories");
  if (rollback) {
    const backup = await db.collection("accounting_migration_backups").find({ migration: "accounting-ledgers-v1" }).toArray();
    for (const item of backup) { await db.collection("weddings").updateOne({ id: item.wedding_id, customer_account_id: item.customer_account_id }, { $unset: { customer_account_id: "" } }); await db.collection("sales").updateMany({ wedding_id: item.wedding_id, customer_account_id: item.customer_account_id }, { $unset: { customer_account_id: "" } }); }
    for (const name of ["payments", "accounting_documents", "bank_transactions"]) await db.collection(name).dropIndexes().catch(() => undefined);
    await db.collection("accounting_migration_backups").deleteMany({ migration: "accounting-ledgers-v1" });
    console.log(JSON.stringify({ mode: "rollback", restored_weddings: backup.length }));
  } else {
    const weddings = await db.collection("weddings").find({ customer_account_id: { $exists: false } }, { projection: { id: 1, partner_id: 1, owner_id: 1, customer_email: 1 } }).toArray();
    const identities = new Map(); let changed = 0;
    for (const wedding of weddings) {
      const key = `${wedding.partner_id}:${String(wedding.customer_email || wedding.owner_id || wedding.id).trim().toLowerCase()}`;
      const customer_account_id = identities.get(key) || randomUUID(); identities.set(key, customer_account_id);
      const result = await db.collection("weddings").updateOne({ id: wedding.id, customer_account_id: { $exists: false } }, { $set: { customer_account_id } });
      if (result.modifiedCount) { changed++; await db.collection("accounting_migration_backups").insertOne({ migration: "accounting-ledgers-v1", wedding_id: wedding.id, customer_account_id, created_at: new Date().toISOString() }); await db.collection("sales").updateMany({ wedding_id: wedding.id, customer_account_id: { $exists: false } }, { $set: { customer_account_id } }); }
    }
    await Promise.all([
      db.collection("payments").createIndex({ id: 1 }, { unique: true }), db.collection("payments").createIndex({ idempotency_key: 1 }, { unique: true }), db.collection("payments").createIndex({ reference: 1 }, { unique: true }), db.collection("payments").createIndex({ sale_id: 1, status: 1, paid_at: -1 }),
      db.collection("accounting_documents").createIndex({ id: 1 }, { unique: true }), db.collection("accounting_documents").createIndex({ sale_id: 1, type: 1 }, { unique: true }),
      db.collection("bank_transactions").createIndex({ id: 1 }, { unique: true }), db.collection("bank_transactions").createIndex({ reference: 1, amount_cents: 1, occurred_at: 1 }, { unique: true }), db.collection("bank_transactions").createIndex({ status: 1, occurred_at: -1 }),
    ]);
    console.log(JSON.stringify({ mode: "apply", assigned_customer_accounts: changed, distinct_accounts: identities.size }));
  }
} finally { await client.close(); }
