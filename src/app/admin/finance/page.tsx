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
  const [commissionable, setCommissionable] = useState(true);
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
    const grossPriceCents = Math.round(
      Number(price.trim().replace(",", ".")) * 100,
    );
    if (
      !name.trim() ||
      !Number.isInteger(grossPriceCents) ||
      grossPriceCents < 0
    )
      return;
    createProduct.mutate({
      name: name.trim(),
      description: description.trim(),
      gross_price_cents: grossPriceCents,
      commissionable,
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
            <Field
              label="Ürün adı"
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
              maxLength={120}
            />
            <Field
              label="KDV dahil fiyat (TL)"
              value={price}
              onChange={(event) => setPrice(event.target.value)}
              inputMode="decimal"
              placeholder="500,00"
              required
            />
            <TextField
              label="Açıklama"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              maxLength={500}
            />
            <label className="finance-check">
              <input
                type="checkbox"
                checked={commissionable}
                onChange={(event) => setCommissionable(event.target.checked)}
              />
              <span>Partner komisyonuna dahil</span>
            </label>
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
                {product.name} · {money(product.gross_price_cents)}
              </strong>
              <small>
                {product.description || "Açıklama yok"} ·{" "}
                {product.commissionable
                  ? "Komisyona dahil"
                  : "Komisyona dahil değil"}
              </small>
            </div>
            {me.data?.role === "platform" ? (
              <button
                className="admin-button"
                disabled={updateProduct.isPending}
                onClick={() =>
                  updateProduct.mutate({
                    id: product.id,
                    changes: { active: !product.active },
                  })
                }
              >
                {product.active ? "Satıştan kaldır" : "Satışa aç"}
              </button>
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
