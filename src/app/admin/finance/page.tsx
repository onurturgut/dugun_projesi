"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  AlertTriangle,
  Banknote,
  Building2,
  CheckCircle2,
  ChevronDown,
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
import { accountHasPermission, effectiveStaffRole } from "@/lib/access-control";
import { introTypes, qrCollectionReferences } from "@/lib/design";
import { weddingTemplates } from "@/lib/wedding-templates";

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
  status === "draft" ? "Ödeme bekliyor" : status === "cancelled" ? "İptal edildi" : status === "refunded" ? "İade edildi" : "Tahsil edildi";
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
type SaleDetail = {
  customer_name: string | null;
  customer_email: string | null;
  couple: string | null;
  wedding_date: string | null;
  venue: string | null;
  organizer_name: string | null;
  organizer_email: string | null;
  organizer_partner_name: string | null;
  organizer_partner_phone: string | null;
  organizer_partner_address: string | null;
  photographers: Array<{ name: string; email: string | null; assigned_at: string | null; assigned_by: string }>;
  package_name: string;
  add_ons: Array<{ name: string; quantity: number; line_gross_cents: number; effect_type: string | null }>;
  custom_design_requested: boolean;
  design: { qr_template_id: string; loading_template_id: string; wedding_template_id: string; status: string; revision_reason: string | null } | null;
};
type SalesResponse = {
  items: Array<SaleRecord & { partner_name?: string; wedding_title?: string; detail: SaleDetail }>;
  totals: {
    paid_sales: number;
    draft_sales: number;
    draft_gross_cents: number;
    gross_cents: number;
    net_cents: number;
    commission_cents: number;
    platform_cents: number;
  };
};
const qrTemplateNames = new Map<string, string>(qrCollectionReferences.map((item) => [item.id, item.name]));
const weddingTemplateNames = new Map<string, string>(weddingTemplates.map((item) => [item.id, item.name]));
const designStatusText: Record<string, string> = {
  draft: "Taslak",
  revision_requested: "Revizyon istendi",
  approved_for_print: "Baskı için onaylandı",
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
type PartnerSummaryResponse = {
  generated_at: string;
  items: Array<{
    partner_id: string;
    partner_name: string;
    phone: string | null;
    address: string | null;
    active: boolean;
    paid_sales: number;
    draft_sales: number;
    refunded_sales: number;
    gross_cents: number;
    commission_cents: number;
    last_sale_at: string | null;
    monthly: Array<{ period: string; paid_sales: number; refunded_sales: number; gross_cents: number; commission_cents: number }>;
    organizations: Array<{ wedding_id: string; title: string; customer_name: string | null; wedding_date: string | null; paid_sales: number; refunded_sales: number; gross_cents: number; commission_cents: number; last_sale_at: string }>;
  }>;
};

export default function FinancePage() {
  const queryClient = useQueryClient();
  const [workspaceTab, setWorkspaceTab] = useState<"overview" | "sales" | "payouts" | "reconciliation">("overview");
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
  const partnerSummary = useQuery({
    queryKey: ["sales-partner-summary"],
    queryFn: () => api<PartnerSummaryResponse>("/admin/sales/partner-summary"),
    enabled: !!me.data,
  });
  const photographerSales = useQuery({
    queryKey: ["photographer-sales"],
    queryFn: () => api<PhotographerSaleView[]>("/admin/photographer-sales"),
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
  const filteredPhotographerSales = useMemo(
    () => (photographerSales.data || []).filter((sale) => {
      if (photographerSaleStatus && sale.status !== photographerSaleStatus) return false;
      if (payoutStatus && !sale.payouts.some((payout) => payout.status === payoutStatus)) return false;
      return true;
    }),
    [photographerSaleStatus, photographerSales.data, payoutStatus],
  );
  const payoutMetrics = useMemo(() => {
    const payouts = (photographerSales.data || []).flatMap((sale) => sale.payouts);
    const total = (statuses: ServicePayoutLedgerEntry["status"][]) =>
      payouts.filter((payout) => statuses.includes(payout.status)).reduce((sum, payout) => sum + payout.gross_cents, 0);
    return {
      awaitingCount: payouts.filter((payout) => payout.status === "payable" || payout.status === "approved").length,
      awaitingCents: total(["payable", "approved"]),
      accountedCount: payouts.filter((payout) => payout.status === "paid" || payout.status === "recognized").length,
      accountedCents: total(["paid", "recognized"]),
    };
  }, [photographerSales.data]);
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
  const confirmSalePayment = useMutation({
    mutationFn: ({ saleId, ...input }: { saleId: string; payment_method: "bank_transfer" | "cash" | "card" | "other"; payment_reference: string; paid_at: string; amount_cents: number; kind: "deposit" | "installment" | "settlement"; due_at: string | null }) =>
      api(`/admin/sales/${saleId}/confirm-payment`, { method: "POST", body: JSON.stringify(input) }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["sales"] }),
        queryClient.invalidateQueries({ queryKey: ["sales-partner-summary"] }),
        queryClient.invalidateQueries({ queryKey: ["finance-overview"] }),
        queryClient.invalidateQueries({ queryKey: ["admin-weddings"] }),
        queryClient.invalidateQueries({ queryKey: ["admin-wedding"] }),
      ]);
      toast.success("Ödeme onaylandı. Organizasyon artık süperadmin tarafından yayınlanabilir.");
    },
  });
  const confirmPhotographerPayment = useMutation({
    mutationFn: ({ saleId, payment_reference }: { saleId: string; payment_reference: string }) =>
      api(`/admin/photographer-sales/${saleId}/confirm-payment`, { method: "POST", body: JSON.stringify({ payment_method: "bank_transfer", payment_reference, paid_at: new Date().toISOString() }) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["photographer-sales"] }),
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
  if (me.data?.role === "partner")
    return <AdminShell><div className="admin-heading"><div><p className="admin-kicker">KOMİSYON VE KAZANÇ</p><h1>İşletme finansı</h1><p className="admin-subtitle">Platform finansı bu hesaba kapalıdır. Kendi satış, komisyon ve grafiklerinizi komisyon panelinden izleyin.</p></div></div><a className="admin-button primary" href="/admin/finance-center">Komisyon paneline git</a></AdminShell>;
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
      <nav className="finance-workspace-tabs" aria-label="Finans operasyon alanları">
        {[
          ["overview", "Genel Bakış", "Finansal durum"],
          ["sales", "Satış Defteri", `${sales.data?.items.length || 0} kayıt`],
          ["payouts", "Hakedişler", `${payoutMetrics.awaitingCount} bekliyor`],
          ["reconciliation", "Mutabakat", `${reconciliation.data?.anomalies.length || 0} uyarı`],
        ].map(([id, label, detail]) => (
          <button
            key={id}
            type="button"
            aria-current={workspaceTab === id ? "page" : undefined}
            className={workspaceTab === id ? "is-active" : ""}
            onClick={() => setWorkspaceTab(id as typeof workspaceTab)}
          >
            <strong>{label}</strong>
            <small>{detail}</small>
          </button>
        ))}
      </nav>
      {sales.error ? <Notice>{sales.error.message}</Notice> : null}
      {workspaceTab === "overview" ? <>
      <section className="partner-stat-grid finance-ledger-kpis" aria-label="Satış özeti">
        <article>
          <ReceiptText size={20} aria-hidden="true" />
          <span>Aktif satış</span>
          <strong>{sales.data?.totals.paid_sales || 0}</strong>
          <small>Tahsil edilmiş satış adedi</small>
          <small>{sales.data?.totals.draft_sales || 0} taslak · {money(sales.data?.totals.draft_gross_cents || 0)} bekliyor</small>
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
        <article>
          <Landmark size={20} aria-hidden="true" />
          <span>Hesaplanan KDV</span>
          <strong>{money((sales.data?.totals.gross_cents || 0) - (sales.data?.totals.net_cents || 0))}</strong>
          <small>KDV dahil tahsilat ile net matrah farkı</small>
        </article>
        <article>
          <Clock3 size={20} aria-hidden="true" />
          <span>Bekleyen hakediş</span>
          <strong>{money(payoutMetrics.awaitingCents)}</strong>
          <small>{payoutMetrics.awaitingCount} finans işlemi bekliyor</small>
        </article>
        <article>
          <CheckCircle2 size={20} aria-hidden="true" />
          <span>Muhasebeleşen / ödenen</span>
          <strong>{money(payoutMetrics.accountedCents)}</strong>
          <small>{payoutMetrics.accountedCount} tamamlanmış hakediş</small>
        </article>
      </section>
      <PartnerPerformance data={partnerSummary.data} loading={partnerSummary.isLoading} error={partnerSummary.error} />
      </> : null}
      {workspaceTab === "sales" ? (
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
              <option value="draft">Ödeme bekliyor</option>
              <option value="paid">Tahsil edildi</option>
              <option value="cancelled">İptal edildi</option>
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
            <details className="finance-ledger-accordion" key={sale.id}>
              <summary className="finance-ledger-row" role="row">
              <div data-label="Organizasyon"><strong>{sale.wedding_title || sale.wedding_id}</strong><small>{sale.partner_name || sale.partner_id}</small></div>
              <div data-label="Paket / tarih"><strong>{sale.detail.package_name}</strong><small>{dateTime(sale.paid_at || sale.recorded_at)} · {sale.period}</small></div>
              <div className="finance-money-cell" data-label="Tahsilat"><strong>{money(sale.gross_cents)}</strong><small>Net {money(sale.net_cents)}</small></div>
              <div className="finance-money-cell" data-label="Dağılım">{sale.status === "paid" || sale.status === "refunded" ? <><strong>Partner {money(sale.commission_cents)}</strong><small>ShineQR {money(sale.platform_cents)} · maliyet {money(sale.variable_cost_cents || 0)}</small></> : <><strong>Henüz hesaplanmadı</strong><small>Ödeme onayında kesinleşir</small></>}</div>
              <div className="finance-ledger-status-cell" data-label="Durum"><span className={`finance-status finance-status-${sale.status === "refunded" || sale.status === "cancelled" ? "danger" : sale.status === "draft" ? "warning" : "success"}`}>{saleStatusText(sale.status)}</span><ChevronDown size={17} aria-hidden="true" /></div>
              </summary>
              <SaleDetailPanel sale={sale} />
              {sale.status === "draft" && me.data && accountHasPermission(me.data, "commission.manage") ? <div className="finance-ledger-approval"><PartialPaymentForm sale={sale} busy={confirmSalePayment.isPending} onConfirm={(input) => confirmSalePayment.mutate({ saleId: sale.id, ...input })} /></div> : null}
            </details>
          ))}
        </div>
        {sales.data && filteredSales.length === 0 ? (
          <div className="admin-empty">
            <ReceiptText size={26} aria-hidden="true" />
            <p>{sales.data.items.length ? "Filtrelerle eşleşen satış bulunamadı." : "Henüz finans kaydı yok."}</p>
          </div>
        ) : null}
      </section>
      ) : null}
      {workspaceTab === "payouts" ? (
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
            <label><span>Satış durumu</span><select value={photographerSaleStatus} onChange={(event) => setPhotographerSaleStatus(event.target.value)}><option value="">Tümü</option><option value="pending_customer_consent">Müşteri onayı bekliyor</option><option value="pending_payment">Ödeme onayı bekliyor</option><option value="paid">Aktif</option><option value="refunded">İade</option></select></label>
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
        {filteredPhotographerSales.map((sale) => (
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
                  : sale.status === "pending_customer_consent"
                    ? "Müşteri paket onayı bekleniyor"
                  : sale.status === "pending_payment"
                    ? "ShineQR ödeme onayı bekleniyor"
                  : sale.customer_approval_status === "approved"
                    ? "Müşteri onayladı"
                    : sale.customer_approval_status === "pending"
                      ? "Müşteri onayı bekleniyor"
                      : "Teslimat bekleniyor"}
              </span>
              {me.data && sale.status === "pending_payment" && accountHasPermission(me.data, "commission.manage") ? <button className="admin-button primary" disabled={confirmPhotographerPayment.isPending} onClick={() => { const reference = window.prompt("Ödeme / banka referansını girin:"); if (reference?.trim()) confirmPhotographerPayment.mutate({ saleId: sale.id, payment_reference: reference.trim() }); }}>Fotoğrafçı paketi ödemesini onayla</button> : null}
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
                (payout.status === "payable" ||
                  (payout.status === "approved" &&
                    effectiveStaffRole(me.data) === "platform_admin")) &&
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
                    {effectiveStaffRole(me.data) === "platform_admin" ? "Onayla ve muhasebeleştir" : "Hakedişi onayla"}
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
        {photographerSales.data && !filteredPhotographerSales.length ? (
          <div className="admin-empty">
            <WalletCards size={26} aria-hidden="true" />
            <p>Seçili filtrelerde fotoğrafçı paketi finans kaydı yok.</p>
          </div>
        ) : null}
      </section>
      ) : null}
      {workspaceTab === "reconciliation" ? (
        <section className="admin-panel detail-list finance-reconciliation-section">
          <header>
            <div className="finance-section-title">
              <AlertTriangle size={20} aria-hidden="true" />
              <div>
                <span>KONTROL MASASI</span>
                <h2>Mutabakat ve eksik kayıtlar</h2>
                <p>Ödeme referansı, belge veya denetim alanı eksik finans hareketlerini tek yerde inceleyin.</p>
              </div>
            </div>
          </header>
          {reconciliation.data ? <>
            <div className="partner-stat-grid finance-reconciliation-grid">
              <article><Clock3 size={19} aria-hidden="true" /><span>Ödemeye hazır</span><strong>{money(reconciliation.data.ready_to_pay.gross_cents)}</strong><small>{reconciliation.data.ready_to_pay.count} hakediş</small></article>
              <article><CheckCircle2 size={19} aria-hidden="true" /><span>Ödendi kaydı</span><strong>{money(reconciliation.data.paid.gross_cents)}</strong><small>{reconciliation.data.paid.count} hakediş</small></article>
              <article><AlertTriangle size={19} aria-hidden="true" /><span>Kontrol uyarısı</span><strong>{reconciliation.data.anomalies.length}</strong><small>Eksik finansal kanıt veya denetim alanı</small></article>
            </div>
            <div className="finance-anomaly-table" role="table" aria-label="Mutabakat uyarıları">
              <div className="finance-anomaly-head" role="row"><span>Satış</span><span>Hakediş kaydı</span><span>Tutar</span><span>Kontrol</span></div>
              {reconciliation.data.anomalies.map((anomaly) => (
                <div className="finance-anomaly-row" role="row" key={anomaly.id}>
                  <span>{anomaly.sale_id}</span><span>{anomaly.id}</span><strong>{money(anomaly.gross_cents)}</strong><span className="finance-status finance-status-danger">Eksik alan</span>
                </div>
              ))}
            </div>
            {!reconciliation.data.anomalies.length ? <div className="admin-empty finance-clean-state"><CheckCircle2 size={28} aria-hidden="true" /><strong>Mutabakat temiz</strong><p>Eksik referans, belge veya denetim alanı bulunmuyor.</p></div> : null}
          </> : <div className="admin-empty"><Clock3 size={26} aria-hidden="true" /><p>Mutabakat verileri yükleniyor.</p></div>}
        </section>
      ) : null}
    </AdminShell>
  );
}

