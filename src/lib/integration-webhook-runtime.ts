import { randomUUID } from "node:crypto";
import type { Db, Filter } from "mongodb";
import { createVerifiedWebhookEvent, retryDelayMs } from "./integration-events";
import type { ProviderWebhookEvent } from "./models";

export type NormalizedWebhookEnvelope = {
  provider_event_id: string;
  event_type: string;
  data?: Record<string, unknown>;
};

export interface IntegrationWebhookAdapter {
  capability: ProviderWebhookEvent["capability"];
  provider: string;
  verify(rawPayload: string, headers: Readonly<Record<string, string>>): boolean | Promise<boolean>;
  normalize(rawPayload: string): NormalizedWebhookEnvelope | Promise<NormalizedWebhookEnvelope>;
}

function isDuplicateKey(error: unknown) {
  return Boolean(error && typeof error === "object" && "code" in error && (error as { code?: unknown }).code === 11000);
}

export async function ingestIntegrationWebhook(
  database: Db,
  adapter: IntegrationWebhookAdapter,
  input: { raw_payload: string; headers: Readonly<Record<string, string>> },
  now = new Date(),
  idFactory: () => string = randomUUID,
) {
  if (!adapter.provider.trim() || adapter.provider.length > 200) throw new Error("Geçerli webhook sağlayıcısı gereklidir.");
  if (!(await adapter.verify(input.raw_payload, input.headers))) return { status: "rejected" as const, reason: "invalid_signature" as const };
  const normalized = await adapter.normalize(input.raw_payload);
  const event = createVerifiedWebhookEvent({
    id: idFactory(),
    provider: adapter.provider,
    provider_event_id: normalized.provider_event_id,
    capability: adapter.capability,
    event_type: normalized.event_type,
    raw_payload: input.raw_payload,
    normalized_payload: normalized.data,
    received_at: now.toISOString(),
  });
  try {
    await database.collection<ProviderWebhookEvent>("integration_webhook_events").insertOne(event);
    return { status: "accepted" as const, event_id: event.id };
  } catch (error) {
    if (isDuplicateKey(error)) return { status: "duplicate" as const, provider_event_id: event.provider_event_id };
    throw error;
  }
}

export interface IntegrationWebhookHandler {
  capability: ProviderWebhookEvent["capability"];
  provider: string;
  handle(event: Readonly<ProviderWebhookEvent>): Promise<{ outcome: "processed" | "ignored"; reason?: string }>;
}

export type IntegrationWebhookHandlerRegistry = Partial<Record<ProviderWebhookEvent["capability"], IntegrationWebhookHandler>>;

function webhookFailure(event: ProviderWebhookEvent, now: Date, error: unknown) {
  const attemptCount = event.attempt_count + 1;
  const dead = attemptCount >= event.max_attempts;
  const code = error && typeof error === "object" && "code" in error
    ? String((error as { code?: unknown }).code || "webhook_handler_error")
    : "webhook_handler_error";
  return {
    status: dead ? ("dead_letter" as const) : ("retry_scheduled" as const),
    attempt_count: attemptCount,
    available_at: dead ? now.toISOString() : new Date(now.getTime() + retryDelayMs(attemptCount)).toISOString(),
    error_code: code.replace(/[^a-zA-Z0-9_.-]/g, "_").slice(0, 100),
    locked_at: null,
    locked_by: null,
  };
}

export async function processNextIntegrationWebhook(
  database: Db,
  handlers: IntegrationWebhookHandlerRegistry,
  workerId: string,
  now = new Date(),
  leaseMs = 5 * 60_000,
) {
  if (!workerId.trim() || workerId.length > 120) throw new Error("Geçerli webhook worker kimliği gereklidir.");
  if (!Number.isInteger(leaseMs) || leaseMs < 30_000) throw new Error("Webhook worker lease süresi en az 30 saniye olmalıdır.");
  const configured = Object.values(handlers).filter((handler): handler is IntegrationWebhookHandler => Boolean(handler));
  if (!configured.length) return { status: "idle" as const, reason: "no_handlers" as const };
  const nowIso = now.toISOString();
  const leaseCutoff = new Date(now.getTime() - leaseMs).toISOString();
  const claimFilter: Filter<ProviderWebhookEvent> = {
    $and: [
      { $or: configured.map((handler) => ({ capability: handler.capability, provider: handler.provider })) },
      { $or: [
        { status: { $in: ["received", "retry_scheduled"] }, available_at: { $lte: nowIso }, $or: [{ locked_at: null }, { locked_at: { $exists: false } }] },
        { status: "processing", locked_at: { $lte: leaseCutoff } },
      ] },
    ],
  };
  const collection = database.collection<ProviderWebhookEvent>("integration_webhook_events");
  const claimed = await collection.findOneAndUpdate(
    claimFilter,
    { $set: { status: "processing", locked_at: nowIso, locked_by: workerId } },
    { sort: { available_at: 1, received_at: 1 }, returnDocument: "after" },
  );
  if (!claimed) return { status: "idle" as const, reason: "empty_queue" as const };
  const handler = handlers[claimed.capability];
  if (!handler || handler.provider !== claimed.provider) {
    const failure = webhookFailure(claimed, now, { code: "webhook_handler_mismatch" });
    const result = await collection.updateOne({ id: claimed.id, status: "processing", locked_by: workerId }, { $set: failure });
    return result.modifiedCount ? { status: failure.status, event_id: claimed.id } : { status: "lease_lost" as const, event_id: claimed.id };
  }
  try {
    const handled = await handler.handle(Object.freeze({ ...claimed, normalized_payload: Object.freeze({ ...claimed.normalized_payload }) }));
    const finalStatus = handled.outcome;
    const result = await collection.updateOne(
      { id: claimed.id, status: "processing", locked_by: workerId },
      { $set: { status: finalStatus, processed_at: nowIso, error_code: handled.reason?.slice(0, 100) || null, locked_at: null, locked_by: null } },
    );
    return result.modifiedCount ? { status: finalStatus, event_id: claimed.id } : { status: "lease_lost" as const, event_id: claimed.id };
  } catch (error) {
    const failure = webhookFailure(claimed, now, error);
    const result = await collection.updateOne({ id: claimed.id, status: "processing", locked_by: workerId }, { $set: failure });
    return result.modifiedCount ? { status: failure.status, event_id: claimed.id } : { status: "lease_lost" as const, event_id: claimed.id };
  }
}
