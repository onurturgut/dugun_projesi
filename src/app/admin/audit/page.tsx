"use client";
import { useDeferredValue, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, FileClock, Search, SlidersHorizontal } from "lucide-react";
import { AdminShell } from "@/components/admin/AdminShell";
import { Notice } from "@/components/admin/Fields";
import { SelectField } from "@/components/admin/SelectField";
import { DateField } from "@/components/admin/DateField";
import { api } from "@/lib/api";

type AuditRow = { at: string; action: string; actor_id: string | null; actor_role: string | null; ip: string | null; target: Record<string, unknown> };
const actionLabels: Record<string, string> = {
  "auth.login": "Oturum açıldı", "auth.logout": "Oturum kapatıldı", "auth.password_changed": "Parola değiştirildi",
  "auth.session_revoked": "Oturum sonlandırıldı", "partner.created": "İşletme oluşturuldu", "partner.updated": "İşletme güncellendi",
  "account.created": "Hesap oluşturuldu", "account.updated": "Hesap güncellendi", "wedding.created": "Organizasyon oluşturuldu",
  "account.password_reset": "Hesap parolası sıfırlandı", "operation.retried": "Operasyon yeniden denendi",
  "wedding.bulk_archive": "Organizasyonlar toplu arşivlendi", "wedding.bulk_restore": "Organizasyonlar arşivden çıkarıldı",
  "wedding.updated": "Organizasyon güncellendi", "wedding.published": "Organizasyon yayınlandı", "wedding.design_saved": "Tasarım kaydedildi",
  "wedding.design_revision_requested": "Tasarım revizyonu istendi", "wedding.design_approved_for_print": "Tasarım baskı için onaylandı",
  "wedding.submitted": "Organizasyon onaya gönderildi", "wedding.approved": "Organizasyon onaylandı",
  "wedding.changes_requested": "Organizasyon için düzeltme istendi", "wedding.rejected": "Organizasyon reddedildi",
  "sale.recorded": "Tahsil edilmiş satış kaydedildi", "sale.refunded": "Satış iade edildi",
  "add_on.created": "Ek ürün oluşturuldu", "add_on.updated": "Ek ürün güncellendi",
  "agent_report.created": "Agent raporu oluşturuldu", "agent_report.reviewed": "Agent raporu incelendi",
  "account.preview_started": "Salt okunur hesap görünümü başlatıldı",
  "account.preview_stopped": "Salt okunur hesap görünümü sonlandırıldı",
};
function readableTarget(target: Record<string, unknown>) {
  const parts = ["partner_id", "wedding_id", "user_id", "snapshot_id"].filter((key) => target[key]).map((key) => `${key.replace("_id", "")}: ${String(target[key])}`);
  return parts.length ? parts.join(" · ") : "Genel sistem işlemi";
}

export default function AuditPage() {
  const [page, setPage] = useState(1), [search, setSearch] = useState(""), [action, setAction] = useState("all"), [role, setRole] = useState("all"), [from, setFrom] = useState(""), [to, setTo] = useState(""), [expanded, setExpanded] = useState<string | null>(null);
  const deferredSearch = useDeferredValue(search.trim());
  const logs = useQuery({ queryKey: ["audit", page, deferredSearch, action, role, from, to], queryFn: () => { const params = new URLSearchParams({ page: String(page) }); if (deferredSearch) params.set("search", deferredSearch); if (action !== "all") params.set("action", action); if (role !== "all") params.set("role", role); if (from) params.set("from", from); if (to) params.set("to", to); return api<{ items: AuditRow[]; total: number; pages: number }>(`/admin/audit?${params}`); } });
  const rows = logs.data?.items || [];
  return (
    <AdminShell>
      <div className="admin-heading audit-heading"><div><p className="admin-kicker">GÜVENLİK</p><h1>İşlem kayıtları</h1><p className="admin-subtitle">Kritik hesap ve yönetim hareketlerini izleyin.</p></div><div className="audit-total"><FileClock size={18} /><span><strong>{logs.data?.total ?? "—"}</strong> toplam kayıt</span></div></div>
      <section className="admin-filter-bar" aria-label="İşlem kaydı filtreleri">
        <label className="admin-search audit-search"><Search size={17} aria-hidden="true" /><span className="sr-only">Bu sayfada ara</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Kullanıcı, işlem veya IP ara" /></label>
        <div className="audit-filter-select"><SlidersHorizontal size={16} aria-hidden="true" /><SelectField value={action} onValueChange={(value) => { setAction(value); setPage(1); }} aria-label="İşlem türü"><option value="all">Tüm işlemler</option>{Object.keys(actionLabels).map((item) => <option key={item} value={item}>{actionLabels[item]}</option>)}</SelectField></div>
        <div className="audit-filter-select"><SelectField value={role} onValueChange={(value) => { setRole(value); setPage(1); }} aria-label="Kullanıcı rolü"><option value="all">Tüm roller</option><option value="platform">Platform</option><option value="partner">İşletme</option><option value="owner">Müşteri</option></SelectField></div>
        <DateField value={from} onValueChange={(value) => { setFrom(value); setPage(1); }} label="Başlangıç tarihi" />
        <DateField value={to} onValueChange={(value) => { setTo(value); setPage(1); }} label="Bitiş tarihi" />
      </section>
      {logs.error ? <Notice>{logs.error.message}</Notice> : null}
      <section className="audit-table-shell" aria-busy={logs.isLoading}>
        <div className="audit-table-head" aria-hidden="true"><span>İşlem</span><span>Kullanıcı</span><span>Hedef</span><span>Tarih</span><span></span></div>
        {logs.isLoading ? <div className="admin-empty">İşlem kayıtları yükleniyor…</div> : null}
        {!logs.isLoading && rows.length === 0 ? <div className="admin-empty"><h2>Sonuç bulunamadı</h2><p>Arama veya filtre seçiminizi değiştirin.</p></div> : null}
        {rows.map((row, index) => { const id = `${row.at}-${index}`, isOpen = expanded === id; return <article className="audit-row" key={id}>
          <div className="audit-row-main">
            <div className="audit-action"><span className={`audit-dot ${row.action.startsWith("auth.") ? "security" : "change"}`} /><div><strong>{actionLabels[row.action] || row.action}</strong><small>{row.action}</small></div></div>
            <div><strong>{row.actor_role || "Sistem"}</strong><small>{row.actor_id || "Otomatik işlem"}<br />{row.ip || "IP kaydı yok"}</small></div>
            <div className="audit-target">{readableTarget(row.target)}</div>
            <time dateTime={row.at}>{new Date(row.at).toLocaleDateString("tr-TR")}<small>{new Date(row.at).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}</small></time>
            <button type="button" className="audit-detail-button" aria-expanded={isOpen} onClick={() => setExpanded(isOpen ? null : id)}>{isOpen ? "Kapat" : "Detay"}</button>
          </div>{isOpen ? <div className="audit-technical"><span>Teknik detay</span><pre>{JSON.stringify(row.target, null, 2)}</pre></div> : null}
        </article>; })}
      </section>
      {logs.data && logs.data.pages > 1 ? <nav className="admin-pagination" aria-label="İşlem kayıtları sayfaları"><button className="admin-button" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}><ChevronLeft size={16} /> Önceki</button><span><strong>{page}</strong> / {logs.data.pages}</span><button className="admin-button" disabled={page >= logs.data.pages} onClick={() => setPage((value) => value + 1)}>Sonraki <ChevronRight size={16} /></button></nav> : null}
    </AdminShell>
  );
}
