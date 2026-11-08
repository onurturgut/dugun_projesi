"use client";

import { FormEvent, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AdminShell } from "./AdminShell";
import { api, type Account } from "@/lib/api";
import type { AddOnProduct, ExpenseRecord, PackageConfiguration, PartnerCommissionPolicy, PhotographerPackageConfiguration, TaxConfiguration } from "@/lib/models";
import { accountHasPermission } from "@/lib/access-control";

const money = (value = 0) => new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" }).format(value / 100);
const percent = (bps = 0) => `%${new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 2 }).format(bps / 100)}`;
const toCents = (value: string) => Math.round(Number(value.replace(",", ".")) * 100);
const toBps = (value: string) => Math.round(Number(value.replace(",", ".")) * 100);
type PackageResponse = {
  source: "database" | "partial_database_migration_required" | "legacy_catalog_migration_required";
  items: PackageConfiguration[];
};
type Overview = {
  sales_count: number;
  gross_cents: number;
  net_cents: number;
  vat_cents: number;
  commission_cents: number;
  variable_cost_cents: number;
  expense_cents: number;
  operating_contribution_cents: number;
  remittance_cents?: number;
};
type PartnerSummary = { items: Array<{ partner_id: string; partner_name: string; paid_sales: number; draft_sales: number; gross_cents: number; commission_cents: number; monthly: Array<{ period: string; paid_sales: number; gross_cents: number; commission_cents: number }>; organizations: Array<{ wedding_id: string; title: string; customer_name: string | null; wedding_date: string | null; paid_sales: number; gross_cents: number; commission_cents: number }> }> };
type PartnerRow = {
  id: string;
  name: string;
  period: string;
  monthly_valid_sales: number;
  policy: PartnerCommissionPolicy | null;
};
type ProfitRow = PackageConfiguration & {
  commission_rate_bps: number;
  net_cents: number;
  vat_cents: number;
  commission_cents: number;
  contribution_cents: number;
  contribution_margin_bps: number;
  break_even_gross_cents: number | null;
  target_gross_cents: number | null;
  calculation_warning?: string | null;
  sales_count: number;
};
type ProfitResponse = {
  packages: ProfitRow[];
  monthly_fixed_cents: number;
  weighted_contribution_cents: number;
  monthly_break_even_units: number | null;
  payment_cost_assumption: { configured: boolean };
};
type HistoryRow = {
  id: string;
  entity_type: string;
  entity_id: string;
  changed_fields: string[];
  changed_at: string;
  changed_by: string;
  previous: unknown;
  next: unknown;
};
const effectOptions: Record<NonNullable<AddOnProduct["effect_type"]>, number[]> = {
  print_quantity: [1],
  welcome_sign: [1],
  storage_gib: [10],
  retention_months: [3, 6, 12],
  digital_invitation: [1],
  custom_design: [1],
  second_event: [1],
};
const unitForEffect: Record<NonNullable<AddOnProduct["effect_type"]>, NonNullable<AddOnProduct["unit"]>> = {
  print_quantity: "item",
  welcome_sign: "item",
  storage_gib: "gib",
  retention_months: "month",
  digital_invitation: "service",
  custom_design: "service",
  second_event: "organization",
};

function Labeled({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="form-field">
      <span>{label}</span>
      {children}
    </label>
  );
}

