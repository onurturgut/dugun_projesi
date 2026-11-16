import type { Db } from "mongodb";
import {
  processNextIntegrationEvent,
  type IntegrationAdapterRegistry,
} from "./integration-outbox-runtime";
import {
  processNextIntegrationWebhook,
  type IntegrationWebhookHandlerRegistry,
} from "./integration-webhook-runtime";

export const MAX_INTEGRATION_EVENTS_PER_RUN = 25;

export async function drainIntegrationQueue(
  runOne: () => Promise<{ status: string }>,
  limit = MAX_INTEGRATION_EVENTS_PER_RUN,
) {
  if (!Number.isInteger(limit) || limit < 1 || limit > MAX_INTEGRATION_EVENTS_PER_RUN)
    throw new Error(`Kuyruk çalışma sınırı 1-${MAX_INTEGRATION_EVENTS_PER_RUN} arasında olmalıdır.`);
  const counts: Record<string, number> = {};
  for (let index = 0; index < limit; index += 1) {
    const result = await runOne();
    counts[result.status] = (counts[result.status] || 0) + 1;
    if (result.status === "idle") break;
  }
  return counts;
}

export async function runIntegrationQueues(
  database: Db,
  registries: {
    outbound: IntegrationAdapterRegistry;
    webhookHandlers: IntegrationWebhookHandlerRegistry;
  },
  workerPrefix: string,
  now = new Date(),
) {
  const [outbox, webhooks] = await Promise.all([
    drainIntegrationQueue(() =>
      processNextIntegrationEvent(
        database,
        registries.outbound,
        `${workerPrefix}-outbox`,
        now,
      ),
    ),
    drainIntegrationQueue(() =>
      processNextIntegrationWebhook(
        database,
        registries.webhookHandlers,
        `${workerPrefix}-webhook`,
        now,
      ),
    ),
  ]);
  return { outbox, webhooks };
}
