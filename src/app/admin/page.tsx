"use client";
import Link from "next/link";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api, type Wedding, type Account } from "@/lib/api";
import { AdminShell } from "@/components/admin/AdminShell";
import { EventForm } from "@/components/admin/EventForm";
import { Notice } from "@/components/admin/Fields";
export default function Events() {
  const [open, setOpen] = useState(false);
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
  return (
    <AdminShell>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="eyebrow">{me.data?.display_name || "Hoş geldiniz"}</p>
          <h1 className="mt-3 text-3xl text-cream">
            {me.data?.role === "owner" ? "Özel albümüm" : "Organizasyonlar"}
          </h1>
        </div>
        {me.data && me.data.role !== "owner" && (
          <button className="btn-primary" onClick={() => setOpen(!open)}>
            {open ? "Formu kapat" : "Organizasyon oluştur"}
          </button>
        )}
      </div>
      {status.data && !status.data.r2_ready && (
        <Notice>
          Dosya depolama bağlantısı henüz tamamlanmadı. R2 ayarları yapılana
          kadar misafir yüklemeleri çalışmaz.
        </Notice>
      )}
      {status.data && (
        <p className="my-4 text-xs text-muted-foreground">
          Son otomatik temizlik:{" "}
          {status.data.last_cleanup
            ? new Date(status.data.last_cleanup.at).toLocaleString("tr-TR", {
                timeZone: "Europe/Istanbul",
              })
            : "Henüz çalıştırılmadı"}
          {status.data.last_cleanup?.errors.length
            ? " — Tekrar denenmesi gereken dosyalar var."
            : ""}
        </p>
      )}
      {open && me.data && (
        <EventForm
          user={me.data}
          onSaved={() => {
            setOpen(false);
            qc.invalidateQueries({ queryKey: ["admin-weddings"] });
          }}
        />
      )}
      {(events.error || me.error) && (
        <Notice>{events.error?.message || me.error?.message}</Notice>
      )}
      {events.isLoading ? (
        <p className="mt-6">Organizasyonlar yükleniyor…</p>
      ) : (
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {events.data?.map((w) => (
            <Link
              key={w.id}
              href={`/admin/${w.id}`}
              className="card-luxe rounded-2xl p-5 transition-colors hover:border-gold"
            >
              <p className="eyebrow">{w.event_type}</p>
              <h2 className="mt-3 text-2xl text-cream">{w.title}</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                {w.wedding_date || "Tarih ayarlanmadı"}
              </p>
              <div className="mt-4 flex gap-4 text-xs text-gold">
                <span>{w.total || 0} içerik</span>
                <span>{w.trashed || 0} çöp kutusunda</span>
                <span>{((w.size_bytes || 0) / 1024 / 1024).toFixed(1)} MB</span>
              </div>
              {w.purged_at && (
                <p className="mt-3 text-xs text-muted-foreground">
                  Saklama süresi doldu, içerikler temizlendi.
                </p>
              )}
            </Link>
          ))}
          {events.data?.length === 0 && (
            <p className="text-muted-foreground">
              Henüz bir organizasyon bulunmuyor.
            </p>
          )}
        </div>
      )}
    </AdminShell>
  );
}
