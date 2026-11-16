import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import type { Db } from "mongodb";
import type { IntegrationOutboxEvent, ProviderWebhookEvent } from "../src/lib/models";
import { canTransitionPaymentIntent, createVerifiedWebhookEvent, nextOutboxFailure, outboxIdempotencyKey, paymentIntentAmount, paymentWebhookDecision, retryDelayMs } from "../src/lib/integration-events";
import { processNextIntegrationEvent } from "../src/lib/integration-outbox-runtime";
import { ingestIntegrationWebhook, processNextIntegrationWebhook } from "../src/lib/integration-webhook-runtime";
import { drainIntegrationQueue, runIntegrationQueues } from "../src/lib/integration-runner-runtime";

const outboxEvent = (overrides: Partial<IntegrationOutboxEvent> = {}): IntegrationOutboxEvent => ({
  id: "event-1",
  idempotency_key: "payment:intent.create:intent-1:v1",
  capability: "payment",
  event_type: "payment_intent.create",
  tenant_id: "partner-1",
  aggregate_id: "intent-1",
  payload: { payment_intent_id: "intent-1" },
  status: "pending",
  attempt_count: 0,
  max_attempts: 3,
  available_at: "2026-11-15T10:00:00.000Z",
  locked_at: null,
  locked_by: null,
  created_at: "2026-11-15T09:00:00.000Z",
  updated_at: "2026-11-15T09:00:00.000Z",
  provider_reference: null,
  provider_accepted_at: null,
  provider: "sandbox-pay",
  ...overrides,
});

function fakeDb(claimed: IntegrationOutboxEvent | null, modifiedCount = 1) {
  const calls: { claimFilter?: unknown; updates: unknown[] } = { updates: [] };
  const database = {
    collection() {
      return {
        async findOneAndUpdate(filter: unknown) {
          calls.claimFilter = filter;
          return claimed;
        },
        async updateOne(...args: unknown[]) {
          calls.updates.push(args);
          return { modifiedCount };
        },
      };
    },
  } as unknown as Db;
  return { database, calls };
}

test("payment intent terminal states cannot be reopened by delayed webhooks", () => {
  assert.equal(canTransitionPaymentIntent("created", "requires_action"), true);
  assert.equal(canTransitionPaymentIntent("processing", "succeeded"), true);
  assert.equal(canTransitionPaymentIntent("succeeded", "processing"), false);
  assert.equal(canTransitionPaymentIntent("cancelled", "succeeded"), false);
  assert.deepEqual(paymentWebhookDecision("processing", "succeeded"), { action: "apply" });
  assert.deepEqual(paymentWebhookDecision("succeeded", "succeeded"), { action: "duplicate" });
  assert.deepEqual(paymentWebhookDecision("succeeded", "processing"), {
    action: "ignore",
    reason: "terminal_or_out_of_order",
  });
});

test("verified webhook events retain only a bounded payload digest", () => {
  const rawPayload = JSON.stringify({ id: "evt-1", status: "succeeded", secret_like_value: "must-not-persist" });
  const event = createVerifiedWebhookEvent({
    id: "webhook-1",
    provider: "sandbox-pay",
    provider_event_id: "evt-1",
    capability: "payment",
    event_type: "payment.succeeded",
    raw_payload: rawPayload,
    received_at: "2026-11-15T10:00:00.000Z",
  });
  assert.equal(event.signature_verified, true);
  assert.match(event.payload_sha256, /^[a-f0-9]{64}$/);
  assert.equal(JSON.stringify(event).includes("must-not-persist"), false);
  assert.throws(() => createVerifiedWebhookEvent({
    id: "webhook-2",
    provider: "sandbox-pay",
    provider_event_id: "evt-2",
    capability: "payment",
    event_type: "payment.succeeded",
    raw_payload: "x".repeat(1_000_001),
    received_at: "2026-11-15T10:00:00.000Z",
  }));
  assert.throws(() => createVerifiedWebhookEvent({
    id: "webhook-secret",
    provider: "sandbox-pay",
    provider_event_id: "evt-secret",
    capability: "payment",
    event_type: "payment.succeeded",
    raw_payload: "{}",
    normalized_payload: { authorization_token: "must-not-persist" },
    received_at: "2026-11-15T10:00:00.000Z",
  }));
});

