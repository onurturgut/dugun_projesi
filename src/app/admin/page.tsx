"use client";
import { DateField } from "@/components/admin/DateField";
import { SelectField } from "@/components/admin/SelectField";
import Link from "next/link";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Search, ArrowUpRight, ShieldCheck } from "lucide-react";
import { api, type Wedding, type Account } from "@/lib/api";
import { uploadsOpen, expired } from "@/lib/policy";
import { formatBytes } from "@/lib/config";
import { AdminShell } from "@/components/admin/AdminShell";
import { EventForm } from "@/components/admin/EventForm";
import { Notice } from "@/components/admin/Fields";
const stateOf = (w: Wedding) =>
  expired(w) ? "expired" : uploadsOpen(w) ? "open" : "closed";
const labels: Record<string, string> = {
  open: "Yükleme açık",
  closed: "Yükleme kapalı",
  expired: "Süresi doldu",
};
export default function Events() {
  const [open, setOpen] = useState(false),
    [search, setSearch] = useState(""),
    [statusFilter, setStatusFilter] = useState("all"),
    [date, setDate] = useState("");
  const qc = useQueryClient();
  const me = useQuery({
    queryKey: ["me"],
    queryFn: () => api<Account>("/auth/me"),
  });
  const events = useQuery({
    queryKey: ["admin-weddings"],
    queryFn: () => api<Wedding[]>("/admin/weddings"),
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
  const rows = (events.data || []).filter(
    (w) =>
      `${w.title} ${w.event_type}`
        .toLocaleLowerCase("tr")
        .includes(search.toLocaleLowerCase("tr")) &&
      (statusFilter === "all" || stateOf(w) === statusFilter) &&
      (!date || w.wedding_date === date),
  );
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
            onClick={() => setOpen(!open)}
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
        <div className="admin-panel mb-6">
          <EventForm
            user={me.data}
            onSaved={() => {
              setOpen(false);
              qc.invalidateQueries({ queryKey: ["admin-weddings"] });
            }}
          />
        </div>
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
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        <div className="admin-actions">
          <SelectField
            aria-label="Organizasyon durumu"
            className="admin-field"
            value={statusFilter}
            onValueChange={setStatusFilter}
          >
            <option value="all">Tüm durumlar</option>
            <option value="open">Yükleme açık</option>
            <option value="closed">Yükleme kapalı</option>
            <option value="expired">Süresi doldu</option>
          </SelectField>
          <DateField
            label="Organizasyon tarihi"
            value={date}
            onValueChange={setDate}
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
        </div>
      </div>
      <p className="admin-hint mb-4" aria-live="polite">
        {rows.length} organizasyon
      </p>
      {events.isLoading ? (
        <div className="admin-empty" role="status">
          Organizasyonlar yükleniyor…
        </div>
      ) : rows.length === 0 ? (
        <div className="admin-empty">
          <h2>
            {events.data?.length
              ? "Eşleşen organizasyon bulunamadı"
              : "İlk organizasyonunuzu oluşturun"}
          </h2>
          <p>
            {events.data?.length
              ? "Arama veya tarih filtrenizi değiştirin."
              : "Organizasyonlarınız ve özel albümleriniz burada görünecek."}
          </p>
        </div>
      ) : (
        <div className="admin-event-grid">
          {rows.map((w) => (
            <Link
              key={w.id}
              href={`/admin/${w.id}`}
              className="admin-event-card"
            >
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
            </Link>
          ))}
        </div>
      )}
      <p className="admin-hint mt-8 flex items-center gap-2">
        <ShieldCheck size={15} /> Albümler yalnızca yetkili hesaplar tarafından
        görüntülenir.
      </p>
    </AdminShell>
  );
}
