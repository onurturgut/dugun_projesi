"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { BookOpenText, ChevronDown, Search } from "lucide-react";
import { AdminShell } from "@/components/admin/AdminShell";
import { Notice } from "@/components/admin/Fields";
import { api } from "@/lib/api";
import type { CustomerCurrentAccount } from "@/lib/current-accounts";

type Response = { items: CustomerCurrentAccount[]; summary: { customers: number; sales_cents: number; paid_cents: number; refunded_cents: number; balance_cents: number } };
const money = (cents: number) => new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" }).format(cents / 100);
const date = (value: string) => new Date(value).toLocaleString("tr-TR", { timeZone: "Europe/Istanbul", dateStyle: "medium", timeStyle: "short" });

export default function CurrentAccountsPage() {
  const [search, setSearch] = useState("");
  const accounts = useQuery({ queryKey: ["current-accounts"], queryFn: () => api<Response>("/admin/current-accounts") });
  const rows = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("tr");
    return !query ? accounts.data?.items || [] : (accounts.data?.items || []).filter((item) => [item.customer_name, item.customer_email, item.customer_phone].some((value) => value.toLocaleLowerCase("tr").includes(query)));
  }, [accounts.data, search]);
  return <AdminShell>
    <div className="admin-heading"><div><p className="admin-kicker">ÖN MUHASEBE</p><h1>Müşteri cari hesapları</h1><p className="admin-subtitle">Satış, doğrulanmış tahsilat ve iadelerden türetilen müşteri bakiyeleri.</p></div><Link className="admin-button" href="/admin/finance">Satış defterini aç</Link></div>
    {accounts.error ? <Notice>{accounts.error.message}</Notice> : null}
    {accounts.data ? <section className="current-account-summary">
      <article><span>Müşteri</span><strong>{accounts.data.summary.customers}</strong></article>
      <article><span>Toplam satış</span><strong>{money(accounts.data.summary.sales_cents)}</strong></article>
      <article><span>Doğrulanmış tahsilat</span><strong>{money(accounts.data.summary.paid_cents)}</strong></article>
      <article><span>İade</span><strong>{money(accounts.data.summary.refunded_cents)}</strong></article>
      <article className={accounts.data.summary.balance_cents ? "warning" : ""}><span>Açık bakiye</span><strong>{money(accounts.data.summary.balance_cents)}</strong></article>
    </section> : null}
    <div className="admin-toolbar"><label className="admin-search"><Search size={16}/><input aria-label="Cari hesap ara" placeholder="Müşteri, e-posta veya telefon ara…" value={search} onChange={(event) => setSearch(event.target.value)}/></label></div>
    <div className="current-account-list">{accounts.isLoading ? <div className="admin-empty">Cari hesaplar hazırlanıyor…</div> : rows.map((account) => <details key={account.id} className="admin-panel current-account-card"><summary><div><strong>{account.customer_name}</strong><small>{account.customer_email || account.customer_phone || "İletişim bilgisi yok"}</small></div><div><span>Açık bakiye</span><b>{money(account.balance_cents)}</b></div><ChevronDown size={18}/></summary><div className="current-account-body"><div className="current-account-totals"><span>Satış <b>{money(account.total_sales_cents)}</b></span><span>Tahsilat <b>{money(account.total_paid_cents)}</b></span><span>İade <b>{money(account.total_refunded_cents)}</b></span></div><div className="current-account-entries"><div className="current-account-entry head"><span>Tarih</span><span>İşlem</span><span>Borç</span><span>Alacak</span></div>{account.entries.map((entry) => <div className="current-account-entry" key={entry.id}><time>{date(entry.occurred_at)}</time><span><Link href={`/admin/${entry.wedding_id}`}>{entry.description}</Link><small>{entry.type === "sale" ? "Satış" : entry.type === "payment" ? "Tahsilat" : "İade / ters etki"}</small></span><b>{entry.debit_cents ? money(entry.debit_cents) : "—"}</b><b>{entry.credit_cents ? money(entry.credit_cents) : "—"}</b></div>)}</div></div></details>)}</div>
    <p className="admin-hint mt-6"><BookOpenText size={15}/> Bu ekran mevcut tam ödeme kayıtlarından türetilir. Kısmi tahsilat için ayrı ödeme defteri sonraki aşamada eklenmelidir.</p>
  </AdminShell>;
}