test("webhook ingestion rejects invalid signatures and deduplicates provider events", async () => {
  const inserted: unknown[] = [];
  let duplicate = false;
  const database = {
    collection() {
      return {
        async insertOne(value: unknown) {
          if (duplicate) throw Object.assign(new Error("duplicate"), { code: 11000 });
          inserted.push(value);
        },
      };
    },
  } as unknown as Db;
  const adapter = {
    capability: "payment" as const,
    provider: "sandbox-pay",
    verify: (_payload: string, headers: Readonly<Record<string, string>>) => headers.signature === "valid",
    normalize: () => ({ provider_event_id: "evt-unique", event_type: "payment.succeeded" }),
  };
  const rejected = await ingestIntegrationWebhook(database, adapter, { raw_payload: "{}", headers: { signature: "invalid" } });
  assert.deepEqual(rejected, { status: "rejected", reason: "invalid_signature" });
  assert.equal(inserted.length, 0);
  const accepted = await ingestIntegrationWebhook(
    database,
    adapter,
    { raw_payload: "{}", headers: { signature: "valid" } },
    new Date("2026-11-15T10:00:00.000Z"),
    () => "webhook-fixed",
  );
  assert.deepEqual(accepted, { status: "accepted", event_id: "webhook-fixed" });
  assert.equal(inserted.length, 1);
  duplicate = true;
  const repeated = await ingestIntegrationWebhook(database, adapter, { raw_payload: "{}", headers: { signature: "valid" } });
  assert.deepEqual(repeated, { status: "duplicate", provider_event_id: "evt-unique" });
});

test("webhook worker claims by provider and finalizes normalized events", async () => {
  const event = createVerifiedWebhookEvent({
    id: "webhook-worker-1",
    provider: "sandbox-pay",
    provider_event_id: "evt-worker-1",
    capability: "payment",
    event_type: "payment.succeeded",
    raw_payload: "{}",
    normalized_payload: { provider_intent_id: "pi-1", status: "succeeded" },
    received_at: "2026-11-15T10:00:00.000Z",
  });
  const calls: { filter?: unknown; updates: unknown[] } = { updates: [] };
  const database = {
    collection() {
      return {
        async findOneAndUpdate(filter: unknown) {
          calls.filter = filter;
          return { ...event, status: "processing", locked_by: "webhook-worker" } as ProviderWebhookEvent;
        },
        async updateOne(...args: unknown[]) {
          calls.updates.push(args);
          return { modifiedCount: 1 };
        },
      };
    },
  } as unknown as Db;
  let frozen = false;
  const result = await processNextIntegrationWebhook(
    database,
    {
      payment: {
        capability: "payment",
        provider: "sandbox-pay",
        async handle(claimed) {
          frozen = Object.isFrozen(claimed) && Object.isFrozen(claimed.normalized_payload);
          return { outcome: "processed" };
        },
      },
    },
    "webhook-worker",
    new Date("2026-11-15T10:01:00.000Z"),
  );
  assert.deepEqual(result, { status: "processed", event_id: "webhook-worker-1" });
  assert.equal(frozen, true);
  assert.match(JSON.stringify(calls.filter), /sandbox-pay/);
  assert.match(JSON.stringify(calls.updates), /processed/);
});

test("integration queue runner stops on idle and enforces its per-run cap", async () => {
  let calls = 0;
  const stopped = await drainIntegrationQueue(async () => {
    calls += 1;
    return { status: calls === 3 ? "idle" : "delivered" };
  });
  assert.deepEqual(stopped, { delivered: 2, idle: 1 });
  calls = 0;
  const capped = await drainIntegrationQueue(async () => {
    calls += 1;
    return { status: "delivered" };
  });
  assert.equal(calls, 25);
  assert.deepEqual(capped, { delivered: 25 });
  assert.rejects(() => drainIntegrationQueue(async () => ({ status: "idle" }), 26));
});

test("integration runtime stays idle with an empty approved adapter registry", async () => {
  const result = await runIntegrationQueues(
    {} as Db,
    { outbound: {}, webhookHandlers: {} },
    "test-worker",
    new Date("2026-11-16T08:00:00.000Z"),
  );
  assert.deepEqual(result, {
    outbox: { idle: 1 },
    webhooks: { idle: 1 },
  });
});

test("outbox retries use bounded exponential backoff and dead-letter after the limit", () => {
  assert.equal(retryDelayMs(1), 5_000);
  assert.equal(retryDelayMs(20), 3_600_000);
  const now = new Date("2026-11-15T10:00:00.000Z");
  const retry = nextOutboxFailure({ attempt_count: 0, max_attempts: 3 }, now, "provider_timeout");
  assert.equal(retry.status, "retry_scheduled");
  assert.equal(retry.available_at, "2026-11-15T10:00:05.000Z");
  const dead = nextOutboxFailure({ attempt_count: 2, max_attempts: 3 }, now, "provider_500");
  assert.equal(dead.status, "dead_letter");
  assert.equal(dead.attempt_count, 3);
});

test("outbox idempotency key isolates capability, aggregate and snapshot version", () => {
  assert.equal(outboxIdempotencyKey("accounting", "invoice.submit", "sale-1", 2), "accounting:invoice.submit:sale-1:v2");
  assert.throws(() => outboxIdempotencyKey("payment", "intent.create", "", 1));
});

