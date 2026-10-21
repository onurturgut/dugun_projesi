"use client";
import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent, type SetStateAction } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Download,
  Play,
  Printer,
  RotateCcw,
  Save,
  Check,
  Sparkles,
  SlidersHorizontal,
  Smartphone,
  Undo2,
  Redo2,
  FileImage,
  FileText,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import { api, type Wedding } from "@/lib/api";
import {
  defaultDesign,
  designMonogram,
  designSchema,
  qrCollectionReferences,
  resolveDesign,
  themes,
  type WeddingDesign,
} from "@/lib/design";
import { weddingTemplateLibrary } from "@/lib/design-libraries/wedding";
import { loadingTemplateLibrary } from "@/lib/design-libraries/loading";
import { buildQrCards, svgDataUrl } from "@/lib/qr-card";
import { qrTemplateLayouts, qrTemplates, resolveQrVariant } from "@/lib/qr-templates";
import { defaultQrProduct, validateQrProduct, withPrintMarks } from "@/lib/qr-products";
import { downloadPdf, downloadPng, downloadSvg } from "@/lib/qr-export";
import { OpeningScene } from "@/components/wedding/OpeningScene";
import { WeddingPageTemplate } from "@/components/wedding/WeddingPageTemplate";
import { ShareMemories } from "@/components/upload/ShareMemories";
import { Field, TextField } from "./Fields";
import styles from "./DesignPanel.module.css";

const qrAssetDataUrlCache = new Map<string, Promise<string>>();
function loadQrAssetDataUrl(path: string) {
  const cached = qrAssetDataUrlCache.get(path);
  if (cached) return cached;
  const pending = fetch(path).then(async (response) => {
    if (!response.ok) throw new Error("QR kartı varlığı yüklenemedi.");
    const blob = await response.blob();
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error("QR kartı varlığı okunamadı."));
      reader.readAsDataURL(blob);
    });
  });
  qrAssetDataUrlCache.set(path, pending);
  return pending;
}