export function FinanceCenter() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState("overview");
  const me = useQuery({
    queryKey: ["me"],
    queryFn: () => api<Account>("/auth/me"),
  });
  const packages = useQuery({
    queryKey: ["finance-packages"],
    queryFn: () => api<PackageResponse>("/admin/finance/packages"),
    enabled: me.data?.role === "platform",
  });
  const photographerPackage = useQuery({
    queryKey: ["finance-photographer-package"],
    queryFn: () => api<PhotographerPackageConfiguration>("/admin/finance/photographer-package"),
    enabled: me.data?.role === "platform",
  });
  const overview = useQuery({
    queryKey: ["finance-overview"],
    queryFn: () => api<Overview>("/admin/finance/overview"),
  });
  const products = useQuery({
    queryKey: ["add-ons"],
    queryFn: () => api<AddOnProduct[]>("/admin/add-ons"),
    enabled: me.data?.role === "platform",
  });
  const partners = useQuery({
    queryKey: ["commission-policies"],
    queryFn: () => api<PartnerRow[]>("/admin/finance/commission-policies"),
    enabled: me.data?.role === "platform",
  });
  const taxes = useQuery({
    queryKey: ["finance-tax"],
    queryFn: () => api<TaxConfiguration | null>("/admin/finance/tax"),
    enabled: me.data?.role === "platform",
  });
  const partnerSummary = useQuery({
    queryKey: ["sales-partner-summary"],
    queryFn: () => api<PartnerSummary>("/admin/sales/partner-summary"),
    enabled: me.data?.role === "partner",
  });
  const expenses = useQuery({
    queryKey: ["finance-expenses"],
    queryFn: () => api<ExpenseRecord[]>("/admin/finance/expenses"),
    enabled: me.data?.role === "platform",
  });
  const profit = useQuery({
    queryKey: ["finance-profitability"],
    queryFn: () => api<ProfitResponse>("/admin/finance/profitability"),
    enabled: me.data?.role === "platform",
  });
  const history = useQuery({
    queryKey: ["finance-history"],
    queryFn: () => api<HistoryRow[]>("/admin/finance/history"),
    enabled: me.data?.role === "platform",
  });
  const canEdit = !!me.data && accountHasPermission(me.data, "commission.manage");
  const refresh = (...keys: string[]) => Promise.all(keys.map((key) => queryClient.invalidateQueries({ queryKey: [key] })));
  const useManagedMutation = <T,>(fn: (value: T) => Promise<unknown>, keys: string[], message: string) =>
    useMutation({
      mutationFn: fn,
      onSuccess: async () => {
        await refresh(...keys, "finance-history");
        toast.success(message);
      },
      onError: (reason: Error) => toast.error(reason.message),
    });
  const updatePackage = useManagedMutation<{ code: string; changes: object }>(
    ({ code, changes }) =>
      api(`/admin/finance/packages/${code}`, {
        method: "PATCH",
        body: JSON.stringify(changes),
      }),
    ["finance-packages", "finance-profitability"],
    "Paket yeni versiyon olarak kaydedildi.",
  );
  const updatePhotographerPackage = useManagedMutation<object>(
    (changes) =>
      api("/admin/finance/photographer-package", {
        method: "PATCH",
        body: JSON.stringify(changes),
      }),
    ["finance-photographer-package"],
    "Fotoğrafçı paketi yeni versiyon olarak kaydedildi.",
  );
  const createProduct = useManagedMutation<object>((body) => api("/admin/add-ons", { method: "POST", body: JSON.stringify(body) }), ["add-ons", "finance-profitability"], "Ürün kaydedildi.");
  const updateProduct = useManagedMutation<{ id: string; changes: object }>(
    ({ id, changes }) =>
      api(`/admin/add-ons/${id}`, {
        method: "PATCH",
        body: JSON.stringify(changes),
      }),
    ["add-ons", "finance-profitability"],
    "Ürün güncellendi.",
  );
  const deleteProduct = useManagedMutation<string>(
    (id) => api(`/admin/add-ons/${id}`, { method: "DELETE" }),
    ["add-ons", "finance-profitability"],
    "Ürün silindi.",
  );
  const updatePolicy = useManagedMutation<object>(
    (body) =>
      api("/admin/finance/commission-policies", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    ["commission-policies", "finance-profitability"],
    "Komisyon politikası kaydedildi.",
  );
  const updateTax = useManagedMutation<object>((body) => api("/admin/finance/tax", { method: "POST", body: JSON.stringify(body) }), ["finance-tax", "finance-profitability"], "Vergi yapılandırması kaydedildi.");
  const createExpense = useManagedMutation<object>(
    (body) =>
      api("/admin/finance/expenses", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    ["finance-expenses", "finance-overview", "finance-profitability"],
    "Gider kaydedildi.",
  );
  const updateExpense = useManagedMutation<{
    id: string;
    changes?: object;
    archive?: boolean;
  }>(
    ({ id, changes, archive }) =>
      api(`/admin/finance/expenses/${id}`, {
        method: archive ? "DELETE" : "PATCH",
        body: archive ? undefined : JSON.stringify(changes),
      }),
    ["finance-expenses", "finance-overview", "finance-profitability"],
    "Gider güncellendi.",
  );
  const tabs = [
    ["overview", "Genel Bakış"],
    ["packages", "Paketler"],
    ["qr", "Ekstra QR ve Tabela"],
    ["products", "Ekstra Ürünler"],
    ["commissions", "Partner Komisyonları"],
    ["taxes", "Vergiler"],
    ["expenses", "Giderler"],
    ["profit", "Kârlılık Analizi"],
    ["history", "Değişiklik Geçmişi"],
  ];

  if (me.data?.role === "partner")
    return <PartnerEarningsDashboard overview={overview.data} summary={partnerSummary.data?.items[0]} />;

  return (
    <AdminShell>
      <div className="admin-heading">
        <div>
          <p className="admin-kicker">FİNANS VE FİYATLANDIRMA</p>
          <h1>Finans merkezi</h1>
          <p className="admin-subtitle">Paket, ürün, komisyon, vergi ve giderlerin yetkili MongoDB kayıtları.</p>
        </div>
        <button className="admin-button" onClick={() => void refresh("finance-overview", "finance-profitability", "finance-history")}>
          Verileri yenile
        </button>
      </div>
      {packages.data?.source !== "database" || photographerPackage.data?.updated_by === "migration-required" ? (
        <div className="admin-notice">
          <strong>Migration onayı bekleniyor.</strong> Paketler mevcut onaylı katalogdan salt okunur fallback ile gösteriliyor; production migration çalıştırılmadı.
        </div>
      ) : null}
      <div className="finance-center-tabs" role="tablist">
        {tabs.map(([id, label]) => (
          <button key={id} role="tab" aria-selected={tab === id} className={`admin-button ${tab === id ? "primary" : ""}`} onClick={() => setTab(id)}>
            {label}
          </button>
        ))}
      </div>
      {tab === "overview" ? <OverviewPanel data={overview.data} /> : null}
      {tab === "packages" ? (
        <>
          <PackagePanel items={packages.data?.items || []} canEdit={canEdit} pending={updatePackage.isPending} onSave={(code, changes) => updatePackage.mutate({ code, changes })} />
          {photographerPackage.data ? <PhotographerPackageEditor key={photographerPackage.data.version} item={photographerPackage.data} disabled={!canEdit || updatePhotographerPackage.isPending} onSave={updatePhotographerPackage.mutate} /> : null}
        </>
      ) : null}
      {tab === "qr" ? <ProductPanel qr items={(products.data || []).filter((item) => item.category === "qr_print" || item.effect_type === "welcome_sign")} packages={packages.data?.items || []} canEdit={canEdit} onCreate={createProduct.mutate} onUpdate={(id, changes) => updateProduct.mutate({ id, changes })} onDelete={deleteProduct.mutate} /> : null}
      {tab === "products" ? <ProductPanel items={(products.data || []).filter((item) => item.category !== "qr_print" && item.effect_type !== "welcome_sign")} packages={packages.data?.items || []} canEdit={canEdit} onCreate={createProduct.mutate} onUpdate={(id, changes) => updateProduct.mutate({ id, changes })} onDelete={deleteProduct.mutate} /> : null}
      {tab === "commissions" ? <CommissionPanel items={partners.data || []} canEdit={canEdit} onSave={updatePolicy.mutate} /> : null}
      {tab === "taxes" ? <TaxPanel key={taxes.data?.version || 0} value={taxes.data || null} canEdit={canEdit} onSave={updateTax.mutate} /> : null}
      {tab === "expenses" ? <ExpensePanel items={expenses.data || []} canEdit={canEdit} onCreate={createExpense.mutate} onUpdate={(id, changes) => updateExpense.mutate({ id, changes })} onArchive={(id) => updateExpense.mutate({ id, archive: true })} /> : null}
      {tab === "profit" ? <ProfitPanel data={profit.data} /> : null}
      {tab === "history" ? <HistoryPanel items={history.data || []} /> : null}
    </AdminShell>
  );
}

function PartnerEarningsDashboard({ overview, summary }: { overview?: Overview; summary?: PartnerSummary["items"][number] }) {
  const maxCommission = Math.max(1, ...(summary?.monthly.map((item) => item.commission_cents) || [1]));
  return (
    <AdminShell>
      <div className="admin-heading"><div><p className="admin-kicker">KOMİSYON VE KAZANÇ</p><h1>{summary?.partner_name || "İşletmem"}</h1><p className="admin-subtitle">Yalnızca işletmenizin onaylanmış satış ve komisyon hareketleri.</p></div></div>
      <section className="partner-stat-grid">
        <article><span>Onaylı satış</span><strong>{summary?.paid_sales || 0}</strong></article>
        <article><span>Ödeme bekleyen</span><strong>{summary?.draft_sales || 0}</strong></article>
        <article><span>Satış hacmi</span><strong>{money(summary?.gross_cents)}</strong></article>
        <article><span>Kazanılan komisyon</span><strong>{money(summary?.commission_cents)}</strong></article>
        <article><span>ShineQR'a aktarılacak</span><strong>{money(overview?.remittance_cents)}</strong></article>
      </section>
      <section className="admin-panel"><h2>Aylık komisyon grafiği</h2>{summary?.monthly.length ? <div className="finance-partner-months">{summary.monthly.map((month) => <div key={month.period}><strong>{month.period}</strong><span>{month.paid_sales} satış</span><div className="finance-partner-bar"><i style={{ width: `${Math.max(3, Math.round(month.commission_cents / maxCommission * 100))}%` }} /></div><b>{money(month.gross_cents)}</b><em>{money(month.commission_cents)} komisyon</em></div>)}</div> : <p className="admin-hint">Henüz onaylanmış satış bulunmuyor.</p>}</section>
      <section className="admin-panel"><h2>Organizasyon bazında kazanç</h2>{summary?.organizations.length ? <div className="finance-partner-organizations">{summary.organizations.map((item) => <a href={`/admin/${item.wedding_id}`} key={item.wedding_id}><div><strong>{item.title}</strong><small>{item.customer_name || "Müşteri belirtilmemiş"}{item.wedding_date ? ` · ${item.wedding_date}` : ""}</small></div><span>{item.paid_sales} satış</span><b>{money(item.commission_cents)} komisyon</b></a>)}</div> : <p className="admin-hint">Organizasyon hareketi bulunmuyor.</p>}</section>
    </AdminShell>
  );
}

function OverviewPanel({ data }: { data?: Overview }) {
  return (
    <>
      <section className="partner-stat-grid">
        <article>
          <span>Satış</span>
          <strong>{data?.sales_count || 0}</strong>
        </article>
        <article>
          <span>KDV dahil gelir</span>
          <strong>{money(data?.gross_cents)}</strong>
        </article>
        <article>
          <span>KDV hariç gelir</span>
          <strong>{money(data?.net_cents)}</strong>
        </article>
        <article>
          <span>Partner komisyonu</span>
          <strong>{money(data?.commission_cents)}</strong>
        </article>
        <article>
          <span>Satış maliyeti</span>
          <strong>{money(data?.variable_cost_cents)}</strong>
        </article>
        <article>
          <span>Gerçekleşen gider</span>
          <strong>{money(data?.expense_cents)}</strong>
        </article>
        <article>
          <span>Faaliyet katkısı</span>
          <strong>{money(data?.operating_contribution_cents)}</strong>
        </article>
      </section>
      <section className="admin-panel">
        <p className="admin-hint">Faaliyet katkısı vergi sonrası net kâr değildir. Tahsil edilen KDV, indirilebilir alış KDV’si ve dönemsel gelir/kurumlar vergisi ayrı değerlendirilir.</p>
      </section>
    </>
  );
}

function PackagePanel({ items, canEdit, pending, onSave }: { items: PackageConfiguration[]; canEdit: boolean; pending: boolean; onSave: (code: string, changes: object) => void }) {
  return (
    <section className="finance-card-grid">
      {items.map((item) => (
        <PackageEditor key={`${item.code}:${item.version}`} item={item} disabled={!canEdit || pending} onSave={(changes) => onSave(item.code, changes)} />
      ))}
    </section>
  );
}

function PackageEditor({ item, disabled, onSave }: { item: PackageConfiguration; disabled: boolean; onSave: (changes: object) => void }) {
  const [form, setForm] = useState({
    name: item.name,
    description: item.description,
    price: String(item.grossPriceCents / 100),
    vat: String(item.vat_rate_bps / 100),
    mini: String(item.miniQrCount),
    table: String(item.tableQrCount || 0),
    sign: String(item.welcomeSignCount),
    storage: String((item.hardStorageBytes || 0) / 1024 ** 3),
    retention: String(item.digitalRetentionMonths),
    events: String(item.includedEventCount),
    cost: String(item.variable_cost_cents / 100),
    target: String(item.target_margin_bps / 100),
    active: item.active,
    featured: item.featured,
    invitation: !!item.digitalInvitationIncluded,
  });
  return (
    <form
      className="admin-panel finance-editor"
      onSubmit={(event) => {
        event.preventDefault();
        onSave({
          name: form.name,
          description: form.description,
          grossPriceCents: toCents(form.price),
          vat_rate_bps: toBps(form.vat),
          miniQrCount: Number(form.mini),
          tableQrCount: Number(form.table),
          welcomeSignCount: Number(form.sign),
          hardStorageBytes: Math.round(Number(form.storage) * 1024 ** 3),
          digitalRetentionMonths: Number(form.retention),
          includedEventCount: Number(form.events),
          variable_cost_cents: toCents(form.cost),
          target_margin_bps: toBps(form.target),
          active: form.active,
          featured: form.featured,
          digitalInvitationIncluded: form.invitation,
        });
      }}
    >
      <header>
        <div>
          <span>
            {item.code} · v{item.version}
          </span>
          <h2>{item.name}</h2>
        </div>
      </header>
      <div className="finance-editor-grid">
        <Labeled label="Paket adı">
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </Labeled>
        <Labeled label="KDV dahil fiyat (TL)">
          <input inputMode="decimal" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
        </Labeled>
        <Labeled label="KDV (%)">
          <input inputMode="decimal" value={form.vat} onChange={(e) => setForm({ ...form, vat: e.target.value })} />
        </Labeled>
        <Labeled label="Dijital maliyet (TL)">
          <input inputMode="decimal" value={form.cost} onChange={(e) => setForm({ ...form, cost: e.target.value })} />
        </Labeled>
        <Labeled label="Hedef marj (%)">
          <input inputMode="decimal" value={form.target} onChange={(e) => setForm({ ...form, target: e.target.value })} />
        </Labeled>
        <Labeled label="Mini QR dahil">
          <input type="number" min="0" value={form.mini} onChange={(e) => setForm({ ...form, mini: e.target.value })} />
        </Labeled>
        <Labeled label="Masa QR dahil">
          <input type="number" min="0" value={form.table} onChange={(e) => setForm({ ...form, table: e.target.value })} />
        </Labeled>
        <Labeled label="Karşılama tabelası">
          <input type="number" min="0" value={form.sign} onChange={(e) => setForm({ ...form, sign: e.target.value })} />
        </Labeled>
        <Labeled label="Depolama (GB)">
          <input type="number" min="0" value={form.storage} onChange={(e) => setForm({ ...form, storage: e.target.value })} />
        </Labeled>
        <Labeled label="Saklama (ay)">
          <input type="number" min="1" value={form.retention} onChange={(e) => setForm({ ...form, retention: e.target.value })} />
        </Labeled>
        <Labeled label="Organizasyon hakkı">
          <input type="number" min="1" value={form.events} onChange={(e) => setForm({ ...form, events: e.target.value })} />
        </Labeled>
      </div>
      <Labeled label="Açıklama">
        <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
      </Labeled>
      <div className="finance-check-row">
        <label>
          <input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} /> Aktif
        </label>
        <label>
          <input type="checkbox" checked={form.featured} onChange={(e) => setForm({ ...form, featured: e.target.checked })} /> Öne çıkan
        </label>
        <label>
          <input type="checkbox" checked={form.invitation} onChange={(e) => setForm({ ...form, invitation: e.target.checked })} /> Dijital davetiye
        </label>
      </div>
      <button className="admin-button primary" disabled={disabled}>
        Yeni versiyonu kaydet
      </button>
    </form>
  );
}

