"use client";
import Link from "next/link";
import Image from "next/image";
import { useParams } from "next/navigation";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api, type Account, type Wedding, type Media } from "@/lib/api";
import { AdminShell } from "@/components/admin/AdminShell";
import { QrPanel } from "@/components/admin/QrPanel";
import { EventForm } from "@/components/admin/EventForm";
import { OwnerForm } from "@/components/admin/OwnerForm";
import { Notice } from "@/components/admin/Fields";
const dateText = (s: string | null) =>
  s
    ? new Date(s).toLocaleString("tr-TR", { timeZone: "Europe/Istanbul" })
    : "Tarih ayarlanmadı";
export default function EventDetail() {
  const { id } = useParams<{ id: string }>(),
    qc = useQueryClient();
  const [edit, setEdit] = useState(false),
    [trash, setTrash] = useState(false),
    [kind, setKind] = useState("all"),
    [selected, setSelected] = useState<string[]>([]),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [view, setView] = useState<Media | null>(null);
  const me = useQuery({
    queryKey: ["me"],
    queryFn: () => api<Account>("/auth/me"),
  });
  const event = useQuery({
    queryKey: ["admin-wedding", id],
    queryFn: () => api<Wedding>(`/admin/weddings/${id}`),
  });
  const expired =
    !!event.data?.purged_at ||
    !!(
      event.data?.expires_at && Date.parse(event.data.expires_at) <= Date.now()
    );
  const media = useQuery({
    queryKey: ["admin-media", id, trash],
    queryFn: () =>
      api<Media[]>(`/admin/weddings/${id}/media${trash ? "?trash=1" : ""}`),
    enabled: !!event.data && !expired,
    refetchInterval: 10000,
  });
  async function mutate(ids: string[], restore = false) {
    if (!restore && !confirm("Seçilen içerikler çöp kutusuna taşınsın mı?"))
      return;
    setBusy(true);
    setError("");
    try {
      await api(`/admin/weddings/${id}/media`, {
        method: restore ? "PATCH" : "DELETE",
        body: JSON.stringify({
          ids,
          ...(restore ? { action: "restore" } : {}),
        }),
      });
      setSelected([]);
      setView(null);
      qc.invalidateQueries({ queryKey: ["admin-media", id] });
      qc.invalidateQueries({ queryKey: ["admin-weddings"] });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const rows = (media.data || []).filter(
      (m) => kind === "all" || m.type === kind,
    ),
    w = event.data;
  return (
    <AdminShell>
      <Link href="/admin" className="text-sm text-gold">
        ← Organizasyonlar
      </Link>
      {event.isLoading ? (
        <p className="mt-6">Yükleniyor…</p>
      ) : !w ? (
        <Notice>{event.error?.message || "Organizasyon bulunamadı."}</Notice>
      ) : (
        <>
          <div className="my-6 flex flex-wrap justify-between gap-4">
            <div>
              <p className="eyebrow">{w.event_type}</p>
              <h1 className="mt-3 text-3xl text-cream">{w.title}</h1>
            </div>
            {me.data?.role !== "owner" && (
              <button className="btn-secondary" onClick={() => setEdit(!edit)}>
                {edit ? "Düzenlemeyi kapat" : "Organizasyonu düzenle"}
              </button>
            )}
          </div>
          {edit && me.data && (
            <EventForm
              event={w}
              user={me.data}
              onSaved={() => {
                setEdit(false);
                qc.invalidateQueries({ queryKey: ["admin-wedding", id] });
                qc.invalidateQueries({ queryKey: ["admin-weddings"] });
              }}
            />
          )}
          <div className="my-6 grid gap-3 sm:grid-cols-3">
            <div className="card-luxe rounded-xl p-4">
              <p className="text-xs text-muted-foreground">
                Organizasyon tarihi
              </p>
              <p className="mt-2 text-sm">{w.wedding_date || "Belirlenmedi"}</p>
            </div>
            <div className="card-luxe rounded-xl p-4">
              <p className="text-xs text-muted-foreground">
                Yüklemelerin kapanışı
              </p>
              <p className="mt-2 text-sm">{dateText(w.uploads_close_at)}</p>
            </div>
            <div className="card-luxe rounded-xl p-4">
              <p className="text-xs text-muted-foreground">
                İçeriklerin kalıcı silinmesi
              </p>
              <p className="mt-2 text-sm">{dateText(w.expires_at)}</p>
            </div>
          </div>
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
            <section>
              <div className="mb-4 flex flex-wrap gap-2">
                <button
                  className="btn-secondary"
                  onClick={() => {
                    setTrash(false);
                    setSelected([]);
                  }}
                  aria-pressed={!trash}
                >
                  Albüm
                </button>
                <button
                  className="btn-secondary"
                  onClick={() => {
                    setTrash(true);
                    setSelected([]);
                  }}
                  aria-pressed={trash}
                >
                  Çöp kutusu
                </button>
                <select
                  aria-label="İçerik türü"
                  className="rounded-xl border border-border bg-surface px-3 text-sm"
                  value={kind}
                  onChange={(e) => {
                    setKind(e.target.value);
                    setSelected([]);
                  }}
                >
                  <option value="all">Tümü</option>
                  <option value="photo">Fotoğraflar</option>
                  <option value="video">Videolar</option>
                </select>
                {!trash && !expired && (media.data?.length || 0) > 0 && (
                  <a
                    className="btn-primary"
                    href={`/api/admin/weddings/${id}/archive`}
                  >
                    Tümünü ZIP indir
                  </a>
                )}
              </div>
              {trash && (
                <p className="mb-4 text-sm text-muted-foreground">
                  Silinenler {w.trash_days} gün geri alınabilir. Organizasyonun
                  son saklama tarihi daha erkense o tarihte kalıcı silinir.
                </p>
              )}
              {selected.length > 0 && (
                <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-gold/40 p-3">
                  <span className="text-sm">{selected.length} seçildi</span>
                  <button
                    disabled={busy}
                    className="btn-secondary"
                    onClick={() => mutate(selected, trash)}
                  >
                    {trash ? "Geri al" : "Çöp kutusuna taşı"}
                  </button>
                  {!trash && (
                    <a
                      className="btn-primary"
                      href={`/api/admin/weddings/${id}/archive?ids=${selected.join(",")}`}
                    >
                      Seçilenleri ZIP indir
                    </a>
                  )}
                </div>
              )}
              {(error || media.error) && (
                <Notice>{error || media.error?.message}</Notice>
              )}
              {expired ? (
                <Notice>
                  Saklama süresi doldu. Bu organizasyonun içeriklerine artık
                  erişilemez.
                </Notice>
              ) : media.isLoading ? (
                <p>Albüm yükleniyor…</p>
              ) : rows.length === 0 ? (
                <p className="card-luxe rounded-xl p-8 text-center text-muted-foreground">
                  {trash
                    ? "Çöp kutusu boş."
                    : "Henüz içerik yok. Yeni yüklemeler burada otomatik görünecek."}
                </p>
              ) : (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {rows.map((m) => (
                    <article
                      key={m.id}
                      className="overflow-hidden rounded-xl border border-border bg-surface"
                    >
                      <div className="relative">
                        <button
                          onClick={() => !trash && setView(m)}
                          disabled={trash}
                          className="relative flex aspect-square w-full items-center justify-center"
                          aria-label={`${m.file_name} görüntüle`}
                        >
                          {!trash && m.type === "photo" ? (
                            <Image
                              unoptimized
                              fill
                              sizes="(max-width:640px) 50vw, 25vw"
                              src={m.url}
                              alt={m.file_name}
                              className="object-cover"
                            />
                          ) : (
                            <span className="text-gold">
                              {m.type === "video" ? "▶ Video" : "Fotoğraf"}
                            </span>
                          )}
                        </button>
                        <input
                          aria-label={`${m.file_name} seç`}
                          type="checkbox"
                          checked={selected.includes(m.id)}
                          onChange={() =>
                            setSelected((s) =>
                              s.includes(m.id)
                                ? s.filter((x) => x !== m.id)
                                : [...s, m.id].slice(0, 200),
                            )
                          }
                          className="absolute left-2 top-2 h-5 w-5 accent-yellow-600"
                        />
                      </div>
                      <div className="space-y-2 p-3 text-xs">
                        <p className="truncate text-cream">
                          {m.guest_name || "İsimsiz misafir"}
                        </p>
                        {m.guest_message && (
                          <p className="break-words text-muted-foreground">
                            {m.guest_message}
                          </p>
                        )}
                        <p className="text-muted-foreground">
                          {dateText(m.uploaded_at)}
                        </p>
                        {trash ? (
                          <>
                            <p>Silinme: {dateText(m.purge_at)}</p>
                            <button
                              disabled={busy}
                              className="btn-secondary w-full"
                              onClick={() => mutate([m.id], true)}
                            >
                              Geri al
                            </button>
                          </>
                        ) : (
                          <div className="flex flex-wrap gap-2">
                            <a href={m.download_url} className="text-gold">
                              İndir
                            </a>
                            <button
                              disabled={busy}
                              onClick={() => mutate([m.id])}
                              className="text-muted-foreground"
                            >
                              Sil
                            </button>
                          </div>
                        )}
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>
            <aside className="space-y-4">
              {me.data?.role !== "owner" && (
                <>
                  <QrPanel slug={w.slug} />
                  <OwnerForm id={id} />
                </>
              )}
              <div className="card-luxe rounded-xl p-5">
                <p className="text-sm text-muted-foreground">
                  Albüm sadece organizasyon sahibi, ilgili işletme ve platform
                  yöneticisine açıktır.
                </p>
                <Link
                  className="btn-secondary mt-4 w-full"
                  href={`/wedding/${w.slug}`}
                >
                  Misafir sayfasını aç
                </Link>
              </div>
            </aside>
          </div>
          {view && (
            <div
              role="dialog"
              aria-modal="true"
              aria-label="İçerik görüntüleme"
              className="fixed inset-0 z-50 flex flex-col bg-black/95 p-4"
              onKeyDown={(e) => {
                if (e.key === "Escape") setView(null);
              }}
            >
              <button
                autoFocus
                className="btn-secondary self-end"
                onClick={() => setView(null)}
              >
                Kapat ✕
              </button>
              <div className="relative min-h-0 flex-1">
                {view.type === "photo" ? (
                  <Image
                    unoptimized
                    fill
                    sizes="100vw"
                    src={view.url}
                    alt={view.file_name}
                    className="object-contain"
                  />
                ) : (
                  <video
                    src={view.url}
                    controls
                    autoPlay
                    className="h-full w-full"
                  />
                )}
              </div>
              <p className="py-3 text-center text-sm">
                {view.guest_name} {view.guest_message}
              </p>
              <a href={view.download_url} className="btn-primary self-center">
                Dosyayı indir
              </a>
            </div>
          )}
        </>
      )}
    </AdminShell>
  );
}
