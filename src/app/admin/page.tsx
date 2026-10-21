"use client";
import { DateField } from "@/components/admin/DateField";
import { SelectField } from "@/components/admin/SelectField";
import Link from "next/link";
import Image from "next/image";
import { useDeferredValue, useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Search, ArrowUpRight, ShieldCheck, BookmarkPlus, Archive, RotateCcw, XCircle, ReceiptText } from "lucide-react";
import { api, type Wedding, type Account } from "@/lib/api";
import { uploadsOpen, expired } from "@/lib/policy";
import { formatBytes } from "@/lib/config";
import { AdminShell } from "@/components/admin/AdminShell";
import { EventWizard } from "@/components/admin/EventWizard";
import { Notice } from "@/components/admin/Fields";
const stateOf = (w: Wedding) =>
  w.lifecycle_status === "draft" && w.approval_status === "submitted" ? "submitted" :
  w.lifecycle_status === "draft" && w.approval_status === "changes_requested" ? "changes_requested" :
  w.lifecycle_status === "draft" && w.approval_status === "rejected" ? "rejected" :
  w.lifecycle_status === "draft" || w.lifecycle_status === "archived" || w.lifecycle_status === "upcoming"
    ? w.lifecycle_status
    : expired(w) ? "expired" : uploadsOpen(w) ? "open" : "closed";
