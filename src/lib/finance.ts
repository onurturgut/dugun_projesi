import type { PackageCode } from "./commercial-policy";

export type CommissionPolicySnapshot = {
  policy_id: string;
  version: number;
  base_rate_bps: number;
  threshold: number;
  elevated_rate_bps: number;
  tiered: boolean;
  qualifying_package_codes: PackageCode[];
  effective_from: string;
};

export type ProfitabilityInput = {
  gross_cents: number;
  vat_rate_bps: number;
  variable_cost_cents: number;
  commission_rate_bps: number;
  payment_rate_bps: number;
  payment_fixed_cents?: number;
  target_margin_bps?: number;
};

const integer = (value: number, name: string) => {
  if (!Number.isSafeInteger(value) || value < 0)
    throw new Error(`${name} negatif olmayan güvenli bir tam sayı olmalı.`);
  return value;
};

export function netFromVatIncluded(grossCents: number, vatRateBps: number) {
  integer(grossCents, "Brüt tutar");
  integer(vatRateBps, "KDV oranı");
  return Math.round((grossCents * 10_000) / (10_000 + vatRateBps));
}

export function commissionRateForOrdinal(
  policy: CommissionPolicySnapshot,
  packageCode: PackageCode,
  ordinal: number | null,
) {
  if (!policy.qualifying_package_codes.includes(packageCode) || !policy.tiered)
    return policy.base_rate_bps;
  if (!ordinal || ordinal < 1) throw new Error("Kademeli komisyonda satış sırası gerekli.");
  return ordinal > policy.threshold
    ? policy.elevated_rate_bps
    : policy.base_rate_bps;
}

export function calculateCommissionCents(netEligibleCents: number, rateBps: number) {
  integer(netEligibleCents, "Komisyon matrahı");
  integer(rateBps, "Komisyon oranı");
  if (rateBps > 10_000) throw new Error("Komisyon oranı %100'ü aşamaz.");
  return Math.round((netEligibleCents * rateBps) / 10_000);
}

export function extraQuantity(included: number, requested: number) {
  integer(included, "Dahil adet");
  integer(requested, "İstenen adet");
  return Math.max(0, requested - included);
}

export function profitability(input: ProfitabilityInput) {
  const net = netFromVatIncluded(input.gross_cents, input.vat_rate_bps);
  const commission = calculateCommissionCents(net, input.commission_rate_bps);
  const payment =
    Math.round((input.gross_cents * input.payment_rate_bps) / 10_000) +
    (input.payment_fixed_cents || 0);
  const contribution = net - input.variable_cost_cents - commission - payment;
  return {
    net_cents: net,
    vat_cents: input.gross_cents - net,
    commission_cents: commission,
    payment_cost_cents: payment,
    contribution_cents: contribution,
    contribution_margin_bps: net > 0 ? Math.round((contribution * 10_000) / net) : 0,
  };
}

export function breakEvenGrossCents(input: Omit<ProfitabilityInput, "gross_cents">) {
  const netShare = 10_000 / (10_000 + input.vat_rate_bps);
  const contributionShare =
    netShare * (1 - input.commission_rate_bps / 10_000) -
    input.payment_rate_bps / 10_000;
  if (contributionShare <= 0)
    throw new Error("Oransal kesintiler nedeniyle başa baş fiyatı hesaplanamıyor.");
  return Math.ceil(
    (input.variable_cost_cents + (input.payment_fixed_cents || 0)) /
      contributionShare,
  );
}

export function targetMarginGrossCents(input: Omit<ProfitabilityInput, "gross_cents">) {
  const target = input.target_margin_bps || 0;
  const netShare = 10_000 / (10_000 + input.vat_rate_bps);
  const contributionShare =
    netShare * (1 - (input.commission_rate_bps + target) / 10_000) -
    input.payment_rate_bps / 10_000;
  if (contributionShare <= 0)
    throw new Error("Hedef marj ve kesintiler toplamı nedeniyle fiyat hesaplanamıyor.");
  return Math.ceil(
    (input.variable_cost_cents + (input.payment_fixed_cents || 0)) /
      contributionShare,
  );
}

export function monthlyBreakEvenUnits(fixedCents: number, weightedContributionCents: number) {
  integer(fixedCents, "Sabit gider");
  if (!Number.isSafeInteger(weightedContributionCents) || weightedContributionCents <= 0)
    return null;
  return Math.ceil(fixedCents / weightedContributionCents);
}
