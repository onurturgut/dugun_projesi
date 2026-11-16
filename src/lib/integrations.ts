import { createHmac, timingSafeEqual } from "node:crypto";

export type IntegrationCapability =
  | "payment"
  | "banking"
  | "sms"
  | "whatsapp"
  | "email"
  | "calendar"
  | "accounting";

export type IntegrationProviderRegistry = Partial<Record<IntegrationCapability, readonly string[]>>;

export function registeredProviderRegistry(
  outbound: readonly { capability: IntegrationCapability; provider: string }[],
  webhooks: readonly { capability: IntegrationCapability; provider: string }[],
): IntegrationProviderRegistry {
  const registry: Partial<Record<IntegrationCapability, string[]>> = {};
  const webhookPairs = new Set(
    webhooks.map((adapter) => `${adapter.capability}:${adapter.provider}`),
  );
  for (const adapter of outbound) {
    if (
      ["payment", "banking"].includes(adapter.capability) &&
      !webhookPairs.has(`${adapter.capability}:${adapter.provider}`)
    )
      continue;
    registry[adapter.capability] = Array.from(
      new Set([...(registry[adapter.capability] || []), adapter.provider]),
    );
  }
  return registry;
}

export function integrationReadiness(
  env: NodeJS.ProcessEnv = process.env,
  availableProviders: IntegrationProviderRegistry = {},
) {
  const definitions: Array<{
    capability: IntegrationCapability;
    providerKey: string;
    secretKeys: string[];
  }> = [
    {
      capability: "payment",
      providerKey: "PAYMENT_PROVIDER",
      secretKeys: ["PAYMENT_API_KEY", "PAYMENT_WEBHOOK_SECRET"],
    },
    {
      capability: "banking",
      providerKey: "BANKING_PROVIDER",
      secretKeys: ["BANKING_API_KEY", "BANKING_WEBHOOK_SECRET"],
    },
    {
      capability: "sms",
      providerKey: "SMS_PROVIDER",
      secretKeys: ["SMS_API_KEY"],
    },
    {
      capability: "whatsapp",
      providerKey: "WHATSAPP_PROVIDER",
      secretKeys: ["WHATSAPP_API_KEY"],
    },
    {
      capability: "email",
      providerKey: "EMAIL_PROVIDER",
      secretKeys: ["EMAIL_API_KEY"],
    },
    {
      capability: "calendar",
      providerKey: "CALENDAR_PROVIDER",
      secretKeys: ["CALENDAR_CLIENT_ID", "CALENDAR_CLIENT_SECRET"],
    },
    {
      capability: "accounting",
      providerKey: "ACCOUNTING_PROVIDER",
      secretKeys: ["ACCOUNTING_API_KEY"],
    },
  ];
  return definitions.map((definition) => {
    const provider = env[definition.providerKey]?.trim() || null;
    const missing = definition.secretKeys.filter((key) => !env[key]?.trim());
    const adapterAvailable = Boolean(
      provider && availableProviders[definition.capability]?.includes(provider),
    );
    return {
      capability: definition.capability,
      provider,
      status:
        provider && missing.length === 0 && adapterAvailable
          ? ("ready" as const)
          : provider
            ? missing.length
              ? ("incomplete" as const)
              : ("adapter_unavailable" as const)
            : ("not_configured" as const),
      missing_configuration: provider ? missing : [],
    };
  });
}

export function verifyHmacSha256(
  payload: string,
  signature: string,
  secret: string,
) {
  if (!payload || !signature || !secret) return false;
  const expected = createHmac("sha256", secret).update(payload).digest("hex");
  const received = signature.replace(/^sha256=/, "").toLowerCase();
  if (!/^[a-f0-9]{64}$/.test(received)) return false;
  return timingSafeEqual(
    Buffer.from(expected, "hex"),
    Buffer.from(received, "hex"),
  );
}