const labels: Record<string, string> = {
  draft: "Taslak",
  submitted: "Onay bekliyor",
  changes_requested: "Düzeltme istendi",
  rejected: "Reddedildi",
  upcoming: "Yaklaşan",
  archived: "Arşivlendi",
  open: "Yükleme açık",
  closed: "Yükleme kapalı",
  expired: "Süresi doldu",
};
export default function Events() {
  const [open, setOpen] = useState(false),
    [selectedDraft, setSelectedDraft] = useState<Wedding | undefined>(),
    [search, setSearch] = useState(""),
    [statusFilter, setStatusFilter] = useState("all"),
    [date, setDate] = useState(""),
    [page, setPage] = useState(1),
    [selected, setSelected] = useState<string[]>([]),
    [savedViews, setSavedViews] = useState<Array<{ name: string; search: string; status: string; date: string }>>([]);
  const qc = useQueryClient();
  const deferredSearch = useDeferredValue(search);
  const me = useQuery({
    queryKey: ["me"],
    queryFn: () => api<Account>("/auth/me"),
  });
  const events = useQuery({
    queryKey: ["admin-weddings", deferredSearch, statusFilter, date, page],
    queryFn: () => {
      const params = new URLSearchParams({ page: String(page), limit: "24" });
      if (deferredSearch) params.set("search", deferredSearch);
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (date) params.set("date", date);
      return api<{
        items: Wedding[];
        total: number;
        page: number;
        pages: number;
      }>(`/admin/weddings?${params}`);
    },
  });
  const status = useQuery({
    queryKey: ["platform-status"],
    queryFn: () =>
      api<{
        r2_ready: boolean;
        last_cleanup: { at: string; errors: string[] } | null;
      }>("/admin/status"),
    enabled: me.data?.role === "platform",
  });
  const rows = events.data?.items || [];
  useEffect(() => { try { setSavedViews(JSON.parse(localStorage.getItem("shineqr-admin-views") || "[]")); } catch { setSavedViews([]); } }, []);
  function saveView() { const name = window.prompt("Bu filtre görünümünün adı"); if (!name?.trim()) return; const next = [...savedViews.filter((view) => view.name !== name.trim()), { name: name.trim(), search, status: statusFilter, date }]; setSavedViews(next); localStorage.setItem("shineqr-admin-views", JSON.stringify(next)); }
  async function bulkArchive() { if (!selected.length || !window.confirm(`${selected.length} organizasyon arşivlensin mi?`)) return; await api("/admin/weddings/bulk", { method: "POST", body: JSON.stringify({ ids: selected, action: "archive" }) }); setSelected([]); await qc.invalidateQueries({ queryKey: ["admin-weddings"] }); }
  async function approve(id: string) {
    await api(`/admin/weddings/${id}/approve`, { method: "POST" });
    await qc.invalidateQueries({ queryKey: ["admin-weddings"] });
  }
  async function decide(id: string, decision: "changes_requested" | "rejected") {
    const message = decision === "changes_requested" ? "İstenen düzeltmeyi açıklayın" : "Ret nedenini açıklayın";
    const reason = window.prompt(message);
    if (!reason?.trim()) return;
    await api(`/admin/weddings/${id}/approval-decision`, {
      method: "POST",
      body: JSON.stringify({ decision, reason: reason.trim() }),
    });
    await qc.invalidateQueries({ queryKey: ["admin-weddings"] });
  }
  async function recordSale(id: string) {
    if (!window.confirm("Bu organizasyon için tahsil edilmiş satış kaydı oluşturulsun mu?")) return;
    await api("/admin/sales", { method: "POST", body: JSON.stringify({ wedding_id: id, idempotency_key: `manual-${id}` , vat_rate_bps: 2000 }) });
    await qc.invalidateQueries({ queryKey: ["sales"] });
  }
  return (
    <AdminShell>
      <div className="admin-heading">
        <div>
          <p className="admin-kicker">
            {me.data?.display_name || "Hoş geldiniz"}
          </p>
          <h1>
            {me.data?.role === "owner" ? "Özel albümüm" : "Organizasyonlar"}
          </h1>
          <p className="admin-subtitle">
            Her organizasyon, bir araya gelen yüzlerce anı.
          </p>
        </div>
        {me.data && me.data.role !== "owner" && (
          <button
            className="admin-button primary"
            onClick={() => {
              setSelectedDraft(undefined);
              setOpen(!open);
            }}
          >
            <Plus size={16} />
            {open ? "Formu kapat" : "Yeni organizasyon"}
          </button>
        )}
      </div>
      {status.data &&
        (!status.data.r2_ready ||
          !status.data.last_cleanup ||
          status.data.last_cleanup.errors.length > 0) && (
          <details className="admin-notice">
            <summary className="cursor-pointer">
              Sistem durumu ·{" "}
              {status.data.r2_ready
                ? "Otomatik temizlik kontrol edilmeli"
                : "Depolama ayarları eksik"}
            </summary>
            <p className="mt-2">
              {!status.data.last_cleanup
                ? "Henüz başarılı bir temizlik kaydı görünmüyor. Süresi dolan içeriklerin silinmesi için zamanlanmış görevi kontrol edin."
                : `Son çalışma: ${new Date(status.data.last_cleanup.at).toLocaleString("tr-TR")}. Hata sayısı: ${status.data.last_cleanup.errors.length}.`}
            </p>
          </details>
        )}
      {open && me.data && (
        <EventWizard
          user={me.data}
          initialEvent={selectedDraft}
          onClose={() => { setOpen(false); setSelectedDraft(undefined); }}
          onPublished={() => qc.invalidateQueries({ queryKey: ["admin-weddings"] })}
        />
      )}
      {(events.error || me.error) && (
        <Notice>{events.error?.message || me.error?.message}</Notice>
      )}
      <div className="admin-toolbar">
        <label className="admin-search">
          <Search size={16} />
          <input
            aria-label="Organizasyon ara"
            placeholder="Organizasyon ara…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </label>
        <div className="admin-actions">
          <SelectField
            aria-label="Organizasyon durumu"
            className="admin-field"
            value={statusFilter}
            onValueChange={(value) => {
              setStatusFilter(value);
              setPage(1);
            }}
          >
            <option value="all">Tüm durumlar</option>
            <option value="draft">Taslaklar</option>
            <option value="upcoming">Yaklaşan</option>
            <option value="open">Yükleme açık</option>
            <option value="closed">Yükleme kapalı</option>
            <option value="expired">Süresi doldu</option>
            <option value="archived">Arşivlenenler</option>
          </SelectField>
          <DateField
            label="Organizasyon tarihi"
            value={date}
            onValueChange={(value) => {
              setDate(value);
              setPage(1);
            }}
          />
          {(search || date || statusFilter !== "all") && (
            <button
              className="admin-button"
              onClick={() => {
                setSearch("");
                setDate("");
                setStatusFilter("all");
              }}
            >
              Temizle
            </button>
          )}
          <button className="admin-button" onClick={saveView}><BookmarkPlus size={15}/> Görünümü kaydet</button>
        </div>
      </div>
      {savedViews.length ? <div className="saved-filter-row"><span>Kayıtlı görünümler</span>{savedViews.map((view) => <button key={view.name} onClick={() => { setSearch(view.search); setStatusFilter(view.status); setDate(view.date); setPage(1); }}>{view.name}</button>)}</div> : null}
      {selected.length ? <div className="admin-bulk-bar"><strong>{selected.length} organizasyon seçildi</strong><button className="admin-button" onClick={() => setSelected([])}>Seçimi kaldır</button><button className="admin-button danger" onClick={() => void bulkArchive()}><Archive size={15}/> Arşivle</button></div> : null}
      <p className="admin-hint mb-4" aria-live="polite">
        {events.data?.total || 0} organizasyon
      </p>
      {events.isLoading ? (
        <div className="admin-empty" role="status">
          Organizasyonlar yükleniyor…
        </div>
      ) : rows.length === 0 ? (
        <div className="admin-empty">
          <h2>
            {events.data?.total
              ? "Eşleşen organizasyon bulunamadı"
              : "İlk organizasyonunuzu oluşturun"}
          </h2>
          <p>
            {events.data?.total
              ? "Arama veya tarih filtrenizi değiştirin."
              : "Organizasyonlarınız ve özel albümleriniz burada görünecek."}
          </p>
        </div>
      ) : (
        <div className="admin-event-grid">
          {rows.map((w) => (
            <div className={`admin-event-selectable ${w.approval_status === "submitted" ? "approval-pending" : ""}`} key={w.id}>
            {me.data?.role !== "owner" ? <label className="admin-event-selector"><input type="checkbox" checked={selected.includes(w.id)} onChange={(event) => setSelected((current) => event.target.checked ? [...current, w.id] : current.filter((id) => id !== w.id))}/><span className="sr-only">{w.title} seç</span></label> : null}
            <Link
              href={w.lifecycle_status === "draft" ? "#taslak" : `/admin/${w.id}`}
              className="admin-event-card"
              onClick={(event) => {
                if (w.lifecycle_status !== "draft") return;
                event.preventDefault();
                if (w.approval_status === "submitted") return;
                setSelectedDraft(w);
                setOpen(true);
              }}
            >
              <div className="admin-event-cover">
                {w.cover_images?.[0] ? (
                  <Image
                    src={w.cover_images[0]}
                    alt=""
                    fill
                    unoptimized
                    sizes="(max-width: 640px) 100vw, 33vw"
                  />
                ) : (
                  <span>SHINEQR</span>
                )}
                <div className="admin-event-cover-shade" />
              </div>
              <div className="admin-event-card-body">
                <div className="flex justify-between items-center gap-3">
                  <span className="admin-kicker">{w.event_type}</span>
                  <span
                    className={`admin-pill ${stateOf(w) !== "open" ? "closed" : ""}`}
                  >
                    {labels[stateOf(w)]}
                  </span>
                </div>
                <h2>{w.title}</h2>
                <p className="admin-hint">
                  {w.wedding_date
                    ? new Date(
                        `${w.wedding_date}T12:00:00+03:00`,
                      ).toLocaleDateString("tr-TR", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })
                    : "Tarih belirlenmedi"}
                </p>
                <div className="admin-event-meta">
                  <span>
                    {w.total || 0} içerik · {formatBytes(w.size_bytes || 0)}
                  </span>
                  <ArrowUpRight size={17} />
                </div>
                {!!w.trashed && (
                  <p className="admin-hint mt-2">
                    {w.trashed} içerik çöp kutusunda
                  </p>
                )}
                {w.rejection_reason && (w.approval_status === "changes_requested" || w.approval_status === "rejected") ? (
                  <p className="admin-event-review-note">{w.rejection_reason}</p>
                ) : null}
              </div>
            </Link>
            {me.data?.role === "platform" && w.approval_status === "submitted" ? (
              <div className="admin-event-approval-actions">
                <button className="admin-button primary" onClick={() => void approve(w.id)}>
                  <ShieldCheck size={15} /> Onayla
                </button>
                <button className="admin-button" onClick={() => void decide(w.id, "changes_requested")}>
                  <RotateCcw size={15} /> Düzeltme iste
                </button>
                <button className="admin-button danger" onClick={() => void decide(w.id, "rejected")}>
                  <XCircle size={15} /> Reddet
                </button>
              </div>
            ) : null}
            {me.data?.role === "platform" && w.approval_status === "approved" ? (
              <button className="admin-button admin-event-approve" onClick={() => void recordSale(w.id)}><ReceiptText size={15} /> Tahsil edilmiş satış kaydet</button>
            ) : null}
            </div>
          ))}
        </div>
      )}
      {events.data && events.data.pages > 1 ? (
        <div className="mt-6 flex items-center justify-center gap-3">
          <button
            className="admin-button"
            disabled={page <= 1}
            onClick={() => setPage((value) => value - 1)}
          >
            Önceki
          </button>
          <span className="admin-hint">
            {page} / {events.data.pages}
          </span>
          <button
            className="admin-button"
            disabled={page >= events.data.pages}
            onClick={() => setPage((value) => value + 1)}
          >
            Sonraki
          </button>
        </div>
      ) : null}
      <p className="admin-hint mt-8 flex items-center gap-2">
        <ShieldCheck size={15} /> Albümler yalnızca yetkili hesaplar tarafından
        görüntülenir.
      </p>
    </AdminShell>
  );
}