function PartnerPerformance({ data, loading, error }: { data?: PartnerSummaryResponse; loading: boolean; error: Error | null }) {
  return (
    <section className="admin-panel finance-partner-section" aria-labelledby="partner-performance-title">
      <header>
        <div className="finance-section-title">
          <Building2 size={20} aria-hidden="true" />
          <div><span>PARTNER PERFORMANSI</span><h2 id="partner-performance-title">Partner satışları ve komisyonları</h2><p>Bir işletmeye tıklayarak organizasyonlarını ve aylık geçmişini inceleyin.</p></div>
        </div>
      </header>
      {loading ? <div className="admin-empty"><p>Partner verileri yükleniyor…</p></div> : null}
      {error ? <Notice>{error.message}</Notice> : null}
      {data?.items.length ? <div className="finance-partner-list">{data.items.map((partner) => {
        const highestMonthlyCommission = Math.max(1, ...partner.monthly.map((month) => month.commission_cents));
        return <details className="finance-partner-accordion" key={partner.partner_id}>
          <summary>
            <div className="finance-partner-identity"><span className="finance-partner-avatar"><Building2 size={19} aria-hidden="true" /></span><div><strong>{partner.partner_name}</strong><small>{partner.active ? "Aktif partner" : "Pasif partner"}{partner.last_sale_at ? ` · Son satış ${dateTime(partner.last_sale_at)}` : " · Satış yok"}</small></div></div>
            <div><small>Tahsil edilmiş satış</small><strong>{partner.paid_sales}</strong></div>
            <div><small>Satış hacmi</small><strong>{money(partner.gross_cents)}</strong></div>
            <div><small>Kazanılan komisyon</small><strong>{money(partner.commission_cents)}</strong></div>
            <ChevronDown size={18} aria-hidden="true" />
          </summary>
          <div className="finance-partner-detail">
            <div className="finance-partner-mini-stats"><article><span>Taslak</span><strong>{partner.draft_sales}</strong></article><article><span>İade</span><strong>{partner.refunded_sales}</strong></article><article><span>Organizasyon</span><strong>{partner.organizations.length}</strong></article><article><span>Telefon</span><strong>{partner.phone || "Belirtilmemiş"}</strong></article></div>
            <section><div className="finance-partner-subhead"><div><span>AYLIK GEÇMİŞ</span><h3>Satış ve komisyon seyri</h3></div><small>{partner.monthly.length} dönem</small></div>
              {partner.monthly.length ? <div className="finance-partner-months">{partner.monthly.map((month) => <div key={month.period}><strong>{monthLabel(month.period)}</strong><span>{month.paid_sales} satış{month.refunded_sales ? ` · ${month.refunded_sales} iade` : ""}</span><div className="finance-partner-bar" aria-hidden="true"><i style={{ width: `${Math.max(3, Math.round(month.commission_cents / highestMonthlyCommission * 100))}%` }} /></div><b>{money(month.gross_cents)}</b><em>{money(month.commission_cents)} komisyon</em></div>)}</div> : <p className="finance-ledger-empty-value">Aylık satış geçmişi bulunmuyor.</p>}
            </section>
            <section><div className="finance-partner-subhead"><div><span>ORGANİZASYONLAR</span><h3>Partnerin açtığı organizasyonlar</h3></div><small>{partner.organizations.length} kayıt</small></div>
              {partner.organizations.length ? <div className="finance-partner-organizations">{partner.organizations.map((organization) => <a href={`/admin/${organization.wedding_id}`} key={organization.wedding_id}><div><strong>{organization.title}</strong><small>{organization.customer_name || "Müşteri belirtilmemiş"}{organization.wedding_date ? ` · ${organization.wedding_date}` : ""}</small></div><span>{organization.paid_sales} satış</span><b>{money(organization.commission_cents)} komisyon</b></a>)}</div> : <p className="finance-ledger-empty-value">Satışa bağlı organizasyon bulunmuyor.</p>}
            </section>
          </div>
        </details>;
      })}</div> : !loading && !error ? <div className="admin-empty"><p>Gösterilecek partner bulunmuyor.</p></div> : null}
    </section>
  );
}

