import { z } from "zod";
import { netFromVatIncluded } from "./finance";
import type {
  BusinessCatalogItem,
  CrmQuote,
  CrmQuoteLineSnapshot,
  CrmQuoteStatus,
} from "./models";
import type { PriceSnapshot } from "./commercial-policy";

export const crmQuoteLineInput = z
  .object({
    catalog_item_id: z.string().uuid().nullable().default(null),
    name: z.string().trim().min(2).max(180),
    description: z.string().trim().max(2000).default(""),
    quantity: z.number().int().min(1).max(1000),
    unit_gross_cents: z.number().int().min(1).max(1_000_000_000),
    vat_rate_bps: z.number().int().min(0).max(10_000),
  })
  .strict();

export const crmQuoteInput = z
  .object({
    lead_id: z.string().uuid(),
    note: z.string().trim().max(4000).default(""),
    valid_until: z.string().date().nullable().default(null),
    lines: z.array(crmQuoteLineInput).min(1).max(100),
  })
  .strict();

export const crmQuoteStatusInput = z
  .object({
    status: z.enum(["sent", "viewed", "accepted", "rejected", "expired"]),
    evidence_note: z.string().trim().max(1000).default(""),
  })
  .strict()
  .superRefine((value, context) => {
    if (
      ["accepted", "rejected"].includes(value.status) &&
      value.evidence_note.length < 3
    )
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["evidence_note"],
        message: "Kabul veya red için müşteri karar kanıtı notu gerekli.",
      });
  });

export const crmQuoteConversionInput = z
  .object({
    bride_name: z.string().trim().max(100).default(""),
    groom_name: z.string().trim().max(100).default(""),
    venue: z.string().trim().max(200).default(""),
    wedding_date: z.string().date().nullable().default(null),
    payment_plan: z.enum(["full", "deferred"]),
    preferred_payment_method: z.enum(["card", "cash", "bank_transfer"]),
    payment_due_at: z.string().date().nullable().default(null),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.payment_plan === "deferred" && !value.payment_due_at)
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["payment_due_at"],
        message: "İleri tarihli ödemede son ödeme tarihi gerekli.",
      });
  });

export const quoteFinanceApprovalInput = z
  .object({
    eligible_line_ids: z.array(z.string().uuid()).max(100),
    partner_rate_bps: z.number().int().min(0).max(10_000),
    variable_cost_cents: z.number().int().min(0).max(1_000_000_000),
  })
  .strict()
  .superRefine((value, context) => {
    if (
      new Set(value.eligible_line_ids).size !== value.eligible_line_ids.length
    )
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["eligible_line_ids"],
        message: "Aynı teklif satırı birden fazla seçilemez.",
      });
  });

export function quoteFinanceSnapshot(
  quote: Pick<CrmQuote, "lines" | "net_cents">,
  input: z.infer<typeof quoteFinanceApprovalInput>,
  actorId: string,
  approvedAt: string,
) {
  const eligibleIds = new Set(input.eligible_line_ids);
  if (
    [...eligibleIds].some((id) => !quote.lines.some((line) => line.id === id))
  )
    throw new Error("Komisyona uygun satır teklif snapshot'ında bulunamadı.");
  const eligibleNetCents = quote.lines
    .filter((line) => eligibleIds.has(line.id))
    .reduce((sum, line) => sum + line.line_net_cents, 0);
  const partnerCommissionCents = Math.round(
    (eligibleNetCents * input.partner_rate_bps) / 10_000,
  );
  return {
    version: 1 as const,
    eligible_line_ids: [...eligibleIds],
    eligible_net_cents: eligibleNetCents,
    partner_rate_bps: input.partner_rate_bps,
    partner_commission_cents: partnerCommissionCents,
    platform_net_cents: quote.net_cents - partnerCommissionCents,
    variable_cost_cents: input.variable_cost_cents,
    approved_at: approvedAt,
    approved_by: actorId,
  };
}

const transitions: Record<CrmQuoteStatus, readonly CrmQuoteStatus[]> = {
  draft: ["sent"],
  sent: ["viewed", "accepted", "rejected", "expired"],
  viewed: ["accepted", "rejected", "expired"],
  accepted: [],
  rejected: [],
  expired: [],
  superseded: [],
};

export function canTransitionCrmQuote(
  from: CrmQuoteStatus,
  to: CrmQuoteStatus,
) {
  return from === to || transitions[from].includes(to);
}

export function snapshotQuoteLine(
  input: z.infer<typeof crmQuoteLineInput>,
  catalogItem?: BusinessCatalogItem | null,
): CrmQuoteLineSnapshot {
  if (input.catalog_item_id && !catalogItem)
    throw new Error("Teklif satırındaki katalog kaydı bulunamadı.");
  if (catalogItem && catalogItem.id !== input.catalog_item_id)
    throw new Error("Katalog snapshot kimliği eşleşmiyor.");
  const unitGrossCents =
    catalogItem?.price_display === "fixed" && catalogItem.gross_price_cents
      ? catalogItem.gross_price_cents
      : input.unit_gross_cents;
  const lineGrossCents = unitGrossCents * input.quantity;
  if (!Number.isSafeInteger(lineGrossCents))
    throw new Error("Teklif satırı güvenli fiyat sınırını aşıyor.");
  const lineNetCents = netFromVatIncluded(lineGrossCents, input.vat_rate_bps);
  return {
    id: crypto.randomUUID(),
    source: catalogItem ? "catalog" : "custom",
    catalog_item_id: catalogItem?.id || null,
    catalog_item_updated_at: catalogItem?.updated_at || null,
    name: catalogItem?.name || input.name,
    description: catalogItem?.description || input.description,
    quantity: input.quantity,
    unit_gross_cents: unitGrossCents,
    vat_rate_bps: input.vat_rate_bps,
    line_gross_cents: lineGrossCents,
    line_net_cents: lineNetCents,
    line_vat_cents: lineGrossCents - lineNetCents,
  };
}

export function quoteTotals(lines: CrmQuoteLineSnapshot[]) {
  return lines.reduce(
    (totals, line) => ({
      gross_cents: totals.gross_cents + line.line_gross_cents,
      net_cents: totals.net_cents + line.line_net_cents,
      vat_cents: totals.vat_cents + line.line_vat_cents,
    }),
    { gross_cents: 0, net_cents: 0, vat_cents: 0 },
  );
}

export function quotePriceSnapshot(
  quote: Pick<CrmQuote, "lines" | "gross_cents" | "net_cents" | "vat_cents">,
): PriceSnapshot {
  return {
    package_gross_cents: 0,
    add_ons: quote.lines.map((line) => ({
      product_id: line.catalog_item_id || line.id,
      quantity: line.quantity,
      name: line.name,
      unit_gross_cents: line.unit_gross_cents,
      line_gross_cents: line.line_gross_cents,
      vat_rate_bps: line.vat_rate_bps,
      line_net_cents: line.line_net_cents,
      line_vat_cents: line.line_vat_cents,
      commissionable: false,
    })),
    add_on_gross_cents: quote.gross_cents,
    gross_cents: quote.gross_cents,
    commissionable_gross_cents: 0,
    commissionable_net_cents: 0,
    net_cents: quote.net_cents,
    vat_cents: quote.vat_cents,
  };
}

export const CRM_QUOTE_STATUS_LABELS: Record<CrmQuoteStatus, string> = {
  draft: "Taslak",
  sent: "Gönderildi",
  viewed: "Görüntülendi",
  accepted: "Kabul edildi",
  rejected: "Reddedildi",
  expired: "Süresi doldu",
  superseded: "Yeni sürümle değiştirildi",
};