function PhotographerPackageEditor({ item, disabled, onSave }: { item: PhotographerPackageConfiguration; disabled: boolean; onSave: (changes: object) => void }) {
  const [form, setForm] = useState({
    name: item.name,
    description: item.description,
    price: String(item.grossPriceCents / 100),
    vat: String(item.vatRateBps / 100),
    retention: String(item.digitalRetentionMonths),
    photographer: String(item.photographerGrossCents / 100),
    partner: String(item.originatingPartnerGrossCents / 100),
    platform: String(item.platformGrossCents / 100),
    active: item.active,
  });
  const allocatedCents = toCents(form.photographer) + toCents(form.partner) + toCents(form.platform);
  const priceCents = toCents(form.price);
  return (
    <section className="admin-panel finance-editor">
      <header>
        <div>
          <span>BAĞIMSIZ HİZMET · v{item.version}</span>
          <h2>Fotoğrafçı paketi</h2>
        </div>
      </header>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          onSave({
            name: form.name,
            description: form.description,
            grossPriceCents: priceCents,
            vatRateBps: toBps(form.vat),
            digitalRetentionMonths: Number(form.retention),
            photographerGrossCents: toCents(form.photographer),
            originatingPartnerGrossCents: toCents(form.partner),
            platformGrossCents: toCents(form.platform),
            active: form.active,
          });
        }}
      >
        <div className="finance-editor-grid">
          <Labeled label="Paket adı">
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </Labeled>
          <Labeled label="KDV dahil fiyat (TL)">
            <input inputMode="decimal" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
          </Labeled>
          <Labeled label="KDV (%)">
            <input inputMode="decimal" value={form.vat} onChange={(e) => setForm({ ...form, vat: e.target.value })} />
          </Labeled>
          <Labeled label="Saklama (ay)">
            <input type="number" min="1" value={form.retention} onChange={(e) => setForm({ ...form, retention: e.target.value })} />
          </Labeled>
          <Labeled label="Fotoğrafçı payı (TL)">
            <input inputMode="decimal" value={form.photographer} onChange={(e) => setForm({ ...form, photographer: e.target.value })} />
          </Labeled>
          <Labeled label="Kaynak işletme payı (TL)">
            <input inputMode="decimal" value={form.partner} onChange={(e) => setForm({ ...form, partner: e.target.value })} />
          </Labeled>
          <Labeled label="Platform payı (TL)">
            <input inputMode="decimal" value={form.platform} onChange={(e) => setForm({ ...form, platform: e.target.value })} />
          </Labeled>
        </div>
        <Labeled label="Açıklama">
          <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </Labeled>
        <div className="finance-check-row">
          <label>
            <input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} /> Aktif
          </label>
          <span className={allocatedCents === priceCents ? "" : "admin-error"}>Paylar toplamı: {money(allocatedCents)}</span>
        </div>
        <button className="admin-button primary" disabled={disabled || allocatedCents !== priceCents}>
          Yeni versiyonu kaydet
        </button>
      </form>
    </section>
  );
}

