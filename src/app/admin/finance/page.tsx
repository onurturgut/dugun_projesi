"use client";

import { FormEvent, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AdminShell } from "@/components/admin/AdminShell";
import { Field, Notice, TextField } from "@/components/admin/Fields";
import { api, type Account } from "@/lib/api";
import type { AddOnProduct, SaleRecord } from "@/lib/models";

const money = (cents: number) => new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" }).format(cents / 100);
type SalesResponse = { items: SaleRecord[]; totals: { paid_sales: number; gross_cents: number; net_cents: number; commission_cents: number; platform_cents: number } };

export default function FinancePage() {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [commissionable, setCommissionable] = useState(true);
  const me = useQuery({ queryKey: ["me"], queryFn: () => api<Account>("/auth/me") });
  const sales = useQuery({ queryKey: ["sales"], queryFn: () => api<SalesResponse>("/admin/sales"), enabled: !!me.data });
  const addOns = useQuery({ queryKey: ["add-ons"], queryFn: () => api<AddOnProduct[]>("/admin/add-ons"), enabled: !!me.data });
  const createProduct = useMutation({
    mutationFn: (payload: object) => api<AddOnProduct>("/admin/add-ons", { method: "POST", body: JSON.stringify(payload) }),
    onSuccess: () => { setName(""); setDescription(""); setPrice(""); queryClient.invalidateQueries({ queryKey: ["add-ons"] }); },
  });
  const updateProduct = useMutation({
    mutationFn: ({ id, changes }: { id: string; changes: object }) => api<AddOnProduct>(`/admin/add-ons/${id}`, { method: "PATCH", body: JSON.stringify(changes) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["add-ons"] }),
  });
  function submit(event: FormEvent) {
    event.preventDefault();
    const grossPriceCents = Math.round(Number(price.trim().replace(",", ".")) * 100);
    if (!name.trim() || !Number.isInteger(grossPriceCents) || grossPriceCents < 0) return;
    createProduct.mutate({ name: name.trim(), description: description.trim(), gross_price_cents: grossPriceCents, commissionable, active: true });
  }
  return <AdminShell>
    <div className="admin-heading"><div><p className="admin-kicker">FİNANS</p><h1>Satış ve komisyonlar</h1><p className="admin-subtitle">Müşteri fiyatları KDV dahildir; komisyon KDV hariç matrah üzerinden hesaplanır.</p></div></div>
    {sales.error ? <Notice>{sales.error.message}</Notice> : null}
    <section className="partner-stat-grid">
      <article><span>Aktif satış</span><strong>{sales.data?.totals.paid_sales || 0}</strong></article><article><span>KDV dahil tahsilat</span><strong>{money(sales.data?.totals.gross_cents || 0)}</strong></article><article><span>KDV hariç matrah</span><strong>{money(sales.data?.totals.net_cents || 0)}</strong></article><article><span>Partner komisyonu</span><strong>{money(sales.data?.totals.commission_cents || 0)}</strong></article><article><span>ShineQR payı</span><strong>{money(sales.data?.totals.platform_cents || 0)}</strong></article>
    </section>
    <section className="admin-panel detail-list"><header><div><span>HAREKETLER</span><h2>Satış defteri</h2></div></header>
      {sales.data?.items.map((sale) => <div className="detail-static-row" key={sale.id}><div><strong>{sale.package_code.toUpperCase()} · {money(sale.gross_cents)} KDV dahil</strong><small>{sale.price_snapshot?.add_ons.length ? `${sale.price_snapshot.add_ons.map((item) => `${item.name} × ${item.quantity}`).join(", ")} · ` : ""}{sale.period} · {sale.qualifying_ordinal ? `${sale.qualifying_ordinal}. uygun satış` : "Sabit %30"}</small></div><span>{sale.status === "refunded" ? "İade" : `%${sale.commission_rate_bps / 100} · ${money(sale.commission_cents)}`}</span></div>)}
      {sales.data && sales.data.items.length === 0 ? <div className="admin-empty"><p>Henüz finans kaydı yok.</p></div> : null}
    </section>
    <section className="admin-panel detail-list finance-add-ons"><header><div><span>DİNAMİK FİYAT</span><h2>Ek ürün kataloğu</h2><p>Fiyat KDV dahil girilir. Pasife alınan ürün yeni satışlarda seçilemez; eski satış kayıtları değişmez.</p></div></header>
      {addOns.error ? <Notice>{addOns.error.message}</Notice> : null}
      {me.data?.role === "platform" ? <form className="finance-add-on-form" onSubmit={submit}><Field label="Ürün adı" value={name} onChange={(event) => setName(event.target.value)} required maxLength={120} /><Field label="KDV dahil fiyat (TL)" value={price} onChange={(event) => setPrice(event.target.value)} inputMode="decimal" placeholder="500,00" required /><TextField label="Açıklama" value={description} onChange={(event) => setDescription(event.target.value)} maxLength={500} /><label className="finance-check"><input type="checkbox" checked={commissionable} onChange={(event) => setCommissionable(event.target.checked)} /><span>Partner komisyonuna dahil</span></label><button className="admin-button primary" disabled={createProduct.isPending}>{createProduct.isPending ? "Ekleniyor…" : "Ek ürünü ekle"}</button></form> : null}
      {createProduct.error ? <Notice>{createProduct.error.message}</Notice> : null}
      {addOns.data?.map((product) => <div className="detail-static-row" key={product.id}><div><strong>{product.name} · {money(product.gross_price_cents)}</strong><small>{product.description || "Açıklama yok"} · {product.commissionable ? "Komisyona dahil" : "Komisyona dahil değil"}</small></div>{me.data?.role === "platform" ? <button className="admin-button" disabled={updateProduct.isPending} onClick={() => updateProduct.mutate({ id: product.id, changes: { active: !product.active } })}>{product.active ? "Satıştan kaldır" : "Satışa aç"}</button> : <span>{product.active ? "Aktif" : "Pasif"}</span>}</div>)}
      {addOns.data && !addOns.data.length ? <div className="admin-empty"><p>Henüz ek ürün tanımlanmadı.</p></div> : null}
    </section>
  </AdminShell>;
}
