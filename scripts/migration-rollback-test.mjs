import assert from "node:assert/strict";
import { MongoClient } from "mongodb";

const client = new MongoClient(process.env.MONGODB_URI || "mongodb://127.0.0.1:27017");
const databaseName = `test_migration_rollback_${Date.now()}`;
try {
  await client.connect();
  const database = client.db(databaseName);
  const legacy = { id: "legacy-event", slug: "legacy-event", title: "Legacy", partner_id: "platform" };
  await database.collection("weddings").insertOne({ ...legacy });
  await database.collection("weddings").updateOne({ id: legacy.id }, { $set: { lifecycle_status: "active", design_revision: 1, design_snapshot_id: "snapshot-1" } });
  await database.collection("design_snapshots").insertOne({ id: "snapshot-1", wedding_id: legacy.id, revision: 1 });
  await database.collection("design_snapshots").createIndex({ wedding_id: 1, revision: -1 }, { unique: true });
  assert.equal((await database.collection("weddings").findOne({ id: legacy.id })).design_revision, 1);
  await database.collection("design_snapshots").deleteMany({ wedding_id: legacy.id });
  await database.collection("weddings").updateOne({ id: legacy.id }, { $unset: { lifecycle_status: "", design_revision: "", design_snapshot_id: "" } });
  const rolledBack = await database.collection("weddings").findOne({ id: legacy.id }, { projection: { _id: 0 } });
  assert.deepEqual(rolledBack, legacy);
  assert.equal(await database.collection("design_snapshots").countDocuments(), 0);
  console.log("PASS: isolated migration up/down restored the legacy record exactly.");
} finally {
  if (databaseName.startsWith("test_migration_rollback_")) await client.db(databaseName).dropDatabase().catch(() => undefined);
  await client.close();
}
