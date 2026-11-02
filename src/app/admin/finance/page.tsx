"use client";

import { FormEvent, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AdminShell } from "@/components/admin/AdminShell";
import { Field, Notice, TextField } from "@/components/admin/Fields";
import { api, type Account } from "@/lib/api";
import type {
  AddOnProduct,
  PhotographerSaleRecord,
  SaleRecord,
  ServicePayoutLedgerEntry,
} from "@/lib/models";
import { accountHasPermission } from "@/lib/access-control";

const money = (cents: number) =>
  new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" }).format(
    cents / 100,
  );
const effectOptions: Record<NonNullable<AddOnProduct["effect_type"]>, Array<{ value: string; label: string }>> = {
  print_quantity: [10, 20, 30, 50].map((value) => ({ value: String(value), label: `${value} adet` })),
  welcome_sign: [{ value: "1", label: "1 adet" }],
  storage_gib: [{ value: "10", label: "+10 GB" }],
  retention_months: [3, 6, 12].map((value) => ({ value: String(value), label: `${value} ay` })),
  digital_invitation: [{ value: "1", label: "1 hizmet" }],
  custom_design: [{ value: "1", label: "1 hizmet" }],
  second_event: [{ value: "1", label: "1 organizasyon" }],
};
type SalesResponse = {
  items: Array<SaleRecord & { partner_name?: string; wedding_title?: string }>;
  totals: {
    paid_sales: number;
    gross_cents: number;
    net_cents: number;
    commission_cents: number;
    platform_cents: number;
  };
};
type PhotographerSaleView = PhotographerSaleRecord & {
  wedding_title: string;
  photographer_name: string;
  photographer_partner_name: string;
  originating_partner_name: string;
  payouts: ServicePayoutLedgerEntry[];
};
type PayoutReconciliation = {
  generated_at: string;
  ready_to_pay: { count: number; gross_cents: number };
  paid: { count: number; gross_cents: number };
  anomalies: Array<{ id: string; sale_id: string; gross_cents: number }>;
};

