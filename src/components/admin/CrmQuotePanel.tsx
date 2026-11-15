"use client";

import { useState, type FormEvent } from "react";
import { FileText, Plus, Send, Trash2 } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "@/lib/api";
import {
  canTransitionCrmQuote,
  CRM_QUOTE_STATUS_LABELS,
} from "@/lib/crm-quotes";
import type { CrmQuote, CrmQuoteStatus } from "@/lib/models";

type CatalogOption = {
  id: string;
  name: string;
  description: string;
  price_display: "fixed" | "from" | "quote_only";
  gross_price_cents: number | null;
  updated_at: string;
};
type DraftLine = {
  key: string;
  catalog_item_id: string | null;
  name: string;
  description: string;
  quantity: number;
  unit_gross_cents: number;
  vat_rate_bps: number;
};
type QuoteConversion = {
  quote_id: string;
  customer_account_id: string;
  wedding_id: string;
  sale_id: string;
};

const nextStatuses: CrmQuoteStatus[] = [
  "sent",
  "viewed",
  "accepted",
  "rejected",
  "expired",
];
const money = (cents: number) =>
  new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" }).format(
    cents / 100,
  );

export function CrmQuotePanel({ leadId }: { leadId: string }) {
  const qc = useQueryClient();
  const [lines, setLines] = useState<DraftLine[]>([]);
  const [catalogId, setCatalogId] = useState("");
  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [grossLira, setGrossLira] = useState("");
  const [vatRate, setVatRate] = useState("");
  const [validUntil, setValidUntil] = useState("");
  const [note, setNote] = useState("");
  const [decisionEvidence, setDecisionEvidence] = useState("");
  const [brideName, setBrideName] = useState("");
  const [groomName, setGroomName] = useState("");
  const [venue, setVenue] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [paymentPlan, setPaymentPlan] = useState<"full" | "deferred">("full");
  const [preferredPaymentMethod, setPreferredPaymentMethod] = useState<
    "card" | "cash" | "bank_transfer"
  >("bank_transfer");
  const [paymentDueAt, setPaymentDueAt] = useState("");
  const [conversion, setConversion] = useState<QuoteConversion | null>(null);
  const [saving, setSaving] = useState(false);

  const quotes = useQuery({
    queryKey: ["crm-quotes", leadId],
    queryFn: () => api<CrmQuote[]>(`/admin/crm/quotes?lead_id=${leadId}`),
  });
  const catalog = useQuery({
    queryKey: ["crm-quote-catalog"],
    queryFn: () => api<CatalogOption[]>("/admin/crm/catalog"),
  });

  function selectCatalog(id: string) {
    setCatalogId(id);
    const item = catalog.data?.find((entry) => entry.id === id);
    if (!item) return;
    setName(item.name);
    setGrossLira(
      item.gross_price_cents ? String(item.gross_price_cents / 100) : "",
    );
  }

  function addLine() {
    const unitGrossCents = Math.round(
      Number(grossLira.replace(",", ".")) * 100,
    );
    const vatRateBps = Math.round(Number(vatRate.replace(",", ".")) * 100);
    if (
      !name.trim() ||
      !Number.isInteger(unitGrossCents) ||
      unitGrossCents < 1
    ) {
      toast.error("Satır adı ve KDV dâhil birim fiyatı gerekli.");
      return;
    }
    if (
      !Number.isInteger(vatRateBps) ||
      vatRateBps < 0 ||
      vatRateBps > 10_000
    ) {
      toast.error("KDV oranı 0 ile 100 arasında olmalı.");
      return;
    }
    setLines((current) => [
      ...current,
      {
        key: crypto.randomUUID(),
        catalog_item_id: catalogId || null,
        name: name.trim(),
        description: "",
        quantity,
        unit_gross_cents: unitGrossCents,
        vat_rate_bps: vatRateBps,
      },
    ]);
    setCatalogId("");
    setName("");
    setQuantity(1);
    setGrossLira("");
  }

  async function createQuote(event: FormEvent) {
    event.preventDefault();
    if (!lines.length) {
      toast.error("Teklife en az bir satır ekleyin.");
      return;
    }
    setSaving(true);
    try {
      await api("/admin/crm/quotes", {
        method: "POST",
        body: JSON.stringify({
          lead_id: leadId,
          lines: lines.map(({ key: _key, ...line }) => line),
          valid_until: validUntil || null,
          note,
        }),
      });
      setLines([]);
      setValidUntil("");
      setNote("");
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["crm-quotes", leadId] }),
        qc.invalidateQueries({ queryKey: ["crm-activities", leadId] }),
      ]);
      toast.success("Yeni teklif sürümü oluşturuldu.");
    } catch (cause) {
      toast.error(
        cause instanceof Error ? cause.message : "Teklif oluşturulamadı.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function updateStatus(quote: CrmQuote, status: CrmQuoteStatus) {
    try {
      await api(`/admin/crm/quotes/${quote.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          status,
          evidence_note:
            status === "accepted" || status === "rejected"
              ? decisionEvidence
              : "",
        }),
      });
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["crm-quotes", leadId] }),
        qc.invalidateQueries({ queryKey: ["crm-activities", leadId] }),
      ]);
      toast.success("Teklif durumu güncellendi.");
      if (status === "accepted" || status === "rejected")
        setDecisionEvidence("");
    } catch (cause) {
      toast.error(
        cause instanceof Error ? cause.message : "Teklif güncellenemedi.",
      );
    }
  }

  async function convertQuote(quote: CrmQuote) {
    setSaving(true);
    try {
      const result = await api<QuoteConversion>(
        `/admin/crm/quotes/${quote.id}/convert`,
        {
          method: "POST",
          body: JSON.stringify({
            bride_name: brideName,
            groom_name: groomName,
            venue,
            wedding_date: eventDate || null,
            payment_plan: paymentPlan,
            preferred_payment_method: preferredPaymentMethod,
            payment_due_at: paymentDueAt || null,
          }),
        },
      );
      setConversion(result);
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["crm-activities", leadId] }),
        qc.invalidateQueries({ queryKey: ["crm-leads"] }),
      ]);
      toast.success("Teklif organizasyon ve satış taslağına dönüştürüldü.");
    } catch (cause) {
      toast.error(
        cause instanceof Error ? cause.message : "Teklif dönüştürülemedi.",
      );
    } finally {
      setSaving(false);
    }
  }

  const accepted = quotes.data?.some((quote) => quote.status === "accepted");

  return (
    <section className="crm-quote-panel">
      <h4>
        <FileText size={15} /> Versiyonlu teklifler
      </h4>
      {!accepted ? (
        <form className="crm-compact-form" onSubmit={createQuote}>
          <select
            aria-label="Katalog ürünü"
            value={catalogId}
            onChange={(event) => selectCatalog(event.target.value)}
          >
            <option value="">Özel teklif satırı</option>
            {catalog.data?.map((item) => (
              <option value={item.id} key={item.id}>
                {item.name}
              </option>
            ))}
          </select>
          <input
            aria-label="Teklif satırı adı"
            placeholder="Ürün veya hizmet adı"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
          <div className="crm-form-row">
            <input
              aria-label="Adet"
              type="number"
              min={1}
              max={1000}
              value={quantity}
              onChange={(event) => setQuantity(Number(event.target.value))}
            />
            <input
              aria-label="KDV dahil birim fiyat"
              inputMode="decimal"
              placeholder="KDV dâhil fiyat (₺)"
              value={grossLira}
              onChange={(event) => setGrossLira(event.target.value)}
            />
          </div>
          <div className="crm-form-row">
            <input
              aria-label="KDV oranı"
              inputMode="decimal"
              placeholder="KDV %"
              value={vatRate}
              onChange={(event) => setVatRate(event.target.value)}
            />
            <button type="button" onClick={addLine}>
              <Plus size={15} /> Satır ekle
            </button>
          </div>
          <div className="crm-quote-draft-lines">
            {lines.map((line) => (
              <div key={line.key}>
                <span>
                  {line.quantity} × {line.name}
                </span>
                <strong>{money(line.unit_gross_cents * line.quantity)}</strong>
                <button
                  type="button"
                  aria-label={`${line.name} satırını kaldır`}
                  onClick={() =>
                    setLines((current) =>
                      current.filter((item) => item.key !== line.key),
                    )
                  }
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
          <input
            aria-label="Teklif geçerlilik tarihi"
            type="date"
            value={validUntil}
            onChange={(event) => setValidUntil(event.target.value)}
          />
          <textarea
            aria-label="Teklif notu"
            placeholder="Müşteriye iletilecek teklif notu"
            maxLength={4000}
            value={note}
            onChange={(event) => setNote(event.target.value)}
          />
          <button type="submit" disabled={saving || !lines.length}>
            <FileText size={15} />{" "}
            {quotes.data?.length
              ? "Yeni sürüm oluştur"
              : "Teklif taslağı oluştur"}
          </button>
        </form>
      ) : (
        <p className="crm-inline-state">
          Kabul edilmiş teklif tarihsel kayıt olarak kilitlendi.
        </p>
      )}
      {quotes.isLoading ? (
        <p className="crm-inline-state">Teklifler yükleniyor…</p>
      ) : null}
      {quotes.error ? (
        <p className="crm-inline-error">{quotes.error.message}</p>
      ) : null}
      <div className="crm-quote-history">
        {quotes.data?.map((quote) => (
          <article key={quote.id}>
            <div>
              <strong>Teklif v{quote.version}</strong>
              <span>{CRM_QUOTE_STATUS_LABELS[quote.status]}</span>
            </div>
            <b>
              {money(quote.gross_cents)} <small>KDV dâhil</small>
            </b>
            <ul>
              {quote.lines.map((line) => (
                <li key={line.id}>
                  {line.quantity} × {line.name} — {money(line.line_gross_cents)}
                </li>
              ))}
            </ul>
            {["sent", "viewed"].includes(quote.status) ? (
              <textarea
                aria-label={`Teklif v${quote.version} müşteri karar kanıtı`}
                placeholder="Kabul/red için görüşme, e-posta veya mesaj kanıtı notu"
                maxLength={1000}
                value={decisionEvidence}
                onChange={(event) => setDecisionEvidence(event.target.value)}
              />
            ) : null}
            {nextStatuses.some((status) =>
              canTransitionCrmQuote(quote.status, status),
            ) ? (
              <select
                aria-label={`Teklif v${quote.version} durumu`}
                value={quote.status}
                onChange={(event) =>
                  updateStatus(quote, event.target.value as CrmQuoteStatus)
                }
              >
                <option value={quote.status}>
                  {CRM_QUOTE_STATUS_LABELS[quote.status]}
                </option>
                {nextStatuses
                  .filter(
                    (status) =>
                      canTransitionCrmQuote(quote.status, status) &&
                      status !== quote.status,
                  )
                  .map((status) => (
                    <option value={status} key={status}>
                      {status === "sent"
                        ? "Gönderildi olarak işaretle"
                        : CRM_QUOTE_STATUS_LABELS[status]}
                    </option>
                  ))}
              </select>
            ) : null}
            {quote.status === "draft" ? (
              <small className="crm-quote-hint">
                <Send size={13} /> Gönderim entegrasyonu bağlanana kadar durum
                elle ilerletilir.
              </small>
            ) : null}
            {quote.status === "accepted" ? (
              <div className="crm-quote-conversion">
                <strong>Organizasyon ve satış taslağı</strong>
                <div className="crm-form-row">
                  <input
                    aria-label="Gelin adı"
                    placeholder="Gelin adı"
                    value={brideName}
                    onChange={(event) => setBrideName(event.target.value)}
                  />
                  <input
                    aria-label="Damat adı"
                    placeholder="Damat adı"
                    value={groomName}
                    onChange={(event) => setGroomName(event.target.value)}
                  />
                </div>
                <input
                  aria-label="Organizasyon mekânı"
                  placeholder="Mekân (isteğe bağlı)"
                  value={venue}
                  onChange={(event) => setVenue(event.target.value)}
                />
                <input
                  aria-label="Organizasyon tarihi"
                  type="date"
                  value={eventDate}
                  onChange={(event) => setEventDate(event.target.value)}
                />
                <div className="crm-form-row">
                  <select
                    aria-label="Ödeme planı"
                    value={paymentPlan}
                    onChange={(event) =>
                      setPaymentPlan(event.target.value as typeof paymentPlan)
                    }
                  >
                    <option value="full">Tam ödeme</option>
                    <option value="deferred">İleri tarihli — %20 kapora</option>
                  </select>
                  <select
                    aria-label="Tercih edilen ödeme yöntemi"
                    value={preferredPaymentMethod}
                    onChange={(event) =>
                      setPreferredPaymentMethod(
                        event.target.value as typeof preferredPaymentMethod,
                      )
                    }
                  >
                    <option value="bank_transfer">Havale / EFT</option>
                    <option value="cash">Nakit</option>
                    <option value="card">Kredi kartı</option>
                  </select>
                </div>
                {paymentPlan === "deferred" ? (
                  <input
                    required
                    aria-label="Son ödeme tarihi"
                    type="date"
                    value={paymentDueAt}
                    onChange={(event) => setPaymentDueAt(event.target.value)}
                  />
                ) : null}
                {conversion?.quote_id === quote.id ? (
                  <a
                    className="crm-conversion-link"
                    href={`/admin/${conversion.wedding_id}`}
                  >
                    Organizasyon taslağını aç
                  </a>
                ) : (
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => convertQuote(quote)}
                  >
                    Taslaklara dönüştür
                  </button>
                )}
                <small>
                  Tahsilat ve hakediş oluşturulmaz. Finans eşleştirmesi ayrıca
                  onaylanır.
                </small>
              </div>
            ) : null}
          </article>
        ))}
      </div>
    </section>
  );
}