function ProductPanel({ qr = false, items, packages, canEdit, onCreate, onUpdate, onDelete }: { qr?: boolean; items: AddOnProduct[]; packages: PackageConfiguration[]; canEdit: boolean; onCreate: (body: object) => void; onUpdate: (id: string, changes: object) => void; onDelete: (id: string) => void }) {
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [percentage, setPercentage] = useState("10");
  const [cost, setCost] = useState("");
  const [vat, setVat] = useState("20");
  const [quantity, setQuantity] = useState("1");
  const [image, setImage] = useState("");
  const [format, setFormat] = useState<"vertical_mini" | "table_card">("vertical_mini");
  const [category, setCategory] = useState<NonNullable<AddOnProduct["category"]>>(qr ? "qr_print" : "digital");
  const [effectType, setEffectType] = useState<NonNullable<AddOnProduct["effect_type"]>>(qr ? "print_quantity" : "custom_design");
  const [effectValue, setEffectValue] = useState(1);
  const [unit, setUnit] = useState<NonNullable<AddOnProduct["unit"]>>(qr ? "item" : "service");
  const [pricingType, setPricingType] = useState<NonNullable<AddOnProduct["pricing_type"]>>("fixed");
  const isWelcomeSign = qr && effectType === "welcome_sign";
  const submit = (event: FormEvent) => {
    event.preventDefault();
    onCreate({
      code: code.trim().toUpperCase() || `${qr ? "QR" : "EXTRA"}_${Date.now()}`,
      name,
      description,
      gross_price_cents: pricingType === "fixed" ? toCents(price) : 0,
      percentage_bps: pricingType === "package_percentage_discount" ? toBps(percentage) : undefined,
      unit_cost_cents: toCents(cost || "0"),
      vat_rate_bps: toBps(vat),
      quantity: Number(quantity),
      eligible_package_codes: packages.map((item) => item.code),
      image_url: image || undefined,
      commissionable: true,
      category: qr ? (isWelcomeSign ? "design" : "qr_print") : category,
      unit: qr ? "item" : unit,
      effect_type: effectType,
      effect_value: qr ? 1 : effectValue,
      print_format: qr && !isWelcomeSign ? format : undefined,
      pricing_type: qr ? "fixed" : pricingType,
      active: true,
    });
    setCode("");
    setName("");
    setDescription("");
    setPrice("");
    setCost("");
    setQuantity("1");
  };
  const selectEffect = (next: NonNullable<AddOnProduct["effect_type"]>) => {
    setEffectType(next);
    setEffectValue(effectOptions[next][0]);
    setUnit(unitForEffect[next]);
    setPricingType(next === "second_event" ? "package_percentage_discount" : "fixed");
  };
  return (
    <>
      <section className="admin-panel">
        <header>
          <div>
            <span>{qr ? "QR VE TABELA ÜRÜNÜ" : "EKSTRA ÜRÜN"}</span>
            <h2>Yeni ürün</h2>
            <p>Ürün kataloğunun tek yönetim noktası burasıdır.</p>
          </div>
        </header>
        <form onSubmit={submit}>
          <div className="finance-editor-grid">
            <Labeled label="Ürün kodu">
              <input value={code} onChange={(e) => setCode(e.target.value)} placeholder={qr ? "QR-BIRIM" : "EXTRA-DESIGN"} />
            </Labeled>
            <Labeled label="Ürün adı">
              <input required value={name} onChange={(e) => setName(e.target.value)} />
            </Labeled>
            {qr ? (
              <Labeled label="Ürün türü">
                <select value={effectType} onChange={(e) => selectEffect(e.target.value as typeof effectType)}>
                  <option value="print_quantity">QR kart</option>
                  <option value="welcome_sign">Karşılama tabelası</option>
                </select>
              </Labeled>
            ) : (
              <>
                <Labeled label="Kategori">
                  <select value={category} onChange={(e) => setCategory(e.target.value as typeof category)}>
                    <option value="storage_retention">Depolama ve saklama</option>
                    <option value="digital">Dijital hizmet</option>
                    <option value="design">Tasarım</option>
                    <option value="organization">Organizasyon</option>
                  </select>
                </Labeled>
                <Labeled label="Hak / etki">
                  <select value={effectType} onChange={(e) => selectEffect(e.target.value as typeof effectType)}>
                    <option value="welcome_sign">Karşılama tabelası</option>
                    <option value="storage_gib">Ek depolama</option>
                    <option value="retention_months">İlave saklama</option>
                    <option value="digital_invitation">Dijital davetiye</option>
                    <option value="custom_design">Özel tasarım</option>
                    <option value="second_event">İkinci organizasyon</option>
                  </select>
                </Labeled>
                <Labeled label="Hak miktarı">
                  <select value={effectValue} onChange={(e) => setEffectValue(Number(e.target.value))}>
                    {effectOptions[effectType].map((value) => (
                      <option key={value} value={value}>
                        {value}
                      </option>
                    ))}
                  </select>
                </Labeled>
                <Labeled label="Birim">
                  <select value={unit} onChange={(e) => setUnit(e.target.value as typeof unit)}>
                    <option value="item">Adet</option>
                    <option value="gib">GB</option>
                    <option value="month">Ay</option>
                    <option value="service">Hizmet</option>
                    <option value="organization">Organizasyon</option>
                  </select>
                </Labeled>
                <Labeled label="Fiyat türü">
                  <select value={pricingType} disabled={effectType === "second_event"} onChange={(e) => setPricingType(e.target.value as typeof pricingType)}>
                    <option value="fixed">Sabit KDV dahil fiyat</option>
                    {effectType === "second_event" ? <option value="package_percentage_discount">Ana pakete yüzde indirim</option> : null}
                  </select>
                </Labeled>
              </>
            )}
            {pricingType === "fixed" || qr ? (
              <Labeled label="Satış fiyatı (TL)">
                <input required inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} />
              </Labeled>
            ) : (
              <Labeled label="İndirim oranı (%)">
                <input required inputMode="decimal" value={percentage} onChange={(e) => setPercentage(e.target.value)} />
              </Labeled>
            )}
            <Labeled label="Birim maliyet (TL)">
              <input required inputMode="decimal" value={cost} onChange={(e) => setCost(e.target.value)} />
            </Labeled>
            <Labeled label="KDV (%)">
              <input inputMode="decimal" value={vat} onChange={(e) => setVat(e.target.value)} />
            </Labeled>
            <Labeled label="Adet">
              <input required type="number" min="1" max="10000" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
            </Labeled>
            {qr && !isWelcomeSign ? (
              <Labeled label="QR türü">
                <select value={format} onChange={(e) => setFormat(e.target.value as typeof format)}>
                  <option value="vertical_mini">Mini QR</option>
                  <option value="table_card">Masa QR</option>
                </select>
              </Labeled>
            ) : null}
            <Labeled label="Görsel URL">
              <input type="url" value={image} onChange={(e) => setImage(e.target.value)} />
            </Labeled>
          </div>
          <Labeled label="Açıklama / içerik">
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} />
          </Labeled>
          <button className="admin-button primary" disabled={!canEdit}>
            Ürünü kaydet
          </button>
        </form>
      </section>
      <section className="admin-panel detail-list">
        <header>
          <div>
            <span>KATALOG</span>
            <h2>{qr ? "Ekstra QR ve tabela fiyatları" : "Ekstra ürünler"}</h2>
          </div>
        </header>
        {items.map((item) => (
          <ProductRow key={`${item.id}:${item.updated_at}`} item={item} canEdit={canEdit} onUpdate={(changes) => onUpdate(item.id, changes)} onDelete={() => onDelete(item.id)} />
        ))}
        {!items.length ? <div className="admin-empty">Henüz ürün yok.</div> : null}
      </section>
    </>
  );
}