function monthLabel(period: string) {
  const match = /^(\d{4})-(\d{2})$/.exec(period);
  if (!match) return period;
  return new Date(Number(match[1]), Number(match[2]) - 1, 1).toLocaleDateString("tr-TR", { month: "long", year: "numeric" });
}

function SaleDetailPanel({ sale }: { sale: SalesResponse["items"][number] }) {
  const detail = sale.detail;
  const design = detail.design;
  const weddingDate = detail.wedding_date
    ? new Date(`${detail.wedding_date}T12:00:00`).toLocaleDateString("tr-TR", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      })
    : "Belirtilmemiş";
  return (
    <div className="finance-ledger-detail">
      <section>
        <h3>Organizasyon ve müşteri</h3>
        <dl>
          <DetailValue label="Organizasyon sahibi" value={detail.customer_name} />
          <DetailValue label="Çift" value={detail.couple} />
          <DetailValue label="Organizasyon tarihi" value={weddingDate} />
          <DetailValue label="Mekân" value={detail.venue} />
          <DetailValue label="E-posta" value={detail.customer_email} href={detail.customer_email ? `mailto:${detail.customer_email}` : undefined} />
        </dl>
      </section>
      <section>
        <h3>Organizasyonu oluşturan</h3>
        <dl>
          <DetailValue label="Yetkili" value={detail.organizer_name} />
          <DetailValue label="İşletme" value={detail.organizer_partner_name} />
          <DetailValue label="Yetkili e-postası" value={detail.organizer_email} href={detail.organizer_email ? `mailto:${detail.organizer_email}` : undefined} />
          <DetailValue label="İşletme telefonu" value={detail.organizer_partner_phone} href={detail.organizer_partner_phone ? `tel:${detail.organizer_partner_phone}` : undefined} />
          <DetailValue label="İşletme adresi" value={detail.organizer_partner_address} />
        </dl>
      </section>
      <section>
        <h3>Paket ve ek ürünler</h3>
        <dl>
          <DetailValue label="Paket" value={detail.package_name} />
          <DetailValue label="Paket bedeli" value={sale.price_snapshot ? money(sale.price_snapshot.package_gross_cents) : null} />
          <DetailValue label="Toplam" value={money(sale.gross_cents)} />
          <DetailValue label="Kişisel tasarım" value={detail.custom_design_requested ? "Evet, istendi" : "Hayır"} tone={detail.custom_design_requested ? "accent" : undefined} />
        </dl>
        {detail.add_ons.length ? <ul className="finance-ledger-addons">{detail.add_ons.map((addOn, index) => <li key={`${addOn.name}:${index}`}><span>{addOn.name} × {addOn.quantity}</span><strong>{money(addOn.line_gross_cents)}</strong></li>)}</ul> : <p className="finance-ledger-empty-value">Ek ürün seçilmemiş.</p>}
      </section>
      <section>
        <h3>Atanan fotoğrafçı</h3>
        {detail.photographers.length ? <div className="finance-ledger-photographers">{detail.photographers.map((photographer, index) => <article key={`${photographer.name}:${index}`}><strong>{photographer.name}</strong><small>{photographer.email || "E-posta belirtilmemiş"}</small><small>{photographer.assigned_at ? `${dateTime(photographer.assigned_at)} tarihinde ${photographer.assigned_by} tarafından atandı` : `Atayan: ${photographer.assigned_by}`}</small></article>)}</div> : <p className="finance-ledger-empty-value">Fotoğrafçı atanmamış.</p>}
      </section>
      <section className="finance-ledger-design-section">
        <h3>İstenen tasarımlar</h3>
        {design ? <div className="finance-ledger-design-grid">
          <DetailValue label="QR tasarımı" value={qrTemplateNames.get(design.qr_template_id) || design.qr_template_id} />
          <DetailValue label="Loading Page" value={(introTypes as Record<string, string>)[design.loading_template_id] || design.loading_template_id} />
          <DetailValue label="Wedding tasarımı" value={weddingTemplateNames.get(design.wedding_template_id) || design.wedding_template_id} />
          <DetailValue label="Tasarım durumu" value={designStatusText[design.status] || design.status} />
          {design.revision_reason ? <DetailValue label="Revizyon talebi" value={design.revision_reason} /> : null}
        </div> : <p className="finance-ledger-empty-value">Henüz tasarım seçimi kaydedilmemiş.</p>}
      </section>
    </div>
  );
}

