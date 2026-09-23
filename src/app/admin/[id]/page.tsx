"use client";
import { SelectField } from "@/components/admin/SelectField";
import Link from "next/link";
import Image from "next/image";
import { useParams } from "next/navigation";
import { useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import * as Dialog from "@radix-ui/react-dialog";
import {
  ArrowLeft,
  Images,
  QrCode,
  Settings2,
  Download,
  Search,
  Trash2,
  RotateCcw,
  ChevronDown,
  Check,
  X,
  Share2,
} from "lucide-react";
import { toast } from "sonner";
import { api, type Account, type Wedding, type Media } from "@/lib/api";
import { AdminShell } from "@/components/admin/AdminShell";
import { QrPanel } from "@/components/admin/QrPanel";
import { EventForm } from "@/components/admin/EventForm";
import { OwnerForm } from "@/components/admin/OwnerForm";
import { MediaViewer } from "@/components/admin/MediaViewer";
import { VideoPreview } from "@/components/admin/VideoPreview";
import { Notice } from "@/components/admin/Fields";
import { formatBytes } from "@/lib/config";
import { uploadsOpen } from "@/lib/policy";

const dateText = (s: string | null, time = false) =>
  s
    ? new Date(s.length === 10 ? `${s}T12:00:00+03:00` : s).toLocaleString(
        "tr-TR",
        {
          timeZone: "Europe/Istanbul",
          day: "numeric",
          month: "long",
          year: "numeric",
          ...(time ? ({ hour: "2-digit", minute: "2-digit" } as const) : {}),
        },
      )
    : "Tarih belirlenmedi";
export default function EventDetail() {
  const { id } = useParams<{ id: string }>(),
    qc = useQueryClient();
  const [section, setSection] = useState("album"),
    [trash, setTrash] = useState(false),
    [kind, setKind] = useState("all"),
    [search, setSearch] = useState(""),
    [sort, setSort] = useState("new"),
    [limit, setLimit] = useState(24);
  const [selected, setSelected] = useState<string[]>([]),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [view, setView] = useState<Media | null>(null),
    [pending, setPending] = useState<string[]>([]);
  const returnFocus = useRef<HTMLButtonElement | null>(null);
  const deleteReturnFocus = useRef<HTMLElement | null>(null);
  const me = useQuery({
    queryKey: ["me"],
    queryFn: () => api<Account>("/auth/me"),
  });
  const event = useQuery({
    queryKey: ["admin-wedding", id],
    queryFn: () => api<Wedding>(`/admin/weddings/${id}`),
  });
  const w = event.data,
    expired =
      !!w?.purged_at ||
      !!(w?.expires_at && Date.parse(w.expires_at) <= Date.now());
  const media = useQuery({
    queryKey: ["admin-media", id, trash],
    queryFn: () =>
      api<Media[]>(`/admin/weddings/${id}/media${trash ? "?trash=1" : ""}`),
    enabled: !!w && !expired,
    refetchInterval: 10000,
  });
  const all = media.data || [];
  const rows = all
    .filter(
      (m) =>
        (kind === "all" || m.type === kind) &&
        `${m.guest_name} ${m.guest_message} ${m.file_name}`
          .toLocaleLowerCase("tr")
          .includes(search.toLocaleLowerCase("tr")),
    )
    .sort((a, b) =>
      sort === "size"
        ? b.size_bytes - a.size_bytes
        : sort === "old"
          ? a.uploaded_at.localeCompare(b.uploaded_at)
          : b.uploaded_at.localeCompare(a.uploaded_at),
    );
  const visible = rows.slice(0, limit),
    rowIds = new Set(rows.map((m) => m.id)),
    validSelected = selected.filter((id) => rowIds.has(id));
  const filtered = kind !== "all" || !!search;
  const archive = `/api/admin/weddings/${id}/archive`;
  function resetSelection() {
    setSelected([]);
    setLimit(24);
  }
  function requestDelete(ids: string[]) {
    setError("");
    deleteReturnFocus.current = document.activeElement as HTMLElement | null;
    setPending(ids);
  }
  function selectOne(id: string) {
    if (selected.includes(id)) setSelected(selected.filter((x) => x !== id));
    else if (selected.length >= 200)
      toast.info("Bir işlemde en fazla 200 dosya seçebilirsiniz.");
    else setSelected([...selected, id]);
  }
  async function mutate(ids: string[], restore = false) {
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
      setPending([]);
      setView(null);
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["admin-media", id] }),
        qc.invalidateQueries({ queryKey: ["admin-weddings"] }),
      ]);
      toast.success(
        restore
          ? "İçerikler albüme geri alındı."
          : "İçerikler çöp kutusuna taşındı.",
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <AdminShell>
      <Link href="/admin" className="admin-back">
        <ArrowLeft size={14} /> Organizasyonlar
      </Link>
      {event.isLoading ? (
        <div className="admin-empty">Organizasyon yükleniyor…</div>
      ) : !w ? (
        <Notice>{event.error?.message || "Organizasyon bulunamadı."}</Notice>
      ) : (
        <>
          <div className="admin-heading">
            <div>
              <p className="admin-kicker">{w.event_type} · Özel albüm</p>
              <h1>{w.title}</h1>
              <p className="admin-subtitle">
                {dateText(w.wedding_date)}{" "}
                <span
                  className={`admin-pill ${!uploadsOpen(w) ? "closed" : ""}`}
                >
                  {expired
                    ? "Saklama süresi doldu"
                    : uploadsOpen(w)
                      ? "Yükleme açık"
                      : "Yükleme kapalı"}
                </span>
              </p>
            </div>
            {me.data?.role !== "owner" && (
              <button
                className="admin-button"
                onClick={() => setSection("share")}
              >
                <Share2 size={16} /> Paylaş
              </button>
            )}
          </div>
          <div className="admin-summary">
            <div className="admin-stats">
              <span>
                <strong>{all.filter((m) => m.type === "photo").length}</strong>
                fotoğraf
              </span>
              <span>
                <strong>{all.filter((m) => m.type === "video").length}</strong>
                video
              </span>
              <span>
                <strong>
                  {formatBytes(all.reduce((s, m) => s + m.size_bytes, 0))}
                </strong>
                {trash ? "çöp kutusunda" : "toplam"}
              </span>
            </div>
            <details className="admin-dates">
              <summary>
                <ChevronDown size={14} /> Saklama ve yükleme tarihleri
              </summary>
              <p>Yükleme kapanışı: {dateText(w.uploads_close_at, true)}</p>
              <p>Kalıcı silinme: {dateText(w.expires_at, true)} (İstanbul)</p>
            </details>
          </div>
          <nav className="admin-tabs" aria-label="Organizasyon bölümleri">
            <button
              aria-pressed={section === "album"}
              onClick={() => setSection("album")}
            >
              <Images size={18} /> Albüm
            </button>
            {me.data?.role !== "owner" && (
              <>
                <button
                  aria-pressed={section === "share"}
                  onClick={() => setSection("share")}
                >
                  <QrCode size={18} /> Paylaşım ve QR
                </button>
                <button
                  aria-pressed={section === "settings"}
                  onClick={() => setSection("settings")}
                >
                  <Settings2 size={18} /> Ayarlar
                </button>
              </>
            )}
          </nav>
          {section === "share" && me.data?.role !== "owner" && (
            <div className="admin-panels">
              <QrPanel slug={w.slug} />
              <div className="admin-panel">
                <h2>Anılara bir davet</h2>
                <p className="admin-hint">
                  QR kodunu masalara yerleştirin veya misafir bağlantısını
                  paylaşın. Misafirler hesap açmadan fotoğraf, video ve mesaj
                  bırakabilir.
                </p>
                <p className="admin-notice">
                  Albüm misafirlere açık değildir. İçerikleri organizasyon
                  sahibi, ilgili işletme ve platform yöneticisi görebilir.
                </p>
                <Link className="admin-button" href={`/wedding/${w.slug}`}>
                  Misafir sayfasını aç
                </Link>
              </div>
            </div>
          )}
          {section === "settings" && me.data && me.data.role !== "owner" && (
            <div className="space-y-6">
              <div className="admin-panel">
                <h2>Organizasyon bilgileri</h2>
                <EventForm
                  event={w}
                  user={me.data}
                  onSaved={() => {
                    qc.invalidateQueries({ queryKey: ["admin-wedding", id] });
                    qc.invalidateQueries({ queryKey: ["admin-weddings"] });
                    toast.success("Organizasyon güncellendi.");
                  }}
                />
              </div>
              <OwnerForm id={id} />
            </div>
          )}
          {section === "album" && (
            <section aria-label="Medya albümü">
              <div className="admin-toolbar">
                <div className="admin-actions">
                  <button
                    className={`admin-button ${trash ? "primary" : ""}`}
                    aria-pressed={trash}
                    onClick={() => {
                      setTrash(!trash);
                      resetSelection();
                    }}
                  >
                    {trash ? <ArrowLeft size={15} /> : <Trash2 size={15} />}{" "}
                    {trash ? "Albüme dön" : "Çöp kutusu"}
                  </button>
                </div>
                {!trash && !expired && all.length > 0 && (
                  <a className="admin-button" href={archive}>
                    <Download size={16} /> Tüm albümü indir
                  </a>
                )}
              </div>
              {trash && (
                <p className="admin-notice">
                  Silinen içerikler {w.trash_days} gün geri alınabilir.
                  Organizasyonun saklama süresi daha erken dolarsa o tarihte
                  kalıcı silinir. İndirmek için önce albüme geri alın.
                </p>
              )}
              <div className="admin-toolbar">
                <div className="admin-segment" aria-label="İçerik türü">
                  {[
                    ["all", "Tümü"],
                    ["photo", "Fotoğraflar"],
                    ["video", "Videolar"],
                  ].map(([value, label]) => (
                    <button
                      key={value}
                      aria-pressed={kind === value}
                      onClick={() => {
                        setKind(value);
                        resetSelection();
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <div className="admin-actions">
                  <label className="admin-search">
                    <Search size={16} />
                    <input
                      aria-label="Albümde ara"
                      placeholder="İsim veya mesaj ara…"
                      value={search}
                      onChange={(e) => {
                        setSearch(e.target.value);
                        resetSelection();
                      }}
                    />
                  </label>
                  <SelectField
                    className="admin-field"
                    aria-label="İçerikleri sırala"
                    value={sort}
                    onValueChange={setSort}
                  >
                    <option value="new">En yeni</option>
                    <option value="old">En eski</option>
                    <option value="size">En büyük dosya</option>
                  </SelectField>
                </div>
              </div>
              <div className="admin-result-row">
                <span aria-live="polite">
                  {rows.length} içerik{filtered ? " eşleşti" : ""}
                </span>
                <div className="admin-actions">
                  {rows.length > 0 && (
                    <button
                      className="admin-button"
                      onClick={() => {
                        const ids = [
                          ...new Set([
                            ...validSelected,
                            ...visible.map((m) => m.id),
                          ]),
                        ];
                        setSelected(ids.slice(0, 200));
                        if (ids.length > 200)
                          toast.info(
                            "İlk 200 içerik seçildi. Kalanlar için ayrı işlem yapabilirsiniz.",
                          );
                      }}
                    >
                      <Check size={14} /> Görünenleri seç
                    </button>
                  )}
                  {filtered && (
                    <button
                      className="admin-button"
                      onClick={() => {
                        setKind("all");
                        setSearch("");
                        resetSelection();
                      }}
                    >
                      Filtreyi temizle
                    </button>
                  )}
                </div>
              </div>
              {(error || media.error) && (
                <Notice>{error || media.error?.message}</Notice>
              )}
              {expired ? (
                <div className="admin-empty">
                  <h2>Saklama süresi doldu</h2>
                  <p>Bu organizasyonun içeriklerine artık erişilemez.</p>
                </div>
              ) : media.isLoading ? (
                <div className="admin-empty" role="status">
                  Albüm yükleniyor…
                </div>
              ) : rows.length === 0 ? (
                <div className="admin-empty">
                  <h2>
                    {filtered
                      ? "Eşleşen içerik bulunamadı"
                      : trash
                        ? "Çöp kutusu boş"
                        : "İlk anılar burada toplanacak"}
                  </h2>
                  <p>
                    {filtered
                      ? "Başka bir isim arayın veya filtreleri temizleyin."
                      : trash
                        ? "Çöp kutusuna taşıdığınız içerikler burada görünür."
                        : "Misafirleriniz paylaşım yaptığında albüm otomatik güncellenir."}
                  </p>
                </div>
              ) : (
                <>
                  <div className="admin-grid">
                    {visible.map((m) => (
                      <article
                        key={m.id}
                        className={`admin-media-card ${validSelected.includes(m.id) ? "is-selected" : ""}`}
                      >
                        <div className="admin-media-preview">
                          <button
                            className="admin-media-open"
                            onClick={(e) => {
                              returnFocus.current = e.currentTarget;
                              setView(m);
                            }}
                            aria-label={`${m.file_name} görüntüle`}
                          >
                            {m.type === "photo" ? (
                              <Image
                                src={m.url}
                                alt={m.file_name}
                                fill
                                unoptimized
                                sizes="(max-width:640px) 45vw, (max-width:1000px) 30vw, 23vw"
                                className="object-cover"
                              />
                            ) : (
                              <VideoPreview url={m.url} />
                            )}
                          </button>
                          <label className="admin-check">
                            <input
                              type="checkbox"
                              aria-label={`${m.file_name} seç`}
                              checked={validSelected.includes(m.id)}
                              onChange={() => selectOne(m.id)}
                            />
                          </label>
                          <span className="admin-media-type">
                            {m.type === "video" ? "Video" : "Fotoğraf"} ·{" "}
                            {formatBytes(m.size_bytes)}
                          </span>
                        </div>
                        <div className="admin-media-info">
                          <p className="admin-media-name">
                            {m.guest_name || "İsimsiz misafir"}
                          </p>
                          <p className="admin-media-date">
                            {dateText(m.uploaded_at)}
                          </p>
                          {m.guest_message && (
                            <p className="admin-media-message">
                              {m.guest_message}
                            </p>
                          )}
                          {trash && (
                            <p className="admin-media-date">
                              Kalıcı silinme: {dateText(m.purge_at, true)}
                            </p>
                          )}
                          <div className="admin-card-actions">
                            {trash ? (
                              <button
                                disabled={busy}
                                onClick={() => mutate([m.id], true)}
                              >
                                <RotateCcw size={15} /> Albüme geri al
                              </button>
                            ) : (
                              <>
                                <a href={m.download_url}>
                                  <Download size={15} /> İndir
                                </a>
                                <button
                                  disabled={busy}
                                  aria-label={`${m.file_name} çöp kutusuna taşı`}
                                  title="Çöp kutusuna taşı"
                                  onClick={() => requestDelete([m.id])}
                                >
                                  <Trash2 size={16} />
                                  <span className="sr-only">
                                    Çöp kutusuna taşı
                                  </span>
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                  {visible.length < rows.length && (
                    <div className="mt-6 text-center">
                      <button
                        className="admin-button"
                        onClick={() => setLimit(limit + 24)}
                      >
                        Daha fazla göster ({rows.length - visible.length})
                      </button>
                    </div>
                  )}
                </>
              )}
              {!trash && filtered && rows.length > 0 && rows.length <= 200 && (
                <a
                  className="admin-button mt-5"
                  href={`${archive}?ids=${rows.map((m) => m.id).join(",")}`}
                >
                  <Download size={16} /> Filtrelenen {rows.length} içeriği indir
                </a>
              )}
              {!trash && filtered && rows.length > 200 && (
                <p className="admin-hint mt-4">
                  Filtrelenen içerikleri indirmek için en fazla 200 dosyalık
                  gruplar seçin.
                </p>
              )}
              {validSelected.length > 0 && (
                <div
                  className="admin-selection"
                  role="region"
                  aria-label="Seçili içerik işlemleri"
                >
                  <span aria-live="polite">
                    {validSelected.length} / 200 seçildi
                  </span>
                  <button
                    className="admin-button"
                    aria-label="Seçimi temizle"
                    onClick={() => setSelected([])}
                  >
                    <X size={16} />
                  </button>
                  {!trash && (
                    <a
                      className="admin-button primary"
                      href={`${archive}?ids=${validSelected.join(",")}`}
                    >
                      <Download size={16} /> Seçilenleri indir
                    </a>
                  )}
                  <button
                    disabled={busy}
                    className="admin-button danger"
                    onClick={() =>
                      trash
                        ? mutate(validSelected, true)
                        : requestDelete(validSelected)
                    }
                  >
                    {trash ? <RotateCcw size={16} /> : <Trash2 size={16} />}{" "}
                    {trash ? "Geri al" : "Çöp kutusuna taşı"}
                  </button>
                </div>
              )}
            </section>
          )}
          <MediaViewer
            item={view}
            rows={rows}
            onChange={setView}
            returnFocus={returnFocus}
            allowDownload={!trash}
          />
          <Dialog.Root
            open={pending.length > 0}
            onOpenChange={(open) => {
              if (!open && !busy) setPending([]);
            }}
          >
            <Dialog.Portal>
              <Dialog.Overlay className="admin-dialog-overlay" />
              <Dialog.Content
                className="admin-confirm"
                onCloseAutoFocus={(e) => {
                  if (deleteReturnFocus.current?.isConnected) {
                    e.preventDefault();
                    deleteReturnFocus.current.focus();
                  }
                }}
              >
                <Dialog.Title>Çöp kutusuna taşınsın mı?</Dialog.Title>
                <Dialog.Description>
                  {pending.length} içerik albümden kaldırılacak. {w.trash_days}{" "}
                  gün içinde, organizasyonun saklama süresi dolmadıysa geri
                  alabilirsiniz.
                </Dialog.Description>
                {error && <p role="alert">{error}</p>}
                <div className="admin-actions">
                  <Dialog.Close className="admin-button" disabled={busy}>
                    Vazgeç
                  </Dialog.Close>
                  <button
                    className="admin-button danger"
                    disabled={busy}
                    onClick={() => mutate(pending)}
                  >
                    {busy ? "Taşınıyor…" : "Çöp kutusuna taşı"}
                  </button>
                </div>
              </Dialog.Content>
            </Dialog.Portal>
          </Dialog.Root>
        </>
      )}
    </AdminShell>
  );
}