function ProductRow({ item, canEdit, onUpdate, onDelete }: { item: AddOnProduct; canEdit: boolean; onUpdate: (changes: object) => void; onDelete: () => void }) {
  const percentagePricing = item.pricing_type === "package_percentage_discount";
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(item.name);
  const [description, setDescription] = useState(item.description);
  const [code, setCode] = useState(item.code || "");
  const [price, setPrice] = useState(String((percentagePricing ? item.percentage_bps || 0 : item.gross_price_cents) / 100));
  const [cost, setCost] = useState(String((item.unit_cost_cents || 0) / 100));
  const [vat, setVat] = useState(String((item.vat_rate_bps || 2000) / 100));
  const [quantity, setQuantity] = useState(String(item.quantity ?? item.maximum_quantity ?? 1));
  const [format, setFormat] = useState(item.print_format || "vertical_mini");
  const priceChange = percentagePricing ? { percentage_bps: toBps(price) } : { gross_price_cents: toCents(price) };
  const save = () => {
    onUpdate({
      name,
      description,
      ...(code ? { code: code.trim().toUpperCase() } : {}),
      ...priceChange,
      unit_cost_cents: toCents(cost),
      vat_rate_bps: toBps(vat),
      quantity: Number(quantity),
      ...(item.effect_type === "print_quantity" ? { print_format: format } : {}),
    });
    setEditing(false);
  };
  return (
    <div className="finance-product-row">
      <div>
        <strong>
          {item.name} · {item.active ? "Aktif" : "Pasif"}
        </strong>
        <small>
          {item.description} · {percentagePricing ? `${percent(item.percentage_bps)} indirim` : `Satış ${money(item.gross_price_cents)}`} · maliyet {money(item.unit_cost_cents)} · KDV {percent(item.vat_rate_bps)} · Adet {item.quantity ?? item.maximum_quantity ?? 1} · {item.effect_type} / {item.effect_value} {item.unit}
        </small>
      </div>
      {editing ? (
        <div className="finance-editor-grid">
          <Labeled label="Ürün kodu">
            <input value={code} onChange={(e) => setCode(e.target.value)} />
          </Labeled>
          <Labeled label="Ürün adı">
            <input required value={name} onChange={(e) => setName(e.target.value)} />
          </Labeled>
          <Labeled label={percentagePricing ? "İndirim oranı (%)" : "Satış fiyatı (TL)"}>
            <input value={price} onChange={(e) => setPrice(e.target.value)} />
          </Labeled>
          <Labeled label="Birim maliyet (TL)">
            <input value={cost} onChange={(e) => setCost(e.target.value)} />
          </Labeled>
          <Labeled label="KDV (%)">
            <input value={vat} onChange={(e) => setVat(e.target.value)} />
          </Labeled>
          <Labeled label="Adet">
            <input required type="number" min="1" max="10000" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
          </Labeled>
          {item.effect_type === "print_quantity" ? (
            <Labeled label="QR türü">
              <select value={format} onChange={(e) => setFormat(e.target.value as typeof format)}>
                <option value="vertical_mini">Mini QR</option>
                <option value="table_card">Masa QR</option>
              </select>
            </Labeled>
          ) : null}
          <Labeled label="Açıklama">
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} />
          </Labeled>
          <div className="admin-actions">
            <button className="admin-button primary" disabled={!canEdit} onClick={save}>
              Değişiklikleri kaydet
            </button>
            <button className="admin-button" onClick={() => setEditing(false)}>
              Vazgeç
            </button>
          </div>
        </div>
      ) : (
        <div className="finance-inline-fields">
          <button className="admin-button" disabled={!canEdit} onClick={() => setEditing(true)}>
            Düzenle
          </button>
          <button
            className="admin-button danger"
            disabled={!canEdit}
            onClick={() => {
              if (window.confirm(`${item.name} durumu değiştirilsin mi?`)) onUpdate({ active: !item.active });
            }}
          >
            {item.active ? "Pasife al" : "Aktifleştir"}
          </button>
          <button
            className="admin-button danger"
            disabled={!canEdit}
            onClick={() => {
              if (window.confirm(`${item.name} veritabanından kalıcı olarak silinsin mi? Geçmiş satış kayıtları korunur.`)) onDelete();
            }}
          >
            Sil
          </button>
        </div>
      )}
    </div>
  );
}

