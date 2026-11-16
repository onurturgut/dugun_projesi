import "server-only";
import { randomUUID } from "node:crypto";
import type { Db } from "mongodb";
import { runIntegrationQueues } from "@/lib/integration-runner-runtime";
import {
  integrationOutboundAdapters,
  integrationWebhookHandlers,
} from "./integration-registry";

export async function drainIntegrationQueues(database: Db, now = new Date()) {
  const runId = randomUUID();
  try {
    const { outbox, webhooks } = await runIntegrationQueues(
      database,
      {
        outbound: integrationOutboundAdapters,
        webhookHandlers: integrationWebhookHandlers,
      },
      `cron-${runId}`,
      now,
    );
    return { outbox, webhooks, errors: [] as string[] };
  } catch (error) {
    return {
      outbox: {},
      webhooks: {},
      errors: [error instanceof Error ? error.message.slice(0, 200) : "integration_runner_error"],
    };
  }
}
