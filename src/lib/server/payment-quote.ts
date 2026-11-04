import "server-only";
import { randomUUID } from "node:crypto";
import type { Db, ClientSession } from "mongodb";
import type { PriceSnapshot } from "../commercial-policy";
import type { Wedding } from "../models";

export interface PaymentQuote {
  id: string;
  wedding_id: string;
  partner_id: string;
  package_code: string;
  package_version: number;
  price_snapshot: PriceSnapshot;
  gross_cents: number;
  currency: "TRY";
  status: "open" | "consumed" | "expired";
  created_at: string;
  expires_at: string;
  created_by: string;
  consumed_at?: string | null;
  consumed_by_sale_id?: string | null;
}

export async function createPaymentQuote(
  database: Db,
  wedding: Wedding,
  actorId: string,
  now = new Date(),
) {
  if (!wedding.package_code || !wedding.package_snapshot || !wedding.price_snapshot)
    throw new Error("Ödeme teklifi için dondurulmuş paket ve fiyat bilgisi gerekli.");
  const quote: PaymentQuote = {
    id: randomUUID(),
    wedding_id: wedding.id,
    partner_id: wedding.seller_partner_id || wedding.partner_id,
    package_code: wedding.package_code,
    package_version: wedding.package_snapshot.version,
    price_snapshot: structuredClone(wedding.price_snapshot),
    gross_cents: wedding.price_snapshot.gross_cents,
    currency: "TRY",
    status: "open",
    created_at: now.toISOString(),
    expires_at: new Date(now.getTime() + 30 * 60_000).toISOString(),
    created_by: actorId,
  };
  await database.collection<PaymentQuote>("payment_quotes").insertOne(quote);
  return quote;
}

export async function consumePaymentQuote(
  database: Db,
  quoteId: string,
  receivedGrossCents: number,
  saleId: string,
  session: ClientSession,
) {
  const now = new Date().toISOString();
  const quote = await database.collection<PaymentQuote>("payment_quotes").findOne(
    { id: quoteId, status: "open", expires_at: { $gt: now } },
    { session },
  );
  if (!quote) throw new Error("Ödeme teklifi bulunamadı, kullanıldı veya süresi doldu.");
  if (quote.gross_cents !== receivedGrossCents || quote.currency !== "TRY")
    throw new Error("Ödeme sağlayıcısı tutarı sunucu teklif tutarıyla eşleşmiyor.");
  const updated = await database.collection<PaymentQuote>("payment_quotes").updateOne(
    { id: quoteId, status: "open" },
    { $set: { status: "consumed", consumed_at: now, consumed_by_sale_id: saleId } },
    { session },
  );
  if (updated.modifiedCount !== 1) throw new Error("Ödeme teklifi eşzamanlı olarak kullanıldı.");
  return quote;
}