function CommissionPanel({ items, canEdit, onSave }: { items: PartnerRow[]; canEdit: boolean; onSave: (body: object) => void }) {
  return (
    <section className="admin-panel detail-list">
      <header>
        <div>
          <span>EUROPE/ISTANBUL · TAKVİM AYI</span>
          <h2>İşletmeye özel komisyonlar</h2>
        </div>
      </header>
      {items.map((item) => (
        <CommissionRow key={item.id} item={item} canEdit={canEdit} onSave={onSave} />
      ))}
    </section>
  );
}
function CommissionRow({ item, canEdit, onSave }: { item: PartnerRow; canEdit: boolean; onSave: (body: object) => void }) {
  const [base, setBase] = useState(String((item.policy?.base_rate_bps || 3000) / 100));
  const [high, setHigh] = useState(String((item.policy?.elevated_rate_bps || 4000) / 100));
  const [threshold, setThreshold] = useState(String(item.policy?.threshold || 10));
  const [tiered, setTiered] = useState(item.policy?.tiered ?? true);
  return (
    <div className="finance-product-row">
      <div>
        <strong>{item.name}</strong>
        <small>
          {item.period} · {item.monthly_valid_sales} geçerli satış · {Number(threshold) + 1}. satış hedef sonrası oran
        </small>
      </div>
      <div className="finance-inline-fields">
        <input aria-label="Başlangıç oranı" value={base} onChange={(e) => setBase(e.target.value)} />
        <input aria-label="Hedef satış" type="number" min="1" value={threshold} onChange={(e) => setThreshold(e.target.value)} />
        <input aria-label="Hedef sonrası oran" value={high} onChange={(e) => setHigh(e.target.value)} />
        <label>
          <input type="checkbox" checked={tiered} onChange={(e) => setTiered(e.target.checked)} /> Kademeli
        </label>
        <button
          className="admin-button"
          disabled={!canEdit}
          onClick={() =>
            onSave({
              partner_id: item.id,
              base_rate_bps: toBps(base),
              threshold: Number(threshold),
              elevated_rate_bps: toBps(high),
              tiered,
              qualifying_package_codes: item.policy?.qualifying_package_codes || ["plan-2", "plan-3"],
              effective_from: new Date().toISOString(),
            })
          }
        >
          Yeni politikayı kaydet
        </button>
      </div>
    </div>
  );
}

