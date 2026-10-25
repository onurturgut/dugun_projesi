"use client";
import { SelectField } from "@/components/admin/SelectField";
import Link from "next/link";
import Image from "next/image";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  useInfiniteQuery,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
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
  Palette,
  Camera,
} from "lucide-react";
import { toast } from "sonner";
import { ArchiveButton } from "@/components/admin/ArchiveButton";
import {
  api,
  type Account,
  type Wedding,
  type Media,
  type MediaPage,
} from "@/lib/api";
import { AdminShell } from "@/components/admin/AdminShell";
import { QrPanel } from "@/components/admin/QrPanel";
import { EventForm } from "@/components/admin/EventForm";
import { OwnerForm } from "@/components/admin/OwnerForm";
import { MediaViewer } from "@/components/admin/MediaViewer";
import { VideoPreview } from "@/components/admin/VideoPreview";
import { Notice } from "@/components/admin/Fields";
import { formatBytes } from "@/lib/config";
import { uploadsOpen } from "@/lib/policy";
import {
  GIB,
  packageStorageLimit,
  storageBytesInUse,
} from "@/lib/commercial-policy";
import { accountHasPermission, effectiveStaffRole } from "@/lib/access-control";

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
    [source, setSource] = useState("all"),
    [search, setSearch] = useState(""),
    [debouncedSearch, setDebouncedSearch] = useState(""),
    [sort, setSort] = useState("new");
  const [selected, setSelected] = useState<string[]>([]),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [view, setView] = useState<Media | null>(null),
    [pending, setPending] = useState<string[]>([]),
    [pendingAction, setPendingAction] = useState<"trash" | "purge">("trash");
  const [additionalGb, setAdditionalGb] = useState("0");
  const [photographerId, setPhotographerId] = useState("");
  const [photographerDueDate, setPhotographerDueDate] = useState("");
  const [expectedFileCount, setExpectedFileCount] = useState("");
  const [invite, setInvite] = useState({
    email: "",
    business_name: "",
    phone: "",
    address: "",
    expires_at: "",
  });
  const returnFocus = useRef<HTMLButtonElement | null>(null);
  const deleteReturnFocus = useRef<HTMLElement | null>(null);
  useEffect(() => {
    const timeout = window.setTimeout(
      () => setDebouncedSearch(search.trim()),
      350,
    );
    return () => window.clearTimeout(timeout);
  }, [search]);
  const me = useQuery({
    queryKey: ["me"],
    queryFn: () => api<Account>("/auth/me"),
  });
  const event = useQuery({
    queryKey: ["admin-wedding", id],
    queryFn: () => api<Wedding>(`/admin/weddings/${id}`),
  });
  const photographers = useQuery({
    queryKey: ["photographers"],
    queryFn: () =>
      api<Array<{ id: string; display_name: string; partner_id: string }>>(
        "/admin/photographers",
      ),
    enabled:
      !!me.data &&
      me.data.role !== "owner" &&
      effectiveStaffRole(me.data) !== "photographer",
  });
  const w = event.data,
    canViewAlbum = !!me.data && accountHasPermission(me.data, "album.view"),
    isPhotographer =
      !!me.data && effectiveStaffRole(me.data) === "photographer",
    expired =
      !!w?.purged_at ||
      !!(w?.expires_at && Date.parse(w.expires_at) <= Date.now());
  const baseStorageLimit = w?.package_snapshot
    ? packageStorageLimit(w.package_snapshot) || 0
    : 0;
  const effectiveStorageLimit = Math.max(
    baseStorageLimit,
    w?.storage_limit_override_bytes || 0,
  );
  const storageUsed = w ? storageBytesInUse(w) : 0;
  const storagePercent = effectiveStorageLimit
    ? Math.min(
        100,
        Math.round((storageUsed / effectiveStorageLimit) * 1000) / 10,
      )
    : 0;
  useEffect(() => {
    if (!w) return;
    setAdditionalGb(
      String(
        Math.max(
          0,
          Math.round(
            ((w.storage_limit_override_bytes || baseStorageLimit) -
              baseStorageLimit) /
              GIB,
          ),
        ),
      ),
    );
  }, [w, baseStorageLimit]);
  const media = useInfiniteQuery({
    queryKey: ["admin-media", id, trash, kind, source, debouncedSearch, sort],
    queryFn: ({ pageParam }) => {
      const params = new URLSearchParams({ limit: "24", sort });
      if (trash) params.set("trash", "1");
      if (kind !== "all") params.set("type", kind);
      if (source !== "all") params.set("source", source);
      if (debouncedSearch) params.set("search", debouncedSearch);
      if (pageParam) params.set("cursor", pageParam);
      return api<MediaPage>(`/admin/weddings/${id}/media?${params}`);
    },
    initialPageParam: "",
    getNextPageParam: (lastPage) => lastPage.nextCursor || undefined,
    enabled: !!w && !expired && section === "album" && canViewAlbum,
    staleTime: 15_000,
    refetchInterval: section === "album" ? 30_000 : false,
    refetchIntervalInBackground: false,
  });
  const rows = useMemo(
    () => media.data?.pages.flatMap((page) => page.items) || [],
    [media.data],
  );
  const firstPage = media.data?.pages[0];
  const summary = firstPage?.summary || { photos: 0, videos: 0, totalBytes: 0 };
  const total = firstPage?.total || 0;
  const rowIds = useMemo(() => new Set(rows.map((m) => m.id)), [rows]);
  const validSelected = useMemo(
    () => selected.filter((selectedId) => rowIds.has(selectedId)),
    [rowIds, selected],
  );
  const filtered = kind !== "all" || source !== "all" || !!search;
  const archive = `/api/admin/weddings/${id}/archive`;
  function resetSelection() {
    setSelected([]);
  }
  async function saveStorageLimit() {
    setBusy(true);
    setError("");
    try {
      await api(`/admin/weddings/${id}/storage-limit`, {
        method: "PATCH",
        body: JSON.stringify({ additional_gib: Number(additionalGb) }),
      });
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["admin-wedding", id] }),
        qc.invalidateQueries({ queryKey: ["operations"] }),
        qc.invalidateQueries({ queryKey: ["admin-notifications"] }),
      ]);
      toast.success("Depolama kapasitesi güncellendi.");
    } catch (reason) {
      setError((reason as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function assignPhotographer() {
    if (!photographerId) return;
    setBusy(true);
    setError("");
    try {
      await api(`/admin/weddings/${id}/photographers`, {
        method: "POST",
        body: JSON.stringify({
          account_id: photographerId,
          delivery_due_at: photographerDueDate
            ? new Date(`${photographerDueDate}T23:59:59+03:00`).toISOString()
            : null,
          expected_file_count: expectedFileCount
            ? Number(expectedFileCount)
            : null,
        }),
      });
      setPhotographerId("");
      setPhotographerDueDate("");
      setExpectedFileCount("");
      await qc.invalidateQueries({ queryKey: ["admin-wedding", id] });
      toast.success("Fotoğrafçı organizasyona atandı.");
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function completePhotographerDelivery() {
    setBusy(true);
    setError("");
    try {
      await api(`/admin/weddings/${id}/photographer-delivery`, {
        method: "POST",
      });
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["admin-wedding", id] }),
        qc.invalidateQueries({ queryKey: ["admin-notifications"] }),
      ]);
      toast.success("Profesyonel fotoğraf teslimatı tamamlandı.");
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function createPhotographerInvitation() {
    setBusy(true);
    setError("");
    try {
      const result = await api<{ invite_url: string }>(
        `/admin/weddings/${id}/photographer-invitations`,
        {
          method: "POST",
          body: JSON.stringify({
            ...invite,
            expires_at: new Date(
              `${invite.expires_at}T23:59:59+03:00`,
            ).toISOString(),
            delivery_due_at: photographerDueDate
              ? new Date(`${photographerDueDate}T23:59:59+03:00`).toISOString()
              : null,
            expected_file_count: expectedFileCount
              ? Number(expectedFileCount)
              : null,
          }),
        },
      );
      await navigator.clipboard.writeText(
        `${window.location.origin}${result.invite_url}`,
      );
      toast.success("Davet bağlantısı oluşturuldu ve panoya kopyalandı.");
      setInvite({
        email: "",
        business_name: "",
        phone: "",
        address: "",
        expires_at: "",
      });
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function unassignPhotographer(accountId: string) {
    setBusy(true);
    setError("");
    try {
      await api(`/admin/weddings/${id}/photographers`, {
        method: "DELETE",
        body: JSON.stringify({ account_id: accountId }),
      });
      await qc.invalidateQueries({ queryKey: ["admin-wedding", id] });
      toast.success("Fotoğrafçı ataması kaldırıldı.");
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setBusy(false);
    }
  }
  function requestDelete(ids: string[], permanent = false) {
    setError("");
    deleteReturnFocus.current = document.activeElement as HTMLElement | null;
    setPendingAction(permanent ? "purge" : "trash");
    setPending(ids);
  }
  function selectOne(id: string) {
    if (selected.includes(id)) setSelected(selected.filter((x) => x !== id));
    else if (selected.length >= 200)
      toast.info("Bir işlemde en fazla 200 dosya seçebilirsiniz.");
    else setSelected([...selected, id]);
  }
  async function mutate(ids: string[], action: "trash" | "restore" | "purge") {
    setBusy(true);
    setError("");
    try {
      await api(`/admin/weddings/${id}/media`, {
        method: action === "trash" ? "DELETE" : "PATCH",
        body: JSON.stringify({
          ids,
          ...(action !== "trash" ? { action } : {}),
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
        action === "restore"
          ? "İçerikler albüme geri alındı."
          : action === "purge"
            ? "İçerikler veritabanı ve depolamadan kalıcı olarak silindi."
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
                <strong>{summary.photos}</strong>
                fotoğraf
              </span>
              <span>
                <strong>{summary.videos}</strong>
                video
              </span>
              <span>
                <strong>{formatBytes(summary.totalBytes)}</strong>
                {trash ? "çöp kutusunda" : "toplam"}
              </span>
              <span>
                <strong>
                  {w.design_revisions_used || 0}/
                  {w.package_snapshot?.revisionLimit || 1}
                </strong>
                {w.design_status === "approved_for_print"
                  ? "baskı onaylı"
                  : w.design_status === "revision_requested"
                    ? "revizyon açık"
                    : "revizyon hakkı"}
              </span>
            </div>
            <div
              className="quota-usage"
              aria-label={`Depolama kullanımı yüzde ${storagePercent}`}
            >
              <div>
                <span>Depolama</span>
                <strong>
                  {formatBytes(storageUsed)} /{" "}
                  {formatBytes(effectiveStorageLimit)}
                </strong>
              </div>
              <progress max="100" value={storagePercent} />
              <small>
                {storagePercent}% kullanılıyor · çöp kutusu ve bekleyen
                yüklemeler dahil
              </small>
            </div>
            <details className="admin-dates">
              <summary>
                <ChevronDown size={14} /> Saklama ve yükleme tarihleri
              </summary>
              <p>Yükleme kapanışı: {dateText(w.uploads_close_at, true)}</p>
              <p>Kalıcı silinme: {dateText(w.expires_at, true)} (İstanbul)</p>
            </details>
          </div>
          <section
            className="event-photographer-card"
            aria-labelledby="event-photographer-title"
          >
            <span className="event-photographer-icon">
              <Camera size={19} />
            </span>
            <div className="event-photographer-copy">
              <p>PROFESYONEL ÇEKİM EKİBİ</p>
              <h2 id="event-photographer-title">Atanmış fotoğrafçı</h2>
              {w.assigned_photographers?.length ? (
                <div className="event-photographer-list">
                  {w.assigned_photographers.map((photographer) => (
                    <span key={photographer.id}>
                      <strong>{photographer.display_name}</strong>
                      <small>
                        {photographer.email ||
                          "Organizasyona atanmış fotoğrafçı"}
                        {photographer.disabled ? " · Erişimi kapalı" : ""}
                      </small>
                      {me.data?.role !== "owner" && !isPhotographer ? (
                        <button
                          className="admin-button"
                          disabled={busy}
                          onClick={() =>
                            void unassignPhotographer(photographer.id)
                          }
                        >
                          Atamayı kaldır
                        </button>
                      ) : null}
                    </span>
                  ))}
                </div>
              ) : (
                <span className="event-photographer-empty">
                  Bu organizasyona henüz fotoğrafçı atanmamış.
                </span>
              )}
              {me.data?.role !== "owner" && !isPhotographer ? (
                <div className="event-photographer-assign">
                  <SelectField
                    value={photographerId}
                    onValueChange={setPhotographerId}
                    aria-label="Fotoğrafçı seç"
                  >
                    <option value="">Fotoğrafçı seçin</option>
                    {photographers.data
                      ?.filter(
                        (item) =>
                          !w.assigned_photographers?.some(
                            (assigned) => assigned.id === item.id,
                          ),
                      )
                      .map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.display_name}
                        </option>
                      ))}
                  </SelectField>
                  <input
                    type="date"
                    aria-label="Fotoğrafçı teslim tarihi"
                    value={photographerDueDate}
                    onChange={(event) =>
                      setPhotographerDueDate(event.target.value)
                    }
                  />
                  <input
                    type="number"
                    min="1"
                    max="100000"
                    aria-label="Beklenen profesyonel dosya sayısı"
                    placeholder="Beklenen dosya"
                    value={expectedFileCount}
                    onChange={(event) =>
                      setExpectedFileCount(event.target.value)
                    }
                  />
                  <button
                    className="admin-button"
                    disabled={!photographerId || busy}
                    onClick={() => void assignPhotographer()}
                  >
                    Fotoğrafçı ata
                  </button>
                </div>
              ) : null}
              {me.data?.role !== "owner" && !isPhotographer ? (
                <details className="event-photographer-invite">
                  <summary>Kayıtlı olmayan fotoğrafçıyı davet et</summary>
                  <div>
                    <input
                      type="email"
                      placeholder="E-posta"
                      value={invite.email}
                      onChange={(event) =>
                        setInvite((current) => ({
                          ...current,
                          email: event.target.value,
                        }))
                      }
                    />
                    <input
                      placeholder="Fotoğraf işletmesi"
                      value={invite.business_name}
                      onChange={(event) =>
                        setInvite((current) => ({
                          ...current,
                          business_name: event.target.value,
                        }))
                      }
                    />
                    <input
                      inputMode="numeric"
                      minLength={11}
                      maxLength={11}
                      placeholder="05xxxxxxxxx"
                      value={invite.phone}
                      onChange={(event) =>
                        setInvite((current) => ({
                          ...current,
                          phone: event.target.value
                            .replace(/\D/g, "")
                            .slice(0, 11),
                        }))
                      }
                    />
                    <input
                      placeholder="Adres"
                      value={invite.address}
                      onChange={(event) =>
                        setInvite((current) => ({
                          ...current,
                          address: event.target.value,
                        }))
                      }
                    />
                    <input
                      type="date"
                      aria-label="Davet son kullanma tarihi"
                      value={invite.expires_at}
                      onChange={(event) =>
                        setInvite((current) => ({
                          ...current,
                          expires_at: event.target.value,
                        }))
                      }
                    />
                    <button
                      className="admin-button"
                      disabled={
                        busy ||
                        !invite.email ||
                        !invite.business_name ||
                        !invite.phone ||
                        !invite.address ||
                        !invite.expires_at
                      }
                      onClick={() => void createPhotographerInvitation()}
                    >
                      Davet bağlantısı oluştur
                    </button>
                  </div>
                </details>
              ) : null}
            </div>
          </section>
          <nav className="admin-tabs" aria-label="Organizasyon bölümleri">
            {!isPhotographer && (
              <Link href={`/admin/${id}/design/wedding`}>
                <Palette size={18} /> Tasarım
              </Link>
            )}
            {canViewAlbum && (
              <button
                aria-pressed={section === "album"}
                onClick={() => setSection("album")}
              >
                <Images size={18} /> Albüm
              </button>
            )}
            {me.data?.role !== "owner" && !isPhotographer && (
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
          {isPhotographer && (
            <div className="admin-panel">
              <p className="admin-kicker">PROFESYONEL TESLİMAT</p>
              <h2>Çekimlerinizi yükleyin</h2>
              <p className="admin-hint">
                Yalnızca bu organizasyona profesyonel dosya yükleyebilirsiniz.
                Misafir albümü ve diğer yüklemeler size gösterilmez.
              </p>
              {w.assigned_photographers?.find(
                (item) => item.id === me.data?.id,
              ) ? (
                <p className="admin-hint">
                  Teslim durumu:{" "}
                  {w.assigned_photographers.find(
                    (item) => item.id === me.data?.id,
                  )?.delivery_status || "assigned"}{" "}
                  · Yüklenen:{" "}
                  {w.assigned_photographers.find(
                    (item) => item.id === me.data?.id,
                  )?.delivered_file_count || 0}
                  {w.assigned_photographers.find(
                    (item) => item.id === me.data?.id,
                  )?.expected_file_count
                    ? ` / ${w.assigned_photographers.find((item) => item.id === me.data?.id)?.expected_file_count}`
                    : ""}
                </p>
              ) : null}
              <Link
                className="admin-button primary"
                href={`/wedding/${w.slug}`}
              >
                Yükleme alanını aç
              </Link>
              <button
                className="admin-button"
                disabled={
                  busy ||
                  w.assigned_photographers?.find(
                    (item) => item.id === me.data?.id,
                  )?.delivery_status === "completed"
                }
                onClick={() => void completePhotographerDelivery()}
              >
                Yüklemeyi tamamladım
              </button>
            </div>
          )}
          {section === "share" &&
            me.data?.role !== "owner" &&
            !isPhotographer && (
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
                    sahibi ve yetkili ShineQR yöneticisi görebilir.
                  </p>
                  <Link className="admin-button" href={`/wedding/${w.slug}`}>
                    Misafir sayfasını aç
                  </Link>
                </div>
              </div>
            )}
          {section === "settings" &&
            me.data &&
            me.data.role !== "owner" &&
            !isPhotographer && (
              <div className="space-y-6">
                {me.data.role === "platform" && (
                  <div className="admin-panel storage-limit-panel">
                    <div>
                      <p className="admin-kicker">KOTA ONAYI</p>
                      <h2>Ek depolama kapasitesi</h2>
                      <p className="admin-hint">
                        Paket sınırına eklenecek kapasiteyi belirleyin. 0 GB
                        seçilirse paket sınırına geri dönülür.
                      </p>
                    </div>
                    <label>
                      Ek kapasite (GB)
                      <input
                        type="number"
                        min="0"
                        max="350"
                        step="1"
                        value={additionalGb}
                        onChange={(e) => setAdditionalGb(e.target.value)}
                      />
                    </label>
                    <button
                      className="admin-button"
                      disabled={
                        busy ||
                        !/^\d+$/.test(additionalGb) ||
                        Number(additionalGb) > 350
                      }
                      onClick={() => void saveStorageLimit()}
                    >
                      {busy ? "Kaydediliyor…" : "Kapasiteyi onayla"}
                    </button>
                  </div>
                )}
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
          {section === "album" && canViewAlbum && (
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
                {!trash && !expired && summary.photos + summary.videos > 0 && (
                  <ArchiveButton weddingId={id} />
                )}
              </div>
              {trash && (
                <p className="admin-notice">
                  Silinen içerikler {w.trash_days} gün geri alınabilir.
                  Organizasyonun saklama süresi daha erken dolarsa o tarihte
                  kalıcı silinir. Dilerseniz seçtiğiniz içerikleri hemen kalıcı
                  olarak silebilirsiniz. İndirmek için önce albüme geri alın.
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
                <div className="admin-segment" aria-label="İçerik kaynağı">
                  {[
                    ["all", "Tüm kaynaklar"],
                    ["guest", "Misafir içerikleri"],
                    ["photographer", "Profesyonel çekimler"],
                  ].map(([value, label]) => (
                    <button
                      key={value}
                      aria-pressed={source === value}
                      onClick={() => {
                        setSource(value);
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
                  {total} içerik{filtered ? " eşleşti" : ""}
                </span>
                <div className="admin-actions">
                  {rows.length > 0 && (
                    <button
                      className="admin-button"
                      onClick={() => {
                        const ids = [
                          ...new Set([
                            ...validSelected,
                            ...rows.map((m) => m.id),
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
                        setSource("all");
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
                    {rows.map((m) => (
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
                            {m.type === "photo" || m.preview_url ? (
                              <Image
                                src={m.preview_url || m.url}
                                alt={m.file_name}
                                fill
                                unoptimized
                                sizes="(max-width:640px) 45vw, (max-width:1000px) 30vw, 23vw"
                                className="object-cover"
                              />
                            ) : (
                              <VideoPreview />
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
                              <>
                                <button
                                  disabled={busy}
                                  onClick={() => mutate([m.id], "restore")}
                                >
                                  <RotateCcw size={15} /> Albüme geri al
                                </button>
                                <button
                                  disabled={busy}
                                  className="danger"
                                  onClick={() => requestDelete([m.id], true)}
                                >
                                  <Trash2 size={15} /> Kalıcı sil
                                </button>
                              </>
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
                  {media.hasNextPage && (
                    <div className="mt-6 text-center">
                      <button
                        className="admin-button"
                        disabled={media.isFetchingNextPage}
                        onClick={() => media.fetchNextPage()}
                      >
                        {media.isFetchingNextPage
                          ? "Yükleniyor…"
                          : `Daha fazla göster (${total - rows.length})`}
                      </button>
                    </div>
                  )}
                </>
              )}
              {!trash &&
                filtered &&
                rows.length > 0 &&
                !media.hasNextPage &&
                rows.length <= 200 && (
                  <a
                    className="admin-button mt-5"
                    href={`${archive}?ids=${rows.map((m) => m.id).join(",")}`}
                  >
                    <Download size={16} /> Filtrelenen {rows.length} içeriği
                    indir
                  </a>
                )}
              {!trash && filtered && total > 200 && (
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
                  {trash ? (
                    <>
                      <button
                        disabled={busy}
                        className="admin-button"
                        onClick={() => mutate(validSelected, "restore")}
                      >
                        <RotateCcw size={16} /> Geri al
                      </button>
                      <button
                        disabled={busy}
                        className="admin-button danger"
                        onClick={() => requestDelete(validSelected, true)}
                      >
                        <Trash2 size={16} /> Kalıcı sil
                      </button>
                    </>
                  ) : (
                    <button
                      disabled={busy}
                      className="admin-button danger"
                      onClick={() => requestDelete(validSelected)}
                    >
                      <Trash2 size={16} /> Çöp kutusuna taşı
                    </button>
                  )}
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
                <Dialog.Title>
                  {pendingAction === "purge"
                    ? "Kalıcı olarak silinsin mi?"
                    : "Çöp kutusuna taşınsın mı?"}
                </Dialog.Title>
                <Dialog.Description>
                  {pendingAction === "purge" ? (
                    <>
                      {pending.length} içerik veritabanından, R2 depolamadan ve
                      önizlemelerden tamamen silinecek. Bu işlem geri alınamaz.
                    </>
                  ) : (
                    <>
                      {pending.length} içerik albümden kaldırılacak.{" "}
                      {w.trash_days} gün içinde, organizasyonun saklama süresi
                      dolmadıysa geri alabilirsiniz.
                    </>
                  )}
                </Dialog.Description>
                {error && <p role="alert">{error}</p>}
                <div className="admin-actions">
                  <Dialog.Close className="admin-button" disabled={busy}>
                    Vazgeç
                  </Dialog.Close>
                  <button
                    className="admin-button danger"
                    disabled={busy}
                    onClick={() => mutate(pending, pendingAction)}
                  >
                    {busy
                      ? pendingAction === "purge"
                        ? "Siliniyor…"
                        : "Taşınıyor…"
                      : pendingAction === "purge"
                        ? "Kalıcı olarak sil"
                        : "Çöp kutusuna taşı"}
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
