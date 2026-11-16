import "server-only";
import {
  registeredProviderRegistry,
  type IntegrationProviderRegistry,
} from "@/lib/integrations";
import type { IntegrationAdapterRegistry } from "@/lib/integration-outbox-runtime";
import type {
  IntegrationWebhookAdapter,
  IntegrationWebhookHandlerRegistry,
} from "@/lib/integration-webhook-runtime";

// Provider modules are registered here only after their contracts and sandbox
// credentials are approved. An empty registry deliberately keeps all external
// actions closed even when environment variables were set accidentally.
export const integrationOutboundAdapters: IntegrationAdapterRegistry = {};
export const integrationWebhookAdapters: Partial<
  Record<string, IntegrationWebhookAdapter>
> = {};
export const integrationWebhookHandlers: IntegrationWebhookHandlerRegistry = {};

export function webhookAdapterFor(capability: string, provider: string) {
  const adapter = integrationWebhookAdapters[`${capability}:${provider}`];
  return adapter?.capability === capability && adapter.provider === provider
    ? adapter
    : null;
}

export function availableIntegrationProviders(): IntegrationProviderRegistry {
  return registeredProviderRegistry(
    Object.values(integrationOutboundAdapters).filter(
      (adapter): adapter is NonNullable<typeof adapter> => Boolean(adapter),
    ),
    Object.values(integrationWebhookAdapters).filter(
      (adapter): adapter is IntegrationWebhookAdapter => Boolean(adapter),
    ),
  );
}
