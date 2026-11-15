import { z } from "zod";
import type { BusinessCatalogItem } from "./models";

const catalogImage = z
  .string()
  .trim()
  .max(2048)
  .refine(
    (value) =>
      value === "" ||
      /^\/covers\/[a-zA-Z0-9._-]+$/.test(value) ||
      /^\/api\/covers\/[0-9a-f-]{36}$/.test(value) ||
      /^https:\/\//.test(value),
    "Görsel güvenli bir HTTPS veya ShineQR medya adresi olmalı.",
  );

export const businessCatalogItemInput = z
  .object({
    kind: z.enum(["product", "service", "package"]),
    name: z.string().trim().min(2).max(160),
    description: z.string().trim().min(10).max(1200),
    category: z.string().trim().min(2).max(100),
    image_url: catalogImage.default(""),
    price_display: z.enum(["fixed", "from", "quote_only"]),
    gross_price_cents: z.number().int().min(0).max(1_000_000_000).nullable(),
    unit_label: z.string().trim().max(40).default(""),
    active: z.boolean().default(false),
    display_order: z.number().int().min(0).max(10_000).default(0),
  })
  .strict()
  .superRefine((value, context) => {
    if (
      value.price_display === "quote_only" &&
      value.gross_price_cents !== null
    )
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["gross_price_cents"],
        message: "Teklif al seçeneğinde fiyat kaydedilemez.",
      });
    if (
      value.price_display !== "quote_only" &&
      (!value.gross_price_cents || value.gross_price_cents < 1)
    )
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["gross_price_cents"],
        message: "Fiyat gösterilen kayıtlarda pozitif tutar gereklidir.",
      });
  });

export type PublicCatalogItem = Pick<
  BusinessCatalogItem,
  | "id"
  | "kind"
  | "name"
  | "description"
  | "category"
  | "image_url"
  | "price_display"
  | "gross_price_cents"
  | "currency"
  | "unit_label"
  | "display_order"
>;

export function publicCatalogItem(
  item: BusinessCatalogItem,
): PublicCatalogItem | null {
  if (!item.active) return null;
  return {
    id: item.id,
    kind: item.kind,
    name: item.name,
    description: item.description,
    category: item.category,
    image_url: item.image_url,
    price_display: item.price_display,
    gross_price_cents: item.gross_price_cents,
    currency: item.currency,
    unit_label: item.unit_label,
    display_order: item.display_order,
  };
}
