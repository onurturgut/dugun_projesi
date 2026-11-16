import "./configure-dns.mjs";
import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI;
if (!uri) throw new Error("MONGODB_URI gerekli.");
const apply = process.argv.includes("--apply");
const rollback = process.argv.includes("--rollback");
if (apply === rollback) throw new Error("--apply veya --rollback seçeneklerinden tam olarak birini kullanın.");

const definitions = [
  ["payment_intents", "payment_intents_id_uq", { id: 1 }, { unique: true }],
  ["payment_intents", "payment_intents_idempotency_uq", { idempotency_key: 1 }, { unique: true }],
  ["payment_intents", "payment_intents_provider_uq", { provider: 1, provider_intent_id: 1 }, { unique: true, sparse: true }],
  ["payment_intents", "payment_intents_sale_status", { sale_id: 1, status: 1, created_at: -1 }, {}],
  ["integration_outbox", "integration_outbox_id_uq", { id: 1 }, { unique: true }],
  ["integration_outbox", "integration_outbox_idempotency_uq", { idempotency_key: 1 }, { unique: true }],
  ["integration_outbox", "integration_outbox_delivery_queue", { status: 1, available_at: 1, created_at: 1 }, {}],
  ["integration_outbox", "integration_outbox_provider_queue_v2", { capability: 1, provider: 1, status: 1, available_at: 1, created_at: 1 }, {}],
  ["integration_webhook_events", "integration_webhooks_provider_event_uq", { provider: 1, provider_event_id: 1 }, { unique: true }],
  ["integration_webhook_events", "integration_webhooks_received", { received_at: -1, status: 1 }, {}],
  ["integration_webhook_events", "integration_webhooks_provider_queue_v2", { capability: 1, provider: 1, status: 1, available_at: 1, received_at: 1 }, {}],
];

const client = new MongoClient(uri);
try {
  await client.connect();
  const database = client.db(process.env.MONGODB_DB || "wedding_memories");
  if (rollback) {
    for (const [collection, name] of definitions) await database.collection(collection).dropIndex(name).catch(() => undefined);
  } else {
    for (const [collection, name, keys, options] of definitions) await database.collection(collection).createIndex(keys, { ...options, name });
  }
  console.log(JSON.stringify({ mode: apply ? "apply" : "rollback", indexes: definitions.length }));
} finally {
  await client.close();
}