export function DesignPanel({
  event,
  initialPreview = "page",
  surface = "all",
}: {
  event: Wedding;
  initialPreview?: "page" | "opening" | "card";
  surface?: "all" | "page" | "opening" | "card";
}) {
  const qc = useQueryClient();
  const [design, rawSetDesign] = useState(() => resolveDesign(event.design));
  const [saved, setSaved] = useState(() => resolveDesign(event.design));
  const past = useRef<WeddingDesign[]>([]);
  const future = useRef<WeddingDesign[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [workflow, setWorkflow] = useState({
    status: event.design_status || "draft",
    used: event.design_revisions_used || 0,
    limit: event.package_snapshot?.revisionLimit || 1,
  });
  const [url, setUrl] = useState("");
  const [replay, setReplay] = useState(0);
  const [preview, setPreview] = useState<"page" | "opening" | "card">(
    initialPreview,
  );
  const [face, setFace] = useState<"front" | "back">("front");
  const [editingQrField, setEditingQrField] = useState<"qrHook" | "qrDescription" | "qrCta" | "names" | "message" | null>(null);
  const suppressQrClick = useRef(false);
  const [mobilePanel, setMobilePanel] = useState<"controls" | "preview" | null>(
    null,
  );
  const surfaceCopy = {
    all: [
      "SİZİN HİKÂYENİZ, SİZİN RENKLERİNİZ",
      "Davetinize bir imza bırakın.",
      "Açılıştan masanızdaki karta, her detay birbiriyle uyumlu.",
    ],
    page: [
      "WEDDING SAYFASI",
      "Misafir deneyiminizi tasarlayın.",
      "İçerik, tipografi ve yükleme alanını canlı önizlemeyle düzenleyin.",
    ],
    opening: [
      "LOADING / AÇILIŞ",
      "İlk karşılaşmayı unutulmaz yapın.",
      "Açılış sahnesi, tema ve animasyon hızını birlikte yönetin.",
    ],
    card: [
      "QR KARTI",
      "Masanızdaki küçük hatırayı tasarlayın.",
      "Hazır tasarımları birebir görün, renkleri ve metinleri özelleştirin.",
    ],
  }[surface];
  const dirty = JSON.stringify(design) !== JSON.stringify(saved);
  const setDesign = useCallback((next: SetStateAction<WeddingDesign>) => {
    rawSetDesign((current) => {
      const value = typeof next === "function" ? next(current) : next;
      if (JSON.stringify(value) === JSON.stringify(current)) return current;
      past.current = [...past.current.slice(-49), current];
      future.current = [];
      return value;
    });
  }, []);
  const undo = useCallback(() => {
    rawSetDesign((current) => {
      const previous = past.current.at(-1);
      if (!previous) return current;
      past.current = past.current.slice(0, -1);
      future.current = [current, ...future.current].slice(0, 50);
      return previous;
    });
  }, []);
  const redo = useCallback(() => {
    rawSetDesign((current) => {
      const next = future.current[0];
      if (!next) return current;
      future.current = future.current.slice(1);
      past.current = [...past.current.slice(-49), current];
      return next;
    });
  }, []);
  useEffect(() => {
    setUrl(`${window.location.origin}/q/${event.id}`);
  }, [event.id]);
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    const protectNavigation = (e: MouseEvent) => {
      const link = (e.target as Element | null)?.closest("a[href]");
      if (link && !window.confirm("Kaydedilmemiş tasarım değişiklikleri kaybolacak. Sayfadan ayrılsın mı?")) e.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    document.addEventListener("click", protectNavigation, true);
    return () => { window.removeEventListener("beforeunload", warn); document.removeEventListener("click", protectNavigation, true); };
  }, [dirty]);
  useEffect(() => {
    const shortcuts = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || e.key.toLowerCase() !== "z") return;
      e.preventDefault();
      if (e.shiftKey) redo(); else undo();
    };
    window.addEventListener("keydown", shortcuts);
    return () => window.removeEventListener("keydown", shortcuts);
  }, [redo, undo]);
  const [cards, setCards] = useState<ReturnType<typeof buildQrCards> | null>(null);
  const selectedQrVariant = resolveQrVariant(design.qrTemplateId, design.qrColorVariant);
  const selectedQrLayout = qrTemplateLayouts[design.qrTemplateId];
  const selectedQrTemplate = qrTemplates[design.qrTemplateId];
  const selectedQrSize = Math.min(design.qrLayout.qr.width, design.qrLayout.qr.height) * (selectedQrLayout.qr.size / 196);
  const selectedQrX = selectedQrLayout.qr.x + design.qrLayout.qr.x + (selectedQrLayout.qr.size - selectedQrSize) / 2;
  const selectedQrY = selectedQrLayout.qr.y + design.qrLayout.qr.y + (selectedQrLayout.qr.size - selectedQrSize) / 2;
  const usesFlatBackground = design.qrColorVariant === selectedQrTemplate.defaultVariant;
  const selectedFrontBackground = usesFlatBackground ? selectedQrTemplate.flatBackground : selectedQrVariant.front;
  const selectedBackBackground = usesFlatBackground ? selectedQrTemplate.flatBackground : selectedQrVariant.back;
  useEffect(() => {
    if (!url) return;
    let active = true;
    Promise.all([
      loadQrAssetDataUrl(selectedFrontBackground),
      loadQrAssetDataUrl(selectedBackBackground),
      loadQrAssetDataUrl("/fonts/qr/cormorant-garamond-500.ttf"),
      loadQrAssetDataUrl("/fonts/qr/cormorant-garamond-500-italic.ttf"),
      loadQrAssetDataUrl("/fonts/qr/cinzel-600.ttf"),
      loadQrAssetDataUrl("/fonts/qr/allura-400.ttf"),
      loadQrAssetDataUrl("/fonts/qr/manrope-400.ttf"),
    ])
      .then(([front, back, cormorant, cormorantItalic, cinzel, allura, manrope]) => {
        if (active) setCards(buildQrCards(design, event.title, event.wedding_date, url, { front, back, fonts: { cormorant, cormorantItalic, cinzel, allura, manrope } }));
      })
      .catch((reason: Error) => {
        if (active) setError(reason.message);
      });
    return () => { active = false; };
  }, [design, event.title, event.wedding_date, selectedBackBackground, selectedFrontBackground, url]);
  const printCards = useMemo(() => cards ? {
    front: withPrintMarks(cards.front, defaultQrProduct),
    back: withPrintMarks(cards.back, defaultQrProduct),
  } : null, [cards]);
  const productValidation = useMemo(
    () => validateQrProduct(defaultQrProduct, design, url),
    [design, url],
  );
  function update<K extends keyof WeddingDesign>(
    key: K,
    value: WeddingDesign[K],
  ) {
    setDesign((current) => ({ ...current, [key]: value }));
    setError("");
  }
  function beginQrTransform(event: ReactPointerEvent<HTMLElement>, key: keyof WeddingDesign["qrLayout"], mode: "move" | "resize") {
    event.preventDefault();
    event.stopPropagation();
    const canvas = event.currentTarget.closest<HTMLElement>("[data-qr-canvas]");
    if (!canvas) return;
    const bounds = canvas.getBoundingClientRect();
    const startX = event.clientX, startY = event.clientY;
    const initial = design.qrLayout[key];
    let moved = false;
    past.current = [...past.current.slice(-49), design];
    future.current = [];
    const move = (pointer: PointerEvent) => {
      const dx = (pointer.clientX - startX) * (780 / bounds.width);
      const dy = (pointer.clientY - startY) * (1040 / bounds.height);
      if (Math.abs(dx) + Math.abs(dy) > 3) moved = true;
      rawSetDesign((current) => {
        const currentElement = current.qrLayout[key];
        const nextElement = mode === "move"
          ? { ...currentElement, x: Math.max(-300, Math.min(300, initial.x + dx)), y: Math.max(-400, Math.min(400, initial.y + dy)) }
          : { ...currentElement, width: Math.max(80, Math.min(600, initial.width + dx * 2)), height: Math.max(40, Math.min(500, initial.height + dy * 2)) };
        if (key === "qr" && mode === "resize") {
          const size = Math.max(100, Math.min(340, Math.min(nextElement.width, nextElement.height)));
          nextElement.width = size;
          nextElement.height = size;
        }
        return { ...current, qrLayout: { ...current.qrLayout, [key]: nextElement } };
      });
    };
    const end = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", end);
      suppressQrClick.current = moved;
      window.setTimeout(() => { suppressQrClick.current = false; }, 0);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", end, { once: true });
  }
  async function save() {
    const result = designSchema.safeParse(design);
    if (!result.success) {
      setError(result.error.issues[0].message);
      return;
    }
    setBusy(true);
    setError("");
    try {
      const response = await api<{ design: WeddingDesign; snapshot_id: string; revision: number; design_status: typeof workflow.status; design_revisions_used: number }>(
        `/admin/weddings/${event.id}/design`,
        { method: "PUT", body: JSON.stringify(result.data) },
      );
      setSaved(response.design);
      rawSetDesign(response.design);
      past.current = [];
      future.current = [];
      setWorkflow((current) => ({ ...current, status: response.design_status, used: response.design_revisions_used }));
      qc.setQueryData<Wedding>(["admin-wedding", event.id], (current) =>
        current ? { ...current, design: response.design, design_status: response.design_status, design_revisions_used: response.design_revisions_used } : current,
      );
      await qc.invalidateQueries({ queryKey: ["wedding", event.slug] });
      toast.success(`Tasarım kaydedildi · sürüm ${response.revision}`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function approveForPrint() {
    if (dirty) return setError("Baskı onayından önce değişiklikleri kaydedin.");
    setBusy(true); setError("");
    try {
      const response = await api<{ design_status: typeof workflow.status; design_revisions_used: number }>(`/admin/weddings/${event.id}/design/approve`, { method: "POST" });
      setWorkflow((current) => ({ ...current, status: response.design_status, used: response.design_revisions_used }));
      qc.setQueryData<Wedding>(["admin-wedding", event.id], (current) => current ? { ...current, design_status: response.design_status, design_revisions_used: response.design_revisions_used } : current);
      toast.success("Tasarım baskı için onaylandı ve kilitlendi.");
    } catch (reason) { setError((reason as Error).message); } finally { setBusy(false); }
  }
  async function requestRevision() {
    const reason = window.prompt("Revizyon nedenini yazın (en az 5 karakter):")?.trim();
    if (!reason) return;
    setBusy(true); setError("");
    try {
      const response = await api<{ design_status: typeof workflow.status; design_revisions_used: number; design_revision_limit: number }>(`/admin/weddings/${event.id}/design/request-revision`, { method: "POST", body: JSON.stringify({ reason }) });
      setWorkflow({ status: response.design_status, used: response.design_revisions_used, limit: response.design_revision_limit });
      qc.setQueryData<Wedding>(["admin-wedding", event.id], (current) => current ? { ...current, design_status: response.design_status, design_revisions_used: response.design_revisions_used, design_revision_reason: reason } : current);
      toast.success(`Revizyon açıldı · ${response.design_revisions_used}/${response.design_revision_limit} hak kullanıldı.`);
    } catch (requestError) { setError((requestError as Error).message); } finally { setBusy(false); }
  }
  async function exportCard(format: "svg" | "png" | "pdf", side: "front" | "back") {
    if (!printCards || !productValidation.passed) return;
    const name = `${event.slug}-${defaultQrProduct.id}-${side === "front" ? "on" : "arka"}.${format}`;
    try {
      if (format === "svg") downloadSvg(printCards[side], name);
      else if (format === "png") await downloadPng(printCards[side], defaultQrProduct, name);
      else await downloadPdf(printCards[side], defaultQrProduct, name);
    } catch (reason) {
      setError((reason as Error).message);
    }
  }
  function print() {
    if (!printCards) return;
    const popup = window.open("", "_blank", "width=900,height=800");
    if (!popup) {
      setError("Yazdırma önizlemesi için açılır pencerelere izin verin.");
      return;
    }
    popup.opener = null;
    popup.document.title = `${event.title} — QR kartı`;
    const style = popup.document.createElement("style");
    style.textContent =
      "@page{size:150mm 200mm;margin:0}*{box-sizing:border-box}body{margin:0;background:#ddd}img{display:block;width:150mm;height:200mm;margin:12px auto;break-after:page}button,p{display:block;margin:16px auto;text-align:center;font:14px system-ui}button{padding:12px 24px;cursor:pointer}@media print{body{background:white}button,p{display:none}img{margin:0}img:last-child{break-after:auto}}";
    popup.document.head.append(style);
    const note = popup.document.createElement("p");
    note.textContent =
      "150 × 200 mm · %100 ölçek · Kenar boşluğu yok. Çift taraflı baskıda uzun kenardan çevirin.";
    const button = popup.document.createElement("button");
    button.textContent = "Yazdır / PDF olarak kaydet";
    button.onclick = () => popup.print();
    popup.document.body.append(note, button);
    for (const side of ["front", "back"] as const) {
      const image = popup.document.createElement("img");
      image.alt = side === "front" ? "Ön yüz" : "Arka yüz";
      image.src = svgDataUrl(printCards[side]);
      popup.document.body.append(image);
    }
  }
  const palette = themes[design.intro === "video" ? "burgundy" : design.theme];
  return (
    <section className={styles.studio} aria-label="Tasarım stüdyosu">
      <header className={styles.header}>
        <div>
          <p className={styles.kicker}>{surfaceCopy[0]}</p>
          <h2>{surfaceCopy[1]}</h2>
          <p>{surfaceCopy[2]}</p>
        </div>
        <div className={styles.headerActions}>
          <button type="button" onClick={undo} disabled={!past.current.length || busy} title="Geri al (Ctrl+Z)"><Undo2 size={16} /> Geri al</button>
          <button type="button" onClick={redo} disabled={!future.current.length || busy} title="Yinele (Ctrl+Shift+Z)"><Redo2 size={16} /> Yinele</button>
          <span className={styles.badge}><Sparkles size={14} /> Studio v2</span>
        </div>
      </header>
      <div className={styles.mobileDock}>
        <button
          type="button"
          aria-pressed={mobilePanel === "controls"}
          onClick={() =>
            setMobilePanel((value) =>
              value === "controls" ? null : "controls",
            )
          }
        >
          <SlidersHorizontal size={17} /> Tasarım araçları
        </button>
        <button
          type="button"
          aria-pressed={mobilePanel === "preview"}
          onClick={() =>
            setMobilePanel((value) => (value === "preview" ? null : "preview"))
          }
        >
          <Smartphone size={17} /> Canlı önizleme
        </button>
      </div>
      {mobilePanel ? (
        <button
          type="button"
          className={styles.mobileBackdrop}
          aria-label="Paneli kapat"
          onClick={() => setMobilePanel(null)}
        />
      ) : null}
      <div className={styles.layout}>
        <fieldset
          className={`${styles.controls} ${mobilePanel === "controls" ? styles.mobileOpen : ""}`}
          disabled={busy || workflow.status === "approved_for_print"}
        >
          {(surface === "all" || surface === "page") && (
            <>
              <div className={styles.step}>
                <span>01</span>
                <div>
                  <h3>Wedding sayfası</h3>
                  <p>
                    Misafirlerin göreceği sayfa tasarımını ve metinlerini
                    belirleyin.
                  </p>
                </div>
              </div>
              <div
                className={styles.pageTemplates}
                aria-label="Wedding sayfası şablonu"
              >
                {weddingTemplateLibrary.map(({ id, name, description }) => (
                  <button
                    key={id}
                    type="button"
                    aria-pressed={design.pageTemplate === id}
                    onClick={() => {
                      update(
                        "pageTemplate",
                        id as WeddingDesign["pageTemplate"],
                      );
                      setPreview("page");
                    }}
                  >
                    {event.cover_images?.[0] ? (
                      <Image
                        src={event.cover_images[0]}
                        alt=""
                        width={320}
                        height={200}
                        unoptimized
                      />
                    ) : null}
                    <span aria-hidden="true">▦</span>
                    <strong>{name}</strong>
                    <small>{description}</small>
                  </button>
                ))}
              </div>
              <Field
                label="Logo altındaki metin"
                value={design.brandTagline}
                maxLength={100}
                onChange={(e) => update("brandTagline", e.target.value)}
              />
              <Field
                label="Ana başlık"
                value={design.pageHeading}
                maxLength={100}
                onChange={(e) => update("pageHeading", e.target.value)}
              />
              <TextField
                label="Ana açıklama"
                value={design.pageMessage}
                maxLength={240}
                onChange={(e) => update("pageMessage", e.target.value)}
              />
              <Field
                label="Yükleme alanı başlığı"
                value={design.uploadTitle}
                maxLength={100}
                onChange={(e) => update("uploadTitle", e.target.value)}
              />
              <Field
                label="Yükleme alanı açıklaması"
                value={design.uploadPrompt}
                maxLength={160}
                onChange={(e) => update("uploadPrompt", e.target.value)}
              />
            </>
          )}
          <div className={styles.divider} />
          {(surface === "all" || surface === "opening") && (
            <>
              <div className={styles.step}>
                <span>02</span>
                <div>
                  <h3>İlk karşılaşma</h3>
                  <p>Davetinizin nasıl başlayacağını belirleyin.</p>
                </div>
              </div>
              <div className={styles.options}>
                {loadingTemplateLibrary.map(({ id, name }) => (
                  <button
                    key={id}
                    type="button"
                    aria-pressed={design.intro === id}
                    onClick={() => {
                      setDesign((current) => ({
                        ...current,
                        intro: id as WeddingDesign["intro"],
                        ...(id === "video"
                          ? { theme: "burgundy" as const }
                          : {}),
                      }));
                      setReplay((n) => n + 1);
                    }}
                  >
                    <span>
                      {id === "curtain"
                        ? "❧"
                        : id === "monogram"
                          ? "H · O"
                          : id === "fade"
                            ? "✧"
                            : "▶"}
                    </span>
                    {name}
                  </button>
                ))}
              </div>
              {design.intro === "video" && (
                <p className={styles.note}>
                  Mevcut video bordo renkte ve H–O monogramlıdır. Kendi baş
                  harfleriniz için perde, monogram veya sade geçişi seçin.
                </p>
              )}
              <label className={styles.range}>
                Animasyon hızı{" "}
                <strong>{design.speed.toLocaleString("tr")}×</strong>
                <input
                  aria-label="Animasyon hızı"
                  type="range"
                  min="0.75"
                  max="2"
                  step="0.25"
                  value={design.speed}
                  onChange={(e) => update("speed", Number(e.target.value))}
                />
              </label>
            </>
          )}
          <div className={styles.divider} />
          {(surface === "all" || surface === "card") && (
            <>
              <div className={styles.step}>
                <span>03</span>
                <div>
                  <h3>Masanızdaki küçük hatıra</h3>
                  <p>QR kartınızın stilini ve renklerini seçin.</p>
                </div>
              </div>
              <div className={styles.referenceGallery} aria-label="QR kartı tasarımları">
                {qrCollectionReferences.map((item) => (
                  <button type="button" key={item.id} aria-pressed={design.qrTemplateId === item.id} onClick={() => { setDesign((current) => ({ ...current, qrTemplateId: item.id, qrColorVariant: qrTemplates[item.id].defaultVariant })); setPreview("card"); setFace("front"); }}>
                    <img src={item.image} alt={`${item.name} ürün mockup'ı`} width={768} height={768} />
                    <span><b>{item.number}</b><strong>{item.name}</strong><small>{item.tagline}</small></span>
                    {design.qrTemplateId === item.id && <i><Check size={14} /> Seçildi</i>}
                  </button>
                ))}
              </div>
              <div className={styles.collectionCard}>
                <div><span>RENK</span><strong>{qrTemplates[design.qrTemplateId].name}</strong><small>5 hazır varyasyon</small></div>
                <p>Tasarımın renk varyasyonunu seçin. Yazılarınız seçtiğiniz zemine göre otomatik olarak okunaklı kalır.</p>
              </div>
              <div className={styles.presetChoices} aria-label={`${qrTemplates[design.qrTemplateId].name} renk seçenekleri`}>
                {qrTemplates[design.qrTemplateId].variants.map((variant) => (
                  <button type="button" key={variant.id} aria-pressed={design.qrColorVariant === variant.id} onClick={() => { update("qrColorVariant", variant.id); setPreview("card"); }}>
                    <span style={{ background: variant.swatch }} />
                    <strong>{variant.name}</strong>
                    {design.qrColorVariant === variant.id ? <small>Seçildi</small> : null}
                  </button>
                ))}
              </div>
              <Field label="Hook" value={design.qrHook} maxLength={72} onChange={(event) => update("qrHook", event.target.value)} />
              <TextField label="Açıklama" value={design.qrDescription} maxLength={110} onChange={(event) => update("qrDescription", event.target.value)} />
              <Field label="CTA" value={design.qrCta} maxLength={48} onChange={(event) => update("qrCta", event.target.value)} />
              <div className={styles.divider} />
              <div className={styles.step}>
                <span>04</span>
                <div>
                  <h3>Size ait kelimeler</h3>
                  <p>
                    Boş bıraktığınız isim ve baş harfler organizasyondan alınır.
                  </p>
                </div>
              </div>
              <Field
                label="Görünen isimler"
                value={design.names}
                placeholder={event.title}
                maxLength={100}
                onChange={(e) => update("names", e.target.value)}
              />
              <Field
                label="Baş harfler / monogram"
                value={design.monogram}
                placeholder={designMonogram(
                  { ...design, monogram: "" },
                  event.title,
                )}
                maxLength={8}
                onChange={(e) => update("monogram", e.target.value)}
              />
              <TextField
                label="Kartın arkasındaki teşekkür metni"
                value={design.message}
                maxLength={240}
                onChange={(e) => update("message", e.target.value)}
              />
              <small className={styles.counter}>
                {design.message.length} / 240
              </small>
            </>
          )}
        </fieldset>
        <aside
          className={`${styles.previewColumn} ${mobilePanel === "preview" ? styles.mobileOpen : ""}`}
        >
          <div className={styles.previewTop}>
            <p>CANLI ÖNİZLEME</p>
            <span>
              {dirty ? "Kaydedilmemiş değişiklikler" : "Kaydedilen tasarım"}
            </span>
          </div>
          <div className={styles.previewTabs}>
            <button
              type="button"
              aria-pressed={preview === "page"}
              onClick={() => setPreview("page")}
            >
              Wedding sayfası
            </button>
            <button
              type="button"
              aria-pressed={preview === "opening"}
              onClick={() => setPreview("opening")}
            >
              Açılış
            </button>
            <button
              type="button"
              aria-pressed={preview === "card"}
              onClick={() => setPreview("card")}
            >
              QR kartı
            </button>
          </div>
          <div className={styles.previewStage}>
            {preview === "page" ? (
              <div className={styles.livePageViewport} aria-hidden="true">
                <div className={styles.livePageCanvas}>
                  <WeddingPageTemplate
                    preview
                    design={design}
                    images={
                      event.cover_images?.length
                        ? event.cover_images
                        : ["/covers/couple-1.jpg"]
                    }
                    title={event.title}
                    date={event.wedding_date}
                  >
                    <ShareMemories
                      weddingId={`preview-${event.id}`}
                      title={design.uploadTitle}
                      prompt={design.uploadPrompt}
                    />
                  </WeddingPageTemplate>
                </div>
              </div>
            ) : preview === "opening" ? (
              <div
                className={styles.phone}
                style={
                  {
                    "--preview-ink": palette.ink,
                    "--preview-base": palette.base,
                  } as CSSProperties
                }
              >
                <div
                  className={styles.phoneScene}
                  key={`${replay}-${design.intro}-${design.theme}-${design.speed}`}
                >
                  {design.intro === "video" ? (
                    <video
                      src="/intro/shineqr-portrait-v2.mp4"
                      poster="/intro/shineqr-portrait-v2-poster.jpg"
                      autoPlay
                      muted
                      playsInline
                      onLoadedMetadata={(e) => {
                        e.currentTarget.playbackRate = design.speed;
                      }}
                    />
                  ) : (
                    <OpeningScene design={design} title={event.title} />
                  )}
                </div>
                <div className={styles.phoneBrand}>
                  <Image
                    src="/brand/shineqr-lockup.png"
                    alt="ShineQR"
                    width={360}
                    height={240}
                  />
                  <small>BİR GÜN. BİR ÖMÜR HATIRA.</small>
                </div>
              </div>
            ) : cards ? (
              <div className={styles.cardEditor}>
                <div className={styles.cardCanvas} data-qr-canvas>
                  <img className={styles.card} src={svgDataUrl(cards[face])} width={630} height={888} alt={face === "front" ? "QR kartı ön yüz önizlemesi" : "QR kartı arka yüz önizlemesi"} />
                  {(face === "front" ? [
                    ["qrHook", "Ana başlığı düzenle", selectedQrLayout.title.y - 52, selectedQrLayout.title.size * selectedQrLayout.title.maxLines],
                    ["qrDescription", "Açıklamayı düzenle", selectedQrLayout.description.y - 30, selectedQrLayout.description.size * selectedQrLayout.description.maxLines + 20],
                    ["qrCta", "QR yönlendirme metnini düzenle", selectedQrLayout.ctaY - 28, 55],
                    ["names", "İsimleri düzenle", selectedQrLayout.namesY - 32, 70],
                  ] : [
                    ["message", "Teşekkür metnini düzenle", 245, 260],
                    ["names", "İsimleri düzenle", 775, 90],
                  ]).map(([field, label, top]) => {
                    const layoutKey = field as keyof WeddingDesign["qrLayout"];
                    const box = design.qrLayout[layoutKey];
                    return <button key={`${face}-${field}`} type="button" className={styles.editHotspot} style={{ left: `${((selectedQrLayout.contentX + box.x - box.width / 2) / 780) * 100}%`, top: `${((Number(top) + box.y) / 1040) * 100}%`, width: `${(box.width / 780) * 100}%`, height: `${(box.height / 1040) * 100}%` }} aria-label={String(label)} aria-pressed={editingQrField === field} onPointerDown={(event) => beginQrTransform(event, layoutKey, "move")} onClick={() => { if (!suppressQrClick.current) setEditingQrField(field as typeof editingQrField); }}>
                      <span>{label} · Sürükleyerek taşıyın</span>
                      <i aria-label="Alanı kırp" title="Alanı kırp / yeniden boyutlandır" onPointerDown={(event) => beginQrTransform(event, layoutKey, "resize")} />
                    </button>;
                  })}
                  {face === "front" ? <button type="button" className={`${styles.editHotspot} ${styles.qrHotspot}`} style={{ left: `${(selectedQrX / 780) * 100}%`, top: `${(selectedQrY / 1040) * 100}%`, width: `${(selectedQrSize / 780) * 100}%`, height: `${(selectedQrSize / 1040) * 100}%` }} aria-label="Organizasyon QR kodunu taşı" onPointerDown={(event) => beginQrTransform(event, "qr", "move")}>
                    <span>Organizasyon QR kodu · Sürükleyerek taşıyın</span>
                    <i aria-label="QR kodunu boyutlandır" title="QR kodunu boyutlandır" onPointerDown={(event) => beginQrTransform(event, "qr", "resize")} />
                  </button> : null}
                  {face === "front" ? ([
                    ["icons", "İkon grubunu taşı ve boyutlandır", selectedQrLayout.iconsY],
                    ["divider", "Ayırıcı çizgiyi taşı ve boyutlandır", selectedQrLayout.dividerY],
                  ] as const).map(([layoutKey, label, baseY]) => {
                    const box = design.qrLayout[layoutKey];
                    return <button key={layoutKey} type="button" className={`${styles.editHotspot} ${styles.graphicHotspot}`} style={{ left: `${((selectedQrLayout.contentX + box.x - box.width / 2) / 780) * 100}%`, top: `${((baseY + box.y - box.height / 2) / 1040) * 100}%`, width: `${(box.width / 780) * 100}%`, height: `${(box.height / 1040) * 100}%` }} aria-label={label} onPointerDown={(event) => beginQrTransform(event, layoutKey, "move")}>
                      <span>{label}</span>
                      <i aria-label={`${label}: yeniden boyutlandır`} title="Yeniden boyutlandır" onPointerDown={(event) => beginQrTransform(event, layoutKey, "resize")} />
                    </button>;
                  }) : null}
                </div>
                {editingQrField ? (
                  <label className={styles.inlineEditor}>
                    <span>{({ qrHook: "Ana başlık", qrDescription: "Açıklama", qrCta: "QR yönlendirme metni", names: "İsimler", message: "Teşekkür metni" } as const)[editingQrField]}</span>
                    <textarea autoFocus rows={editingQrField === "message" || editingQrField === "qrDescription" ? 3 : 2} maxLength={({ qrHook: 72, qrDescription: 110, qrCta: 48, names: 100, message: 240 } as const)[editingQrField]} value={design[editingQrField]} onChange={(event) => update(editingQrField, event.target.value)} onBlur={() => setEditingQrField(null)} onKeyDown={(event) => { if (event.key === "Escape") setEditingQrField(null); }} />
                    <small>Kartın dışına tıklayarak veya Esc tuşuyla tamamlayın.</small>
                  </label>
                ) : <p className={styles.editHint}>Düzenlemek istediğiniz yazının üzerine tıklayın.</p>}
                {face === "front" ? <button type="button" className={styles.nextFace} onClick={() => { setFace("back"); setEditingQrField(null); }}>Ön yüzü tamamla ve arka yüze geç →</button> : <button type="button" className={styles.nextFace} onClick={() => { setFace("front"); setEditingQrField(null); }}>← Ön yüze dön</button>}
              </div>
            ) : (
              <p role="status">Kart hazırlanıyor…</p>
            )}
          </div>
          {preview === "opening" ? (
            <button
              type="button"
              className={styles.replay}
              onClick={() => setReplay((n) => n + 1)}
            >
              <Play size={14} /> Açılışı yeniden oynat
            </button>
          ) : preview === "card" ? (
            <div className={styles.previewTabs}>
              <button
                type="button"
                aria-pressed={face === "front"}
                onClick={() => { setFace("front"); setEditingQrField(null); }}
              >
                Ön yüz
              </button>
              <button
                type="button"
                aria-pressed={face === "back"}
                onClick={() => { setFace("back"); setEditingQrField(null); }}
              >
                Arka yüz
              </button>
            </div>
          ) : null}
          <div className={styles.export}>
            <h3>Baskıya hazır hatıranız</h3>
            <p>{defaultQrProduct.name} · {defaultQrProduct.trimWidthMm} × {defaultQrProduct.trimHeightMm} mm · {defaultQrProduct.bleedMm} mm bleed · {defaultQrProduct.dpi} DPI</p>
            <div className={styles.validation}>
              {productValidation.checks.map((check) => <span key={check.id} data-pass={check.passed}><ShieldCheck size={12} /> {check.label}</span>)}
            </div>
            <div className={styles.exportGrid}>
              {(["front", "back"] as const).map((side) => (
                <div key={side}>
                  <strong>{side === "front" ? "Ön yüz · QR" : "Arka yüz"}</strong>
                  <button type="button" disabled={!printCards || !productValidation.passed} onClick={() => void exportCard("svg", side)}><Download size={14} /> SVG</button>
                  <button type="button" disabled={!printCards || !productValidation.passed} onClick={() => void exportCard("png", side)}><FileImage size={14} /> PNG</button>
                  <button type="button" disabled={!printCards || !productValidation.passed} onClick={() => void exportCard("pdf", side)}><FileText size={14} /> PDF</button>
                </div>
              ))}
              <button type="button" disabled={!printCards} onClick={print}><Printer size={14} /> Baskı önizlemesi</button>
            </div>
            <small>
              Sabit hedef: {url || "hazırlanıyor…"}. Tasarım veya sayfa adresi değişse bile basılı QR değişmez.
            </small>
          </div>
        </aside>
      </div>
      <footer className={styles.saveBar}>
        <div>
          <strong>
            {dirty ? "Son dokunuşlarınız hazır." : "Her detay yerli yerinde."}
          </strong>
          <p>
            {dirty
              ? "Kaydettiğinizde misafir sayfanızda görünür."
              : "İndirmeler ekrandaki tasarımı kullanır."}
          </p>
          {error && (
            <p role="alert" className={styles.error}>
              {error}
            </p>
          )}
          <div className={styles.revisionStatus} data-status={workflow.status}><ShieldCheck size={14} /><span>{workflow.status === "approved_for_print" ? "Baskı onaylı · tasarım kilitli" : workflow.status === "revision_requested" ? "Revizyon düzenlemeye açık" : "İlk tasarım hazırlanıyor"} · Revizyon hakkı {workflow.used}/{workflow.limit}</span></div>
        </div>
        <div className={styles.saveActions}>
          <button
            type="button"
            className="admin-button"
            disabled={busy || workflow.status === "approved_for_print"}
            onClick={() => {
              setDesign({ ...defaultDesign, intro: "curtain" });
              setReplay((n) => n + 1);
            }}
          >
            <RotateCcw size={15} /> Varsayılana dön
          </button>
          <button
            type="button"
            className="admin-button primary"
            disabled={busy || !dirty || workflow.status === "approved_for_print"}
            onClick={save}
          >
            <Save size={16} /> {busy ? "Kaydediliyor…" : "Tasarımı kaydet"}
          </button>
          {workflow.status === "approved_for_print" ? <button type="button" className="admin-button primary" disabled={busy || workflow.used >= workflow.limit} onClick={requestRevision}><RotateCcw size={15} /> Revizyon iste</button> : <button type="button" className="admin-button" disabled={busy || dirty || !event.design} onClick={approveForPrint}><ShieldCheck size={15} /> Baskı için onayla</button>}
        </div>
      </footer>
    </section>
  );
}