function TaxPanel({ value, canEdit, onSave }: { value: TaxConfiguration | null; canEdit: boolean; onSave: (body: object) => void }) {
  const [defaultVat, setDefaultVat] = useState(String((value?.default_vat_rate_bps || 2000) / 100));
  const [carried, setCarried] = useState(String((value?.carried_vat_cents || 0) / 100));
  const [category, setCategory] = useState("");
  const [categoryRate, setCategoryRate] = useState("20");
  const [rates, setRates] = useState<Record<string, number>>(value?.category_vat_rate_bps || {});
  return (
    <section className="admin-panel">
      <header>
        <div>
          <span>VERGİ YAPILANDIRMASI</span>
          <h2>Kategori bazlı KDV</h2>
        </div>
      </header>
      <div className="finance-editor-grid">
        <Labeled label="Varsayılan KDV (%)">
          <input value={defaultVat} onChange={(e) => setDefaultVat(e.target.value)} />
        </Labeled>
        <Labeled label="Devreden KDV (TL)">
          <input value={carried} onChange={(e) => setCarried(e.target.value)} />
        </Labeled>
        <Labeled label="Kategori">
          <input value={category} onChange={(e) => setCategory(e.target.value)} />
        </Labeled>
        <Labeled label="Kategori KDV (%)">
          <input value={categoryRate} onChange={(e) => setCategoryRate(e.target.value)} />
        </Labeled>
      </div>
      <button
        className="admin-button"
        onClick={() => {
          if (category.trim()) {
            setRates({ ...rates, [category.trim()]: toBps(categoryRate) });
            setCategory("");
          }
        }}
      >
        Kategori ekle
      </button>
      <div className="finance-chip-row">
        {Object.entries(rates).map(([name, rate]) => (
          <button key={name} onClick={() => setRates(Object.fromEntries(Object.entries(rates).filter(([key]) => key !== name)))}>
            {name}: {percent(rate)} ×
          </button>
        ))}
      </div>
      <p className="admin-hint">Gelir/kurumlar vergisi siparişten otomatik düşülmez; dönemsel muhasebe doğrulamasına bırakılır.</p>
      <button
        className="admin-button primary"
        disabled={!canEdit}
        onClick={() =>
          onSave({
            default_vat_rate_bps: toBps(defaultVat),
            category_vat_rate_bps: rates,
            carried_vat_cents: toCents(carried),
            effective_from: new Date().toISOString(),
          })
        }
      >
        Yeni vergi versiyonunu kaydet
      </button>
    </section>
  );
}