function DetailValue({ label, value, href, tone }: { label: string; value: string | null | undefined; href?: string; tone?: "accent" }) {
  return <div className={tone === "accent" ? "finance-detail-accent" : undefined}><dt>{label}</dt><dd>{href && value ? <a href={href}>{value}</a> : value || "Belirtilmemiş"}</dd></div>;
}

function PaymentApprovalForm({ sale, busy, onConfirm }: { sale: SaleRecord; busy: boolean; onConfirm: (input: { payment_method: "bank_transfer" | "cash" | "card" | "other"; payment_reference: string; paid_at: string }) => void }) {
  const [open, setOpen] = useState(false);
  const [method, setMethod] = useState<"bank_transfer" | "cash" | "card" | "other">("bank_transfer");
  const [reference, setReference] = useState("");
  const [paidAt, setPaidAt] = useState(() => {
    const now = new Date();
    return new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
  });
  if (!open) return <button className="admin-button" type="button" onClick={() => setOpen(true)}>Ödemeyi onayla</button>;
  return <form className="finance-payment-approval" onSubmit={(event) => {
    event.preventDefault();
    if (!reference.trim() || !window.confirm(`${money(sale.gross_cents)} tahsil edildi olarak kaydedilsin mi? Komisyon ve maliyet kayıtları oluşturulacak.`)) return;
    onConfirm({ payment_method: method, payment_reference: reference.trim(), paid_at: new Date(paidAt).toISOString() });
  }}>
    <select aria-label="Ödeme yöntemi" value={method} onChange={(event) => setMethod(event.target.value as typeof method)}><option value="bank_transfer">Banka transferi</option><option value="cash">Nakit</option><option value="card">Kart</option><option value="other">Diğer</option></select>
    <input required maxLength={120} value={reference} onChange={(event) => setReference(event.target.value)} placeholder="İşlem / banka referansı" />
    <input required type="datetime-local" value={paidAt} onChange={(event) => setPaidAt(event.target.value)} />
    <button className="admin-button primary" disabled={busy}>Tahsilatı kesinleştir</button>
    <button className="admin-button" type="button" disabled={busy} onClick={() => setOpen(false)}>Vazgeç</button>
  </form>;
}

