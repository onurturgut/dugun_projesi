import { createHash } from "node:crypto";
import type { IntegrationOutboxEvent, PaymentIntentRecord, ProviderWebhookEvent } from "./models";

export const PAYMENT_INTENT_TRANSITIONS: Record<PaymentIntentRecord["status"], readonly PaymentIntentRecord["status"][]> = {
  created: ["requires_action", "processing", "failed", "cancelled"],
  requires_action: ["processing", "succeeded", "failed", "cancelled"],
  processing: ["succeeded", "failed", "cancelled"],
  succeeded: [],
  failed: [],
  cancelled: [],
};

export function canTransitionPaymentIntent(from: PaymentIntentRecord["status"], to: PaymentIntentRecord["status"]) {
  return PAYMENT_INTENT_TRANSITIONS[from].includes(to);
}

export function paymentWebhookDecision(
  current: PaymentIntentRecord["status"],
  incoming: PaymentIntentRecord["status"],
) {
  if (current === incoming) return { action: "duplicate" as const };
  if (canTransitionPaymentIntent(current, incoming)) return { action: "apply" as const };
  return { action: "ignore" as const, reason: "terminal_or_out_of_order" as const };
}

function assertSanitizedWebhookPayload(value: unknown, depth = 0) {
  if (depth > 8) throw new Error("Normalize webhook içeriği en fazla 8 seviye olabilir.");
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((item) => assertSanitizedWebhookPayload(item, depth + 1));
    return;
  }
  for (const [key, child] of Object.entries(value)) {
    if (/(secret|token|password|authorization|api[_-]?key|signature)/i.test(key))
      throw new Error("Normalize webhook içeriğinde gizli kimlik bilgisi saklanamaz.");
    assertSanitizedWebhookPayload(child, depth + 1);
  }
}

export function createVerifiedWebhookEvent(input: {
  id: string;
  provider: string;
  provider_event_id: string;
  capability: ProviderWebhookEvent["capability"];
  event_type: string;
  raw_payload: string;
  normalized_payload?: Record<string, unknown>;
  received_at: string;
}): ProviderWebhookEvent {
  const bounded = [input.id, input.provider, input.provider_event_id, input.event_type];
  if (bounded.some((value) => !value.trim() || value.length > 200))
    throw new Error("Webhook kimlikleri boş olamaz ve 200 karakteri aşamaz.");
  if (!input.raw_payload || Buffer.byteLength(input.raw_payload, "utf8") > 1_000_000)
    throw new Error("Webhook gövdesi boş olamaz ve 1 MB sınırını aşamaz.");
  const normalizedPayload = input.normalized_payload || {};
  assertSanitizedWebhookPayload(normalizedPayload);
  if (Buffer.byteLength(JSON.stringify(normalizedPayload), "utf8") > 64_000)
    throw new Error("Normalize webhook içeriği 64 KB sınırını aşamaz.");
  if (!Number.isFinite(Date.parse(input.received_at))) throw new Error("Geçerli webhook alınma zamanı gereklidir.");
  return {
    id: input.id,
    provider: input.provider,
    provider_event_id: input.provider_event_id,
    capability: input.capability,
    event_type: input.event_type,
    signature_verified: true,
    status: "received",
    payload_sha256: createHash("sha256").update(input.raw_payload).digest("hex"),
    normalized_payload: normalizedPayload,
    attempt_count: 0,
    max_attempts: 8,
    available_at: input.received_at,
    locked_at: null,
    locked_by: null,
    received_at: input.received_at,
    processed_at: null,
    error_code: null,
  };
}

export function retryDelayMs(attemptCount: number, baseMs = 5_000, maxMs = 60 * 60_000) {
  if (!Number.isInteger(attemptCount) || attemptCount < 1) throw new Error("attemptCount pozitif tam sayı olmalıdır.");
  return Math.min(maxMs, baseMs * 2 ** (attemptCount - 1));
}

export function nextOutboxFailure(
  event: Pick<IntegrationOutboxEvent, "attempt_count" | "max_attempts">,
  now: Date,
  errorCode: string,
): Pick<IntegrationOutboxEvent, "status" | "attempt_count" | "available_at" | "last_error_code" | "locked_at" | "locked_by" | "updated_at"> {
  const attemptCount = event.attempt_count + 1;
  const dead = attemptCount >= event.max_attempts;
  return {
    status: dead ? "dead_letter" : "retry_scheduled",
    attempt_count: attemptCount,
    available_at: dead ? now.toISOString() : new Date(now.getTime() + retryDelayMs(attemptCount)).toISOString(),
    last_error_code: errorCode.slice(0, 100),
    locked_at: null,
    locked_by: null,
    updated_at: now.toISOString(),
  };
}

export function outboxIdempotencyKey(capability: IntegrationOutboxEvent["capability"], eventType: string, aggregateId: string, version: number) {
  if (!aggregateId || !Number.isInteger(version) || version < 1) throw new Error("Geçerli aggregateId ve version gereklidir.");
  return `${capability}:${eventType}:${aggregateId}:v${version}`;
}

export function paymentIntentAmount(input: {
  gross_cents: number;
  paid_cents: number;
  payment_plan?: "full" | "deferred";
  deposit_expected_cents?: number | null;
}) {
  if (
    !Number.isInteger(input.gross_cents) ||
    !Number.isInteger(input.paid_cents) ||
    input.gross_cents <= 0 ||
    input.paid_cents < 0
  )
    throw new Error("Geçerli tam sayı kuruş tutarları gereklidir.");
  const remaining = input.gross_cents - input.paid_cents;
  if (remaining <= 0) throw new Error("Satışın ödenecek bakiyesi bulunmuyor.");
  if (input.payment_plan === "deferred" && input.paid_cents === 0) {
    const deposit = input.deposit_expected_cents;
    if (!deposit || !Number.isInteger(deposit) || deposit <= 0 || deposit > remaining)
      throw new Error("Geçerli kapora snapshot'ı bulunmuyor.");
    return deposit;
  }
  return remaining;
}
