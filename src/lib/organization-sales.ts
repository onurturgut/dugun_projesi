import type { Account } from "./models";

export const ORGANIZATION_DEPOSIT_RATE_BPS = 2_000;

export function organizationSellerPartnerId(
  user: Pick<Account, "role" | "partner_id">,
  requestedPartnerId?: string | null,
) {
  if (user.role === "partner") {
    if (!user.partner_id)
      throw new Error("Partner hesabı bir işletmeye bağlı olmalı.");
    return user.partner_id;
  }
  return requestedPartnerId || "platform";
}

export function organizationDepositCents(grossCents: number) {
  return Math.round((grossCents * ORGANIZATION_DEPOSIT_RATE_BPS) / 10_000);
}