function PartialPaymentForm({ sale, busy, onConfirm }: { sale: SaleRecord; busy: boolean; onConfirm: (input: { payment_method: "bank_transfer" | "cash" | "card" | "other"; payment_reference: string; paid_at: string; amount_cents: number; kind: "deposit" | "installment" | "settlement"; due_at: string | null }) => void }) {
  const remaining = Math.max(0, sale.gross_cents - (sale.paid_cents || 0));
  const [open, setOpen] = useState(false), [method, setMethod] = useState<"bank_transfer" | "cash" | "card" | "other">("bank_transfer"), [kind, setKind] = useState<"deposit" | "installment" | "settlement">(sale.paid_cents ? "installment" : "deposit"), [reference, setReference] = useState(""), [amount, setAmount] = useState(String(remaining / 100)), [dueAt, setDueAt] = useState(sale.due_at?.slice(0, 10) || ""), [paidAt, setPaidAt] = useState(() => { const now = new Date(); return new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().slice(0, 16); });
  if (!open) return <button className="admin-button" type="button" onClick={() => setOpen(true)}>Tahsilat kaydet</button>;
  return <form className="finance-payment-approval" onSubmit={(event) => { event.preventDefault(); const cents = Math.round(Number(amount.replace(",", ".")) * 100); if (!reference.trim() || !Number.isSafeInteger(cents) || cents < 1 || cents > remaining) return; if (!window.confirm(`${money(cents)} tahsilat kaydedilsin mi? ${cents === remaining ? "Kalan bakiye kapanacak." : "Satış kısmi ödemede kalacak."}`)) return; onConfirm({ payment_method: method, payment_reference: reference.trim(), paid_at: new Date(paidAt).toISOString(), amount_cents: cents, kind, due_at: dueAt ? new Date(`${dueAt}T23:59:59+03:00`).toISOString() : null }); }}>
    <div className="finance-payment-balance"><span>Toplam <b>{money(sale.gross_cents)}</b></span><span>Ödenen <b>{money(sale.paid_cents || 0)}</b></span><span>Kalan <b>{money(remaining)}</b></span></div>
    <select aria-label="Tahsilat türü" value={kind} onChange={(e) => setKind(e.target.value as typeof kind)}><option value="deposit">Kapora</option><option value="installment">Taksit</option><option value="settlement">Kapanış</option></select>
    <input required inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Tutar (TL)" />
    <select aria-label="Ödeme yöntemi" value={method} onChange={(e) => setMethod(e.target.value as typeof method)}><option value="bank_transfer">Banka transferi</option><option value="cash">Nakit</option><option value="card">Kart</option><option value="other">Diğer</option></select>
    <input required maxLength={120} value={reference} onChange={(e) => setReference(e.target.value)} placeholder="İşlem / banka referansı" />
    <input required type="datetime-local" value={paidAt} onChange={(e) => setPaidAt(e.target.value)} />
    <input type="date" value={dueAt} onChange={(e) => setDueAt(e.target.value)} aria-label="Kalan bakiye vadesi" />
    <button className="admin-button primary" disabled={busy}>Tahsilatı kesinleştir</button><button className="admin-button" type="button" disabled={busy} onClick={() => setOpen(false)}>Vazgeç</button>
  </form>;
}