test("payment intent amount is derived from frozen sale balance and exact first deposit", () => {
  assert.equal(
    paymentIntentAmount({
      gross_cents: 100_001,
      paid_cents: 0,
      payment_plan: "deferred",
      deposit_expected_cents: 20_000,
    }),
    20_000,
  );
  assert.equal(
    paymentIntentAmount({ gross_cents: 100_001, paid_cents: 20_000 }),
    80_001,
  );
  assert.throws(() =>
    paymentIntentAmount({
      gross_cents: 100_001,
      paid_cents: 0,
      payment_plan: "deferred",
      deposit_expected_cents: null,
    }),
  );
});

test("outbox processor claims only the configured provider and stores a valid receipt", async () => {
  const { database, calls } = fakeDb(outboxEvent());
  let frozen = false;
  const result = await processNextIntegrationEvent(
    database,
    {
      payment: {
        capability: "payment",
        provider: "sandbox-pay",
        async deliver(event) {
          frozen = Object.isFrozen(event);
          return { provider_reference: "sandbox-ref-1", accepted_at: "2026-11-15T10:00:01.000Z" };
        },
      },
    },
    "worker-1",
    new Date("2026-11-15T10:00:00.000Z"),
  );
  assert.equal(result.status, "delivered");
  assert.equal(frozen, true);
  assert.match(JSON.stringify(calls.claimFilter), /sandbox-pay/);
  assert.match(JSON.stringify(calls.updates), /sandbox-ref-1/);
});

test("outbox processor reclaims an expired lease and rejects an invalid receipt", async () => {
  const { database, calls } = fakeDb(outboxEvent({ status: "processing", locked_at: "2026-11-15T09:50:00.000Z" }));
  const result = await processNextIntegrationEvent(
    database,
    {
      payment: {
        capability: "payment",
        provider: "sandbox-pay",
        async deliver() {
          return { provider_reference: "", accepted_at: "not-a-date" };
        },
      },
    },
    "worker-2",
    new Date("2026-11-15T10:00:00.000Z"),
  );
  assert.equal(result.status, "retry_scheduled");
  assert.equal(result.error_code, "invalid_provider_receipt");
  assert.match(JSON.stringify(calls.claimFilter), /2026-11-15T09:55:00.000Z/);
});

test("outbox processor fails closed when a claimed event provider does not match", async () => {
  const { database } = fakeDb(outboxEvent({ provider: "unexpected-pay" }));
  const result = await processNextIntegrationEvent(
    database,
    {
      payment: {
        capability: "payment",
        provider: "sandbox-pay",
        async deliver() {
          throw new Error("deliver must not run");
        },
      },
    },
    "worker-3",
    new Date("2026-11-15T10:00:00.000Z"),
  );
  assert.equal(result.status, "retry_scheduled");
  assert.equal(result.error_code, "adapter_provider_mismatch");
});

test("outbox processor never reports delivery after losing its lease", async () => {
  const { database } = fakeDb(outboxEvent(), 0);
  const result = await processNextIntegrationEvent(
    database,
    {
      payment: {
        capability: "payment",
        provider: "sandbox-pay",
        async deliver() {
          return { provider_reference: "accepted-once", accepted_at: "2026-11-15T10:00:01.000Z" };
        },
      },
    },
    "worker-with-expired-lease",
    new Date("2026-11-15T10:00:00.000Z"),
  );
  assert.deepEqual(result, { status: "lease_lost", event_id: "event-1" });
});

test("outbox processor dead-letters expired payment intent before provider delivery", async () => {
  const { database, calls } = fakeDb(
    outboxEvent({ expires_at: "2026-11-15T09:59:59.000Z" }),
  );
  let delivered = false;
  const result = await processNextIntegrationEvent(
    database,
    {
      payment: {
        capability: "payment",
        provider: "sandbox-pay",
        async deliver() {
          delivered = true;
          return { provider_reference: "must-not-exist", accepted_at: "2026-11-15T10:00:00.000Z" };
        },
      },
    },
    "expiry-worker",
    new Date("2026-11-15T10:00:00.000Z"),
  );
  assert.deepEqual(result, {
    status: "dead_letter",
    event_id: "event-1",
    error_code: "event_expired",
  });
  assert.equal(delivered, false);
  assert.match(JSON.stringify(calls.updates), /event_expired/);
});

test("integration migration creates a provider-scoped outbox queue index", () => {
  const migration = readFileSync("scripts/migrate-integration-runtime.mjs", "utf8");
  assert.match(migration, /integration_outbox_provider_queue_v2/);
  assert.match(migration, /\{ capability: 1, provider: 1, status: 1, available_at: 1, created_at: 1 \}/);
  assert.match(migration, /integration_webhooks_provider_queue_v2/);
});