export default function FinancePage() {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [code, setCode] = useState("");
  const [category, setCategory] = useState<NonNullable<AddOnProduct["category"]>>("qr_print");
  const [unit, setUnit] = useState<NonNullable<AddOnProduct["unit"]>>("item");
  const [effectType, setEffectType] = useState<NonNullable<AddOnProduct["effect_type"]>>("print_quantity");
  const [effectValue, setEffectValue] = useState("10");
  const [printFormat, setPrintFormat] = useState<NonNullable<AddOnProduct["print_format"]>>("vertical_mini");
  const [pricingType, setPricingType] = useState<NonNullable<AddOnProduct["pricing_type"]>>("fixed");
  const [percentage, setPercentage] = useState("10");
  const [editPrices, setEditPrices] = useState<Record<string, string>>({});
  const [proofUploading, setProofUploading] = useState<string | null>(null);
  const [saleStatus, setSaleStatus] = useState("");
  const [payoutStatus, setPayoutStatus] = useState("");
  const [exportFrom, setExportFrom] = useState("");
  const [exportTo, setExportTo] = useState("");
  const [beneficiaryType, setBeneficiaryType] = useState("");
  const me = useQuery({
    queryKey: ["me"],
    queryFn: () => api<Account>("/auth/me"),
  });
  const sales = useQuery({
    queryKey: ["sales"],
    queryFn: () => api<SalesResponse>("/admin/sales"),
    enabled: !!me.data,
  });
  const addOns = useQuery({
    queryKey: ["add-ons"],
    queryFn: () => api<AddOnProduct[]>("/admin/add-ons"),
    enabled: !!me.data,
  });
  const photographerSales = useQuery({
    queryKey: ["photographer-sales", saleStatus, payoutStatus],
    queryFn: () => {
      const params = new URLSearchParams();
      if (saleStatus) params.set("sale_status", saleStatus);
      if (payoutStatus) params.set("payout_status", payoutStatus);
      return api<PhotographerSaleView[]>(
        `/admin/photographer-sales${params.size ? `?${params}` : ""}`,
      );
    },
    enabled: !!me.data,
  });
  const exportUrl = useMemo(() => {
    const params = new URLSearchParams();
    if (exportFrom) params.set("from", exportFrom);
    if (exportTo) params.set("to", exportTo);
    if (payoutStatus) params.set("status", payoutStatus);
    if (beneficiaryType) params.set("beneficiary_type", beneficiaryType);
    return `/api/admin/photographer-payout-export.csv${params.size ? `?${params}` : ""}`;
  }, [beneficiaryType, exportFrom, exportTo, payoutStatus]);
  const reconciliation = useQuery({
    queryKey: ["photographer-payout-reconciliation"],
    queryFn: () =>
      api<PayoutReconciliation>("/admin/photographer-payout-reconciliation"),
    enabled:
      !!me.data && accountHasPermission(me.data, "finance.view_all"),
  });
  const payoutAction = useMutation({
    mutationFn: ({
      saleId,
      payoutId,
      action,
      paymentReference,
    }: {
      saleId: string;
      payoutId: string;
      action: "approve" | "mark-paid";
      paymentReference?: string;
    }) =>
      api(`/admin/photographer-sales/${saleId}/payouts/${payoutId}/${action}`, {
        method: "POST",
        body: JSON.stringify(
          action === "mark-paid"
            ? { payment_reference: paymentReference }
            : {},
        ),
      }),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: ["photographer-sales"] }),
        queryClient.invalidateQueries({
          queryKey: ["photographer-payout-reconciliation"],
        }),
      ]),
  });
  const refundPhotographerSale = useMutation({
    mutationFn: ({ saleId, reason }: { saleId: string; reason: string }) =>
      api(`/admin/photographer-sales/${saleId}/refund`, {
        method: "POST",
        body: JSON.stringify({ reason }),
      }),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: ["photographer-sales"] }),
        queryClient.invalidateQueries({
          queryKey: ["photographer-payout-reconciliation"],
        }),
      ]),
  });
  async function uploadPaymentProof(
    saleId: string,
    payoutId: string,
    file: File,
  ) {
    setProofUploading(payoutId);
    try {
      const form = new FormData();
      form.append("file", file);
      const response = await fetch(
        `/api/admin/photographer-sales/${saleId}/payouts/${payoutId}/proof`,
        { method: "POST", body: form },
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Belge yüklenemedi.");
      await queryClient.invalidateQueries({ queryKey: ["photographer-sales"] });
    } finally {
      setProofUploading(null);
    }
  }
  async function viewPaymentProof(saleId: string, payoutId: string) {
    const result = await api<{ url: string }>(
      `/admin/photographer-sales/${saleId}/payouts/${payoutId}/proof`,
    );
    window.open(result.url, "_blank", "noopener,noreferrer");
  }
  const createProduct = useMutation({
    mutationFn: (payload: object) =>
      api<AddOnProduct>("/admin/add-ons", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      setName("");
      setDescription("");
      setPrice("");
      setCode("");
      queryClient.invalidateQueries({ queryKey: ["add-ons"] });
    },
  });
  const updateProduct = useMutation({
    mutationFn: ({ id, changes }: { id: string; changes: object }) =>
      api<AddOnProduct>(`/admin/add-ons/${id}`, {
        method: "PATCH",
        body: JSON.stringify(changes),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["add-ons"] }),
  });
  function submit(event: FormEvent) {
    event.preventDefault();
    const grossPriceCents = pricingType === "fixed" ? Math.round(Number(price.trim().replace(",", ".")) * 100) : 0;
    const percentageBps = Math.round(Number(percentage.trim().replace(",", ".")) * 100);
    const parsedEffectValue = Number(effectValue);
    if (
      !name.trim() ||
      !Number.isInteger(grossPriceCents) ||
      grossPriceCents < 0 ||
      !Number.isInteger(parsedEffectValue) || parsedEffectValue < 1 ||
      (pricingType === "package_percentage_discount" && (!Number.isInteger(percentageBps) || percentageBps < 1))
    )
      return;
    createProduct.mutate({
      code: code.trim().toUpperCase() || undefined,
      name: name.trim(),
      description: description.trim(),
      gross_price_cents: grossPriceCents,
      commissionable: true,
      category,
      unit,
      effect_type: effectType,
      effect_value: parsedEffectValue,
      print_format: effectType === "print_quantity" ? printFormat : undefined,
      pricing_type: pricingType,
      percentage_bps: pricingType === "package_percentage_discount" ? percentageBps : undefined,
      active: true,
    });
  }
  return (
    <AdminShell>
      <div className="admin-heading">
        <div>
          <p className="admin-kicker">FİNANS</p>
          <h1>Satış ve komisyonlar</h1>
          <p className="admin-subtitle">
            Müşteri fiyatları KDV dahildir; komisyon KDV hariç matrah üzerinden
            hesaplanır.
          </p>
        </div>
      </div>
      {sales.error ? <Notice>{sales.error.message}</Notice> : null}
      <section className="partner-stat-grid">
        <article>
          <span>Aktif satış</span>
          <strong>{sales.data?.totals.paid_sales || 0}</strong>
        </article>
        <article>
          <span>KDV dahil tahsilat</span>
          <strong>{money(sales.data?.totals.gross_cents || 0)}</strong>
        </article>
        <article>
          <span>KDV hariç matrah</span>
          <strong>{money(sales.data?.totals.net_cents || 0)}</strong>
        </article>
        <article>
          <span>Partner komisyonu</span>
          <strong>{money(sales.data?.totals.commission_cents || 0)}</strong>
        </article>
        <article>
          <span>ShineQR payı</span>
          <strong>{money(sales.data?.totals.platform_cents || 0)}</strong>
        </article>
      </section>
      <section className="admin-panel detail-list">
        <header>
          <div>
            <span>HAREKETLER</span>
            <h2>Satış defteri</h2>
          </div>
          {me.data && accountHasPermission(me.data, "finance.view_all") ? (
            <a
              className="admin-button"
              href={exportUrl}
              download
            >
              CSV indir
            </a>
          ) : null}
        </header>
        <div className="finance-report-filters" aria-label="Finans raporu filtreleri">
          <label>
            <span>Satış durumu</span>
            <select value={saleStatus} onChange={(event) => setSaleStatus(event.target.value)}>
              <option value="">Tümü</option>
              <option value="pending_customer_consent">Müşteri onayı bekliyor</option>
              <option value="paid">Aktif</option>
              <option value="refunded">İade</option>
            </select>
          </label>
          <label>
            <span>Hakediş durumu</span>
            <select value={payoutStatus} onChange={(event) => setPayoutStatus(event.target.value)}>
              <option value="">Tümü</option>
              <option value="pending_delivery">Teslimat bekliyor</option>
              <option value="pending_customer_approval">Müşteri onayı bekliyor</option>
              <option value="payable">Finans onayı bekliyor</option>
              <option value="approved">Ödemeye hazır</option>
              <option value="paid">Ödendi</option>
              <option value="recognized">ShineQR payı</option>
              <option value="reversed">Ters kayıt</option>
            </select>
          </label>
          <label>
            <span>Başlangıç</span>
            <input type="date" value={exportFrom} onChange={(event) => setExportFrom(event.target.value)} />
          </label>
          <label>
            <span>Bitiş</span>
            <input type="date" min={exportFrom || undefined} value={exportTo} onChange={(event) => setExportTo(event.target.value)} />
          </label>
          <label>
            <span>Lehtar</span>
            <select value={beneficiaryType} onChange={(event) => setBeneficiaryType(event.target.value)}>
              <option value="">Tümü</option>
              <option value="photographer">Fotoğrafçı</option>
              <option value="originating_partner">Kaynak işletme</option>
              <option value="platform">ShineQR</option>
            </select>
          </label>
        </div>
        {sales.data?.items.map((sale) => (
          <div className="detail-static-row" key={sale.id}>
            <div>
              <strong>
                {sale.wedding_title || sale.wedding_id} ·{" "}
                {money(sale.gross_cents)} KDV dahil
              </strong>
              <small>
                Satışı yapan: {sale.partner_name || sale.partner_id} ·{" "}
                {sale.package_code.toUpperCase()} · {sale.period}
              </small>
            </div>
            <span>
              {sale.status === "refunded"
                ? "İade"
                : `Partner ${money(sale.commission_cents)} · ShineQR ${money(sale.platform_cents)}`}
            </span>
          </div>
        ))}
        {sales.data && sales.data.items.length === 0 ? (
          <div className="admin-empty">
            <p>Henüz finans kaydı yok.</p>
          </div>
        ) : null}
      </section>
      <section className="admin-panel detail-list">
        <header>
          <div>
            <span>FOTOĞRAFÇI PAKETİ</span>
            <h2>Teslimat ve hakedişler</h2>
            <p>
              Müşteri teslimatı onayladıktan sonra hakediş finans onayına açılır.
              Ödendi kaydı gerçek transferi yapmaz; banka veya işlem referansı ister.
            </p>
          </div>
        </header>
        {photographerSales.error ? (
          <Notice>{photographerSales.error.message}</Notice>
        ) : null}
        {reconciliation.data ? (
          <div className="partner-stat-grid finance-reconciliation-grid">
            <article>
              <span>Ödemeye hazır</span>
              <strong>{money(reconciliation.data.ready_to_pay.gross_cents)}</strong>
              <small>{reconciliation.data.ready_to_pay.count} hakediş</small>
            </article>
            <article>
              <span>Ödendi kaydı</span>
              <strong>{money(reconciliation.data.paid.gross_cents)}</strong>
              <small>{reconciliation.data.paid.count} hakediş</small>
            </article>
            <article>
              <span>Eksik kanıt uyarısı</span>
              <strong>{reconciliation.data.anomalies.length}</strong>
              <small>Referans, belge veya denetim alanı eksik</small>
            </article>
          </div>
        ) : null}
        {payoutAction.error ? <Notice>{payoutAction.error.message}</Notice> : null}
        {refundPhotographerSale.error ? (
          <Notice>{refundPhotographerSale.error.message}</Notice>
        ) : null}
        {photographerSales.data?.map((sale) => (
          <article className="finance-photographer-sale" key={sale.id}>
            <div className="finance-photographer-head">
              <div>
                <strong>{sale.wedding_title}</strong>
                <small>
                  Fotoğrafçı: {sale.photographer_name} · Kaynak işletme:{" "}
                  {sale.originating_partner_name}
                </small>
              </div>
              <span>
                {sale.status === "refunded"
                  ? "İade edildi"
                  : sale.customer_approval_status === "approved"
                    ? "Müşteri onayladı"
                    : sale.customer_approval_status === "pending"
                      ? "Müşteri onayı bekleniyor"
                      : "Teslimat bekleniyor"}
              </span>
              {me.data &&
              sale.status === "paid" &&
              !sale.payouts.some((payout) => payout.status === "paid") &&
              accountHasPermission(me.data, "commission.manage") ? (
                <button
                  className="admin-button"
                  disabled={refundPhotographerSale.isPending}
                  onClick={() => {
                    const reason = window.prompt("İade gerekçesini girin:");
                    if (reason?.trim() && reason.trim().length >= 3)
                      refundPhotographerSale.mutate({
                        saleId: sale.id,
                        reason: reason.trim(),
                      });
                  }}
                >
                  Satışı iade et
                </button>
              ) : null}
            </div>
            {sale.payouts.map((payout) => (
              <div className="detail-static-row" key={payout.id}>
                <div>
                  <strong>
                    {payout.beneficiary_type === "photographer"
                      ? "Fotoğrafçı hakedişi"
                      : payout.beneficiary_type === "originating_partner"
                        ? "İşletme hakedişi"
                        : "ShineQR payı"}{" "}
                    · {money(payout.gross_cents)}
                  </strong>
                  <small>
                    Durum: {payout.status}
                    {payout.payment_reference
                      ? ` · Referans: ${payout.payment_reference}`
                      : ""}
                  </small>
                </div>
                {payout.payment_proof_id &&
                me.data &&
                accountHasPermission(me.data, "finance.view_all") ? (
                  <button
                    className="admin-button"
                    type="button"
                    onClick={() =>
                      void viewPaymentProof(sale.id, payout.id)
                    }
                  >
                    Belgeyi görüntüle
                  </button>
                ) : null}
                {me.data &&
                payout.status === "payable" &&
                accountHasPermission(me.data, "payout.approve") ? (
                  <button
                    className="admin-button"
                    disabled={payoutAction.isPending}
                    onClick={() =>
                      payoutAction.mutate({
                        saleId: sale.id,
                        payoutId: payout.id,
                        action: "approve",
                      })
                    }
                  >
                    Hakedişi onayla
                  </button>
                ) : me.data &&
                  payout.status === "approved" &&
                  accountHasPermission(me.data, "payout.mark_paid") ? (
                  payout.payment_proof_id && payout.approved_by !== me.data.id ? (
                    <button
                      className="admin-button primary"
                      disabled={payoutAction.isPending}
                      onClick={() => {
                        const reference = window.prompt(
                          "Banka / ödeme işlem referansını girin:",
                        );
                        if (reference?.trim())
                          payoutAction.mutate({
                            saleId: sale.id,
                            payoutId: payout.id,
                            action: "mark-paid",
                            paymentReference: reference.trim(),
                          });
                      }}
                    >
                      Ödendi olarak kaydet
                    </button>
                  ) : payout.approved_by === me.data.id ? (
                    <span>Ödeme kaydını farklı bir finans yetkilisi girmeli</span>
                  ) : (
                    <label className="admin-button">
                      {proofUploading === payout.id
                        ? "Belge yükleniyor…"
                        : "Ödeme belgesi yükle"}
                      <input
                        type="file"
                        hidden
                        accept="application/pdf,image/jpeg,image/png"
                        disabled={proofUploading === payout.id}
                        onChange={(event) => {
                          const file = event.target.files?.[0];
                          if (file)
                            void uploadPaymentProof(sale.id, payout.id, file);
                        }}
                      />
                    </label>
                  )
                ) : (
                  <span>{payout.status}</span>
                )}
              </div>
            ))}
          </article>
        ))}
        {photographerSales.data && !photographerSales.data.length ? (
          <div className="admin-empty">
            <p>Henüz fotoğrafçı paketi finans kaydı yok.</p>
          </div>
        ) : null}
      </section>
      <section className="admin-panel detail-list finance-add-ons">
        <header>
          <div>
            <span>DİNAMİK FİYAT</span>
            <h2>Ek ürün kataloğu</h2>
            <p>
              Fiyat KDV dahil girilir. Pasife alınan ürün yeni satışlarda
              seçilemez; eski satış kayıtları değişmez.
            </p>
          </div>
        </header>
        {addOns.error ? <Notice>{addOns.error.message}</Notice> : null}
        {me.data?.role === "platform" ? (
          <form className="finance-add-on-form" onSubmit={submit}>
            <Field label="Ürün kodu" value={code} onChange={(event) => setCode(event.target.value)} placeholder="QR-10" maxLength={40} />
            <Field
              label="Ürün adı"
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
              maxLength={120}
            />
            <label className="form-field"><span>Kategori</span><select value={category} onChange={(event) => setCategory(event.target.value as NonNullable<AddOnProduct["category"]>)}><option value="qr_print">QR ve baskı</option><option value="storage_retention">Depolama ve saklama</option><option value="digital">Dijital hizmet</option><option value="design">Tasarım</option><option value="organization">Organizasyon</option></select></label>
            <label className="form-field"><span>Hak / etki</span><select value={effectType} onChange={(event) => {
              const nextEffect = event.target.value as NonNullable<AddOnProduct["effect_type"]>;
              setEffectType(nextEffect);
              setEffectValue(effectOptions[nextEffect][0].value);
              setPricingType(nextEffect === "second_event" ? "package_percentage_discount" : "fixed");
            }}><option value="print_quantity">QR baskı adedi</option><option value="welcome_sign">Karşılama tabelası</option><option value="storage_gib">Ek depolama (GB)</option><option value="retention_months">İlave saklama (ay)</option><option value="digital_invitation">Dijital davetiye</option><option value="custom_design">Özel tasarım</option><option value="second_event">İkinci organizasyon</option></select></label>
            <label className="form-field"><span>Hak miktarı</span><select value={effectValue} onChange={(event) => setEffectValue(event.target.value)}>{effectOptions[effectType].map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
            {effectType === "print_quantity" ? <label className="form-field"><span>QR baskı tipi</span><select value={printFormat} onChange={(event) => setPrintFormat(event.target.value as NonNullable<AddOnProduct["print_format"]>)}><option value="vertical_mini">Dikey Mini QR</option></select></label> : null}
            <label className="form-field"><span>Birim</span><select value={unit} onChange={(event) => setUnit(event.target.value as NonNullable<AddOnProduct["unit"]>)}><option value="item">Adet</option><option value="gib">GB</option><option value="month">Ay</option><option value="service">Hizmet</option><option value="organization">Organizasyon</option></select></label>
            <label className="form-field"><span>Fiyat türü</span><select value={pricingType} disabled={effectType === "second_event"} onChange={(event) => setPricingType(event.target.value as NonNullable<AddOnProduct["pricing_type"]>)}><option value="fixed">Sabit KDV dahil fiyat</option>{effectType === "second_event" ? <option value="package_percentage_discount">Ana pakete yüzde indirim</option> : null}</select></label>
            {pricingType === "fixed" ? <Field label="KDV dahil fiyat (TL)" value={price} onChange={(event) => setPrice(event.target.value)} inputMode="decimal" placeholder="500,00" required /> : <Field label="İndirim oranı (%)" value={percentage} onChange={(event) => setPercentage(event.target.value)} inputMode="decimal" min={0.01} max={90} required />}
            <TextField
              label="Açıklama"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              maxLength={500}
            />
            <p className="admin-hint">Tüm ek ürünler komisyona dahildir. Komisyon, indirim sonrası KDV hariç toplam satış üzerinden hesaplanır.</p>
            <button
              className="admin-button primary"
              disabled={createProduct.isPending}
            >
              {createProduct.isPending ? "Ekleniyor…" : "Ek ürünü ekle"}
            </button>
          </form>
        ) : null}
        {createProduct.error ? (
          <Notice>{createProduct.error.message}</Notice>
        ) : null}
        {addOns.data?.map((product) => (
          <div className="detail-static-row" key={product.id}>
            <div>
              <strong>
                {product.name} · {product.pricing_type === "package_percentage_discount" ? `%${(product.percentage_bps || 0) / 100} indirim` : money(product.gross_price_cents)}
              </strong>
              <small>
                {[product.code, product.print_format === "vertical_mini" ? "Dikey Mini QR" : null, product.description || "Açıklama yok", product.effect_value ? `${product.effect_value} ${product.unit || "birim"}` : null, "Komisyona dahil"].filter(Boolean).join(" · ")}
              </small>
            </div>
            {me.data?.role === "platform" ? (
              <div className="account-actions">
                <input aria-label={`${product.name} yeni ${product.pricing_type === "package_percentage_discount" ? "indirim oranı" : "fiyatı"}`} placeholder={product.pricing_type === "package_percentage_discount" ? "Yeni indirim (%)" : "Yeni fiyat (TL)"} inputMode="decimal" value={editPrices[product.id] || ""} onChange={(event) => setEditPrices((current) => ({ ...current, [product.id]: event.target.value }))} />
                <button className="admin-button" disabled={updateProduct.isPending || !editPrices[product.id]} onClick={() => {
                  const numericValue = Number((editPrices[product.id] || "").replace(",", "."));
                  const changes = product.pricing_type === "package_percentage_discount"
                    ? { percentage_bps: Math.round(numericValue * 100) }
                    : { gross_price_cents: Math.round(numericValue * 100) };
                  const value = Object.values(changes)[0];
                  if (Number.isInteger(value) && value > 0) updateProduct.mutate({ id: product.id, changes });
                }}>{product.pricing_type === "package_percentage_discount" ? "İndirimi güncelle" : "Fiyatı güncelle"}</button>
                <button className="admin-button" disabled={updateProduct.isPending} onClick={() => updateProduct.mutate({ id: product.id, changes: { active: !product.active } })}>{product.active ? "Satıştan kaldır" : "Satışa aç"}</button>
              </div>
            ) : (
              <span>{product.active ? "Aktif" : "Pasif"}</span>
            )}
          </div>
        ))}
        {addOns.data && !addOns.data.length ? (
          <div className="admin-empty">
            <p>Henüz ek ürün tanımlanmadı.</p>
          </div>
        ) : null}
      </section>
    </AdminShell>
  );
}
