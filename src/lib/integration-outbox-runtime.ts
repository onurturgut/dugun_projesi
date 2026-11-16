import type { Db, Filter } from "mongodb";
import type { IntegrationOutboxEvent } from "./models";
import { nextOutboxFailure } from "./integration-events";

export type IntegrationDeliveryReceipt = { provider_reference: string; accepted_at: string };
export interface IntegrationAdapter {
  capability: IntegrationOutboxEvent["capability"];
  provider: string;
  deliver(event: Readonly<IntegrationOutboxEvent>): Promise<IntegrationDeliveryReceipt>;
}
export type IntegrationAdapterRegistry = Partial<Record<IntegrationOutboxEvent["capability"], IntegrationAdapter>>;

function safeErrorCode(error: unknown) {
  if (error && typeof error === "object" && "code" in error) {
    const code = String((error as { code?: unknown }).code || "provider_error");
    return code.replace(/[^a-zA-Z0-9_.-]/g, "_").slice(0, 100);
  }
  return "provider_error";
}

function validReceipt(receipt: IntegrationDeliveryReceipt) {
  if (!receipt.provider_reference.trim() || receipt.provider_reference.length > 200 || !Number.isFinite(Date.parse(receipt.accepted_at))) {
    const error = new Error("Sağlayıcı geçerli teslimat makbuzu döndürmedi.") as Error & { code?: string };
    error.code = "invalid_provider_receipt";
    throw error;
  }
  return receipt;
}

export async function processNextIntegrationEvent(
  database: Db,
  adapters: IntegrationAdapterRegistry,
  workerId: string,
  now = new Date(),
  leaseMs = 5 * 60_000,
) {
  if (!workerId.trim() || workerId.length > 120) throw new Error("Geçerli worker kimliği gereklidir.");
  if (!Number.isInteger(leaseMs) || leaseMs < 30_000) throw new Error("Integration worker lease süresi en az 30 saniye olmalıdır.");
  const configured = Object.values(adapters).filter((adapter): adapter is IntegrationAdapter => Boolean(adapter));
  if (!configured.length) return { status: "idle" as const, reason: "no_adapters" as const };

  const nowIso = now.toISOString();
  const leaseCutoff = new Date(now.getTime() - leaseMs).toISOString();
  const claimFilter: Filter<IntegrationOutboxEvent> = {
    $and: [
      { $or: configured.map((adapter) => ({ capability: adapter.capability, provider: adapter.provider })) },
      { $or: [
        { status: { $in: ["pending", "retry_scheduled"] }, available_at: { $lte: nowIso }, $or: [{ locked_at: null }, { locked_at: { $exists: false } }] },
        { status: "processing", locked_at: { $lte: leaseCutoff } },
      ] },
    ],
  };
  const collection = database.collection<IntegrationOutboxEvent>("integration_outbox");
  const claimed = await collection.findOneAndUpdate(
    claimFilter,
    { $set: { status: "processing", locked_at: nowIso, locked_by: workerId, updated_at: nowIso } },
    { sort: { available_at: 1, created_at: 1 }, returnDocument: "after" },
  );
  if (!claimed) return { status: "idle" as const, reason: "empty_queue" as const };
  if (
    claimed.expires_at &&
    (!Number.isFinite(Date.parse(claimed.expires_at)) ||
      Date.parse(claimed.expires_at) <= now.getTime())
  ) {
    const result = await collection.updateOne(
      { id: claimed.id, status: "processing", locked_by: workerId },
      {
        $set: {
          status: "dead_letter",
          available_at: nowIso,
          updated_at: nowIso,
          last_error_code: "event_expired",
          locked_at: null,
          locked_by: null,
        },
      },
    );
    return result.modifiedCount
      ? { status: "dead_letter" as const, event_id: claimed.id, error_code: "event_expired" as const }
      : { status: "lease_lost" as const, event_id: claimed.id };
  }
  const adapter = adapters[claimed.capability];
  if (!adapter || adapter.provider !== claimed.provider) {
    const failure = nextOutboxFailure(claimed, now, "adapter_provider_mismatch");
    const result = await collection.updateOne({ id: claimed.id, status: "processing", locked_by: workerId }, { $set: failure });
    if (!result.modifiedCount) return { status: "lease_lost" as const, event_id: claimed.id };
    return { status: failure.status, event_id: claimed.id, error_code: failure.last_error_code };
  }
  try {
    const receipt = validReceipt(await adapter.deliver(Object.freeze({ ...claimed })));
    const deliveredAt = now.toISOString();
    const result = await collection.updateOne(
      { id: claimed.id, status: "processing", locked_by: workerId },
      { $set: { status: "delivered", delivered_at: deliveredAt, updated_at: deliveredAt, provider_reference: receipt.provider_reference, provider_accepted_at: receipt.accepted_at, locked_at: null, locked_by: null, last_error_code: null } },
    );
    if (!result.modifiedCount) return { status: "lease_lost" as const, event_id: claimed.id };
    return { status: "delivered" as const, event_id: claimed.id };
  } catch (error) {
    const failure = nextOutboxFailure(claimed, now, safeErrorCode(error));
    const result = await collection.updateOne({ id: claimed.id, status: "processing", locked_by: workerId }, { $set: failure });
    if (!result.modifiedCount) return { status: "lease_lost" as const, event_id: claimed.id };
    return { status: failure.status, event_id: claimed.id, error_code: failure.last_error_code };
  }
}
