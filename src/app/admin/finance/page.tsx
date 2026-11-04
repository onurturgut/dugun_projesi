"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  Banknote,
  Building2,
  CheckCircle2,
  Clock3,
  Download,
  Landmark,
  ReceiptText,
  RotateCcw,
  Search,
  WalletCards,
} from "lucide-react";
import { AdminShell } from "@/components/admin/AdminShell";
import { Notice } from "@/components/admin/Fields";
import { api, type Account } from "@/lib/api";
import type {
  PhotographerSaleRecord,
  SaleRecord,
  ServicePayoutLedgerEntry,
} from "@/lib/models";
import { accountHasPermission } from "@/lib/access-control";

const money = (cents: number) =>
  new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" }).format(
    cents / 100,
  );
const dateTime = (value: string) =>
  new Date(value).toLocaleString("tr-TR", {
    timeZone: "Europe/Istanbul",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
const saleStatusText = (status: SaleRecord["status"]) =>
  status === "refunded" ? "İade edildi" : "Tahsil edildi";
const payoutStatusText: Record<ServicePayoutLedgerEntry["status"], string> = {
  pending_delivery: "Teslimat bekliyor",
  pending_customer_approval: "Müşteri onayı bekliyor",
  payable: "Finans onayı bekliyor",
  approved: "Ödemeye hazır",
  paid: "Ödendi",
  recognized: "Muhasebeleşti",
  reversed: "Ters kayıt",
};
const payoutStatusTone = (status: ServicePayoutLedgerEntry["status"]) =>
  status === "paid" || status === "recognized"
    ? "success"
    : status === "reversed"
      ? "danger"
      : status === "approved" || status === "payable"
        ? "warning"
        : "neutral";
const beneficiaryText: Record<ServicePayoutLedgerEntry["beneficiary_type"], string> = {
  photographer: "Fotoğrafçı hakedişi",
  originating_partner: "İşletme hakedişi",
  platform: "ShineQR payı",
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
  const [proofUploading, setProofUploading] = useState<string | null>(null);
  const [ledgerSearch, setLedgerSearch] = useState("");
  const [ledgerStatus, setLedgerStatus] = useState("");
  const [photographerSaleStatus, setPhotographerSaleStatus] = useState("");
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
  const photographerSales = useQuery({
    queryKey: ["photographer-sales", photographerSaleStatus, payoutStatus],
    queryFn: () => {
      const params = new URLSearchParams();
      if (photographerSaleStatus) params.set("sale_status", photographerSaleStatus);
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
  const filteredSales = useMemo(() => {
    const query = ledgerSearch.trim().toLocaleLowerCase("tr-TR");
    return (sales.data?.items || []).filter((sale) => {
      if (ledgerStatus && sale.status !== ledgerStatus) return false;
      if (!query) return true;
      return [sale.wedding_title, sale.wedding_id, sale.partner_name, sale.partner_id, sale.package_code]
        .filter(Boolean)
        .some((value) => String(value).toLocaleLowerCase("tr-TR").includes(query));
    });
  }, [ledgerSearch, ledgerStatus, sales.data?.items]);
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
  return (
    <AdminShell>
      <div className="admin-heading finance-ledger-heading">
        <div>
          <p className="admin-kicker">FİNANS OPERASYONLARI</p>
          <h1>Satış defteri ve hakediş</h1>
          <p className="admin-subtitle">
            Tahsilatları, partner dağılımlarını ve fotoğrafçı ödemelerini tek ekrandan izleyin.
          </p>
        </div>
        <div className="finance-ledger-context"><Clock3 size={16} aria-hidden="true" /><span>Europe/Istanbul</span></div>
      </div>
      {sales.error ? <Notice>{sales.error.message}</Notice> : null}
      <section className="partner-stat-grid finance-ledger-kpis" aria-label="Satış özeti">
        <article>
          <ReceiptText size={20} aria-hidden="true" />
          <span>Aktif satış</span>
          <strong>{sales.data?.totals.paid_sales || 0}</strong>
          <small>Tahsil edilmiş satış adedi</small>
        </article>
        <article>
          <Banknote size={20} aria-hidden="true" />
          <span>KDV dahil tahsilat</span>
          <strong>{money(sales.data?.totals.gross_cents || 0)}</strong>
          <small>Müşteriden alınan toplam</small>
        </article>
        <article>
          <Landmark size={20} aria-hidden="true" />
          <span>KDV hariç matrah</span>
          <strong>{money(sales.data?.totals.net_cents || 0)}</strong>
          <small>Komisyona esas net tutar</small>
        </article>
        <article>
          <Building2 size={20} aria-hidden="true" />
          <span>Partner komisyonu</span>
          <strong>{money(sales.data?.totals.commission_cents || 0)}</strong>
          <small>İşletmelere ayrılan pay</small>
        </article>
        <article>
          <WalletCards size={20} aria-hidden="true" />
          <span>ShineQR payı</span>
          <strong>{money(sales.data?.totals.platform_cents || 0)}</strong>
          <small>KDV ve komisyon sonrası</small>
        </article>
      </section>
      <section className="admin-panel detail-list finance-ledger-section">
        <header>
          <div className="finance-section-title">
            <ReceiptText size={20} aria-hidden="true" />
            <div>
            <span>HAREKETLER</span>
            <h2>Satış defteri</h2>
              <p>{filteredSales.length} kayıt gösteriliyor</p>
            </div>
          </div>
        </header>
        <div className="finance-ledger-toolbar" aria-label="Satış defteri filtreleri">
          <label className="finance-ledger-search">
            <Search size={16} aria-hidden="true" />
            <span className="sr-only">Satış ara</span>
            <input value={ledgerSearch} onChange={(event) => setLedgerSearch(event.target.value)} placeholder="Organizasyon, işletme veya paket ara" />
          </label>
          <label>
            <span className="sr-only">Satış durumu</span>
            <select value={ledgerStatus} onChange={(event) => setLedgerStatus(event.target.value)}>
              <option value="">Tüm satışlar</option>
              <option value="paid">Tahsil edildi</option>
              <option value="refunded">İade edildi</option>
            </select>
          </label>
          {(ledgerSearch || ledgerStatus) ? <button className="admin-button" type="button" onClick={() => { setLedgerSearch(""); setLedgerStatus(""); }}><RotateCcw size={15} aria-hidden="true" /> Temizle</button> : null}
        </div>
        <div className="finance-ledger-table" role="table" aria-label="Satış kayıtları">
          <div className="finance-ledger-table-head" role="row">
            <span>Organizasyon</span><span>Paket / tarih</span><span>Tahsilat</span><span>Dağılım</span><span>Durum</span>
          </div>
          {filteredSales.map((sale) => (
            <div className="finance-ledger-row" role="row" key={sale.id}>
              <div data-label="Organizasyon"><strong>{sale.wedding_title || sale.wedding_id}</strong><small>{sale.partner_name || sale.partner_id}</small></div>
              <div data-label="Paket / tarih"><strong>{sale.package_code.toUpperCase()}</strong><small>{dateTime(sale.occurred_at)} · {sale.period}</small></div>
              <div className="finance-money-cell" data-label="Tahsilat"><strong>{money(sale.gross_cents)}</strong><small>Net {money(sale.net_cents)}</small></div>
              <div className="finance-money-cell" data-label="Dağılım"><strong>Partner {money(sale.commission_cents)}</strong><small>ShineQR {money(sale.platform_cents)}</small></div>
              <div data-label="Durum"><span className={`finance-status finance-status-${sale.status === "refunded" ? "danger" : "success"}`}>{saleStatusText(sale.status)}</span></div>
            </div>
          ))}
        </div>
        {sales.data && filteredSales.length === 0 ? (
          <div className="admin-empty">
            <ReceiptText size={26} aria-hidden="true" />
            <p>{sales.data.items.length ? "Filtrelerle eşleşen satış bulunamadı." : "Henüz finans kaydı yok."}</p>
          </div>
        ) : null}
      </section>
      <section className="admin-panel detail-list finance-payout-section">
        <header>
          <div className="finance-section-title">
            <WalletCards size={20} aria-hidden="true" />
            <div>
            <span>FOTOĞRAFÇI PAKETİ</span>
            <h2>Teslimat ve hakedişler</h2>
            <p>
              Müşteri teslimatı onayladıktan sonra hakediş finans onayına açılır.
              Ödendi kaydı gerçek transferi yapmaz; banka veya işlem referansı ister.
            </p>
            </div>
          </div>
        </header>
        <div className="finance-payout-controls">
          <div className="finance-report-filters" aria-label="Hakediş listesi filtreleri">
            <label><span>Satış durumu</span><select value={photographerSaleStatus} onChange={(event) => setPhotographerSaleStatus(event.target.value)}><option value="">Tümü</option><option value="pending_customer_consent">Müşteri onayı bekliyor</option><option value="paid">Aktif</option><option value="refunded">İade</option></select></label>
            <label><span>Hakediş durumu</span><select value={payoutStatus} onChange={(event) => setPayoutStatus(event.target.value)}><option value="">Tümü</option><option value="pending_delivery">Teslimat bekliyor</option><option value="pending_customer_approval">Müşteri onayı bekliyor</option><option value="payable">Finans onayı bekliyor</option><option value="approved">Ödemeye hazır</option><option value="paid">Ödendi</option><option value="recognized">ShineQR payı</option><option value="reversed">Ters kayıt</option></select></label>
            {(photographerSaleStatus || payoutStatus) ? <button className="admin-button" type="button" onClick={() => { setPhotographerSaleStatus(""); setPayoutStatus(""); }}><RotateCcw size={15} aria-hidden="true" /> Listeyi temizle</button> : null}
          </div>
          {me.data && accountHasPermission(me.data, "finance.view_all") ? <div className="finance-export-bar"><div><strong>Hakediş raporu</strong><small>Tarih ve lehtar seçimi yalnızca CSV kapsamını belirler.</small></div><label><span>Başlangıç</span><input type="date" value={exportFrom} onChange={(event) => setExportFrom(event.target.value)} /></label><label><span>Bitiş</span><input type="date" min={exportFrom || undefined} value={exportTo} onChange={(event) => setExportTo(event.target.value)} /></label><label><span>Lehtar</span><select value={beneficiaryType} onChange={(event) => setBeneficiaryType(event.target.value)}><option value="">Tümü</option><option value="photographer">Fotoğrafçı</option><option value="originating_partner">Kaynak işletme</option><option value="platform">ShineQR</option></select></label><a className="admin-button primary" href={exportUrl} download><Download size={15} aria-hidden="true" /> CSV indir</a></div> : null}
        </div>
        {photographerSales.error ? (
          <Notice>{photographerSales.error.message}</Notice>
        ) : null}
        {reconciliation.data ? (
          <div className="partner-stat-grid finance-reconciliation-grid">
            <article>
              <Clock3 size={19} aria-hidden="true" />
              <span>Ödemeye hazır</span>
              <strong>{money(reconciliation.data.ready_to_pay.gross_cents)}</strong>
              <small>{reconciliation.data.ready_to_pay.count} hakediş</small>
            </article>
            <article>
              <CheckCircle2 size={19} aria-hidden="true" />
              <span>Ödendi kaydı</span>
              <strong>{money(reconciliation.data.paid.gross_cents)}</strong>
              <small>{reconciliation.data.paid.count} hakediş</small>
            </article>
            <article>
              <AlertTriangle size={19} aria-hidden="true" />
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
                <small className="finance-sale-meta">Paket toplamı {money(sale.settlement_snapshot.grossCents)} · {dateTime(sale.occurred_at)}</small>
              </div>
              <span className={`finance-status finance-status-${sale.status === "refunded" ? "danger" : sale.customer_approval_status === "approved" ? "success" : "warning"}`}>
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
              <div className="detail-static-row finance-payout-row" key={payout.id}>
                <div className="finance-payout-identity"><strong>{beneficiaryText[payout.beneficiary_type]}</strong><small>{payout.payment_reference ? `Referans: ${payout.payment_reference}` : `Kayıt: ${dateTime(payout.created_at)}`}</small></div>
                <strong className="finance-payout-amount">{money(payout.gross_cents)}</strong>
                <span className={`finance-status finance-status-${payoutStatusTone(payout.status)}`}>{payoutStatusText[payout.status]}</span>
                <div className="finance-payout-actions">
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
                  <span className="finance-action-placeholder">İşlem gerekmiyor</span>
                )}
                </div>
              </div>
            ))}
          </article>
        ))}
        {photographerSales.data && !photographerSales.data.length ? (
          <div className="admin-empty">
            <WalletCards size={26} aria-hidden="true" />
            <p>Seçili filtrelerde fotoğrafçı paketi finans kaydı yok.</p>
          </div>
        ) : null}
      </section>
    </AdminShell>
  );
}