function ExpensePanel({ items, canEdit, onCreate, onUpdate, onArchive }: { items: ExpenseRecord[]; canEdit: boolean; onCreate: (body: object) => void; onUpdate: (id: string, changes: object) => void; onArchive: (id: string) => void }) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [amount, setAmount] = useState("");
  const [kind, setKind] = useState<"fixed" | "variable">("fixed");
  const [recurrence, setRecurrence] = useState<"once" | "monthly" | "yearly">("monthly");
  const [status, setStatus] = useState<"planned" | "paid">("planned");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [estimated, setEstimated] = useState(false);
  return (
    <>
      <section className="admin-panel">
        <header>
          <div>
            <span>GİDER</span>
            <h2>Yeni gider</h2>
          </div>
        </header>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            onCreate({
              name,
              category,
              amount_cents: toCents(amount),
              vat_rate_bps: 2000,
              deductible_vat: false,
              kind,
              recurrence,
              payment_status: status,
              payment_date: date,
              estimated,
            });
            setName("");
            setAmount("");
          }}
        >
          <div className="finance-editor-grid">
            <Labeled label="Gider adı">
              <input required value={name} onChange={(e) => setName(e.target.value)} />
            </Labeled>
            <Labeled label="Kategori">
              <input required value={category} onChange={(e) => setCategory(e.target.value)} />
            </Labeled>
            <Labeled label="Tutar (TL)">
              <input required value={amount} onChange={(e) => setAmount(e.target.value)} />
            </Labeled>
            <Labeled label="Tür">
              <select value={kind} onChange={(e) => setKind(e.target.value as typeof kind)}>
                <option value="fixed">Sabit</option>
                <option value="variable">Değişken</option>
              </select>
            </Labeled>
            <Labeled label="Tekrar">
              <select value={recurrence} onChange={(e) => setRecurrence(e.target.value as typeof recurrence)}>
                <option value="once">Tek sefer</option>
                <option value="monthly">Aylık</option>
                <option value="yearly">Yıllık</option>
              </select>
            </Labeled>
            <Labeled label="Durum">
              <select value={status} onChange={(e) => setStatus(e.target.value as typeof status)}>
                <option value="planned">Planlandı</option>
                <option value="paid">Ödendi</option>
              </select>
            </Labeled>
            <Labeled label="Ödeme tarihi">
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </Labeled>
            <label>
              <input type="checkbox" checked={estimated} onChange={(e) => setEstimated(e.target.checked)} /> Tahmini gider
            </label>
          </div>
          <button className="admin-button primary" disabled={!canEdit}>
            Gideri kaydet
          </button>
        </form>
      </section>
      <section className="admin-panel detail-list">
        {items.map((item) => (
          <div className="detail-static-row" key={item.id}>
            <div>
              <strong>
                {item.name} · {money(item.amount_cents)}
              </strong>
              <small>
                {item.category} · {item.kind} · {item.recurrence} · {item.estimated ? "tahmini" : "gerçekleşen"}
              </small>
            </div>
            <div className="admin-actions">
              <button
                className="admin-button"
                disabled={!canEdit}
                onClick={() =>
                  onUpdate(item.id, {
                    payment_status: item.payment_status === "paid" ? "planned" : "paid",
                  })
                }
              >
                {item.payment_status === "paid" ? "Planlandı yap" : "Ödendi yap"}
              </button>
              <button
                className="admin-button danger"
                disabled={!canEdit}
                onClick={() => {
                  if (window.confirm("Gider arşivlensin mi?")) onArchive(item.id);
                }}
              >
                Arşivle
              </button>
            </div>
          </div>
        ))}
      </section>
    </>
  );
}

function ProfitPanel({ data }: { data?: ProfitResponse }) {
  return (
    <>
      <section className="partner-stat-grid">
        <article>
          <span>Aylık sabit gider</span>
          <strong>{money(data?.monthly_fixed_cents)}</strong>
        </article>
        <article>
          <span>Ağırlıklı katkı</span>
          <strong>{money(data?.weighted_contribution_cents)}</strong>
        </article>
        <article>
          <span>Aylık başa baş adedi</span>
          <strong>{data?.monthly_break_even_units ?? "Ulaşılamıyor"}</strong>
        </article>
      </section>
      {!data?.payment_cost_assumption.configured ? <div className="admin-notice">Ödeme sağlayıcısı seçilmediği için işlem maliyeti varsayımı %0’dır; sağlayıcı seçilmeden production kârlılık kararı vermeyin.</div> : null}
      <section className="admin-panel detail-list">
        {data?.packages.map((item) => (
          <div className="detail-static-row" key={item.code}>
            <div>
              <strong>
                {item.name} · katkı {money(item.contribution_cents)} · marj {percent(item.contribution_margin_bps)}
              </strong>
              <small>
                Satış {money(item.grossPriceCents)} · maliyet {money(item.variable_cost_cents)} · komisyon {percent(item.commission_rate_bps)} · başa baş {item.break_even_gross_cents == null ? "hesaplanamıyor" : money(item.break_even_gross_cents)} · hedef fiyat {item.target_gross_cents == null ? "hesaplanamıyor" : money(item.target_gross_cents)}
              </small>
              {item.calculation_warning ? <small>{item.calculation_warning}</small> : null}
            </div>
            <span>{item.contribution_cents < 0 ? "Zarar" : item.contribution_margin_bps < item.target_margin_bps ? "Hedef altı" : "Hedefte"}</span>
          </div>
        ))}
      </section>
    </>
  );
}

function HistoryPanel({ items }: { items: HistoryRow[] }) {
  return (
    <section className="admin-panel detail-list">
      <header>
        <div>
          <span>AUDIT</span>
          <h2>Fiyat ve komisyon değişiklik geçmişi</h2>
        </div>
      </header>
      {items.map((item) => (
        <details className="finance-history-row" key={item.id}>
          <summary>
            <strong>
              {item.entity_type} · {item.entity_id}
            </strong>
            <span>
              {new Date(item.changed_at).toLocaleString("tr-TR")} · {item.changed_fields.join(", ")}
            </span>
          </summary>
          <div className="finance-history-values">
            <pre>{JSON.stringify(item.previous, null, 2)}</pre>
            <pre>{JSON.stringify(item.next, null, 2)}</pre>
          </div>
        </details>
      ))}
      {!items.length ? <div className="admin-empty">Henüz değişiklik kaydı yok.</div> : null}
    </section>
  );
}
