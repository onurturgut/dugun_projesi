"use client";
import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type SetStateAction } from "react";
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
  cardTemplates,
  defaultDesign,
  designMonogram,
  designSchema,
  editorialFontPairIds,
  editorialPresets,
  qrCollectionReferences,
  resolveDesign,
  themeIds,
  themes,
  type WeddingDesign,
} from "@/lib/design";
import { qrTemplateLibrary } from "@/lib/design-libraries/qr";
import { weddingTemplateLibrary } from "@/lib/design-libraries/wedding";
import { loadingTemplateLibrary } from "@/lib/design-libraries/loading";
import { buildQrCards, svgDataUrl } from "@/lib/qr-card";
import { defaultQrProduct, validateQrProduct, withPrintMarks } from "@/lib/qr-products";
import { downloadPdf, downloadPng, downloadSvg } from "@/lib/qr-export";
import { OpeningScene } from "@/components/wedding/OpeningScene";
import { WeddingPageTemplate } from "@/components/wedding/WeddingPageTemplate";
import { ShareMemories } from "@/components/upload/ShareMemories";
import { Field, TextField } from "./Fields";
import styles from "./DesignPanel.module.css";

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
  const [url, setUrl] = useState("");
  const [replay, setReplay] = useState(0);
  const [preview, setPreview] = useState<"page" | "opening" | "card">(
    initialPreview,
  );
  const [face, setFace] = useState<"front" | "back">("front");
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
  const cards = useMemo(
    () =>
      url ? buildQrCards(design, event.title, event.wedding_date, url) : null,
    [design, event.title, event.wedding_date, url],
  );
  const selectedQrPreset = useMemo(
    () => qrTemplateLibrary.find((preset) => design.cardTemplate === preset.template && design.cardTheme === preset.theme && design.customColors && design.primary.toLowerCase() === preset.primary.toLowerCase() && design.accent.toLowerCase() === preset.accent.toLowerCase()),
    [design],
  );
  const qrPresetPreviews = useMemo(
    () => new Map(qrTemplateLibrary.map((preset) => {
      const presetDesign: WeddingDesign = { ...design, cardTemplate: preset.template, linked: false, cardTheme: preset.theme, customColors: true, primary: preset.primary, accent: preset.accent };
      return [preset.id, svgDataUrl(buildQrCards(presetDesign, event.title, event.wedding_date, url || "https://shineqr.example/q/preview").front)] as const;
    })),
    [design, event.title, event.wedding_date, url],
  );
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
  async function save() {
    const result = designSchema.safeParse(design);
    if (!result.success) {
      setError(result.error.issues[0].message);
      return;
    }
    setBusy(true);
    setError("");
    try {
      const response = await api<{ design: WeddingDesign; snapshot_id: string; revision: number }>(
        `/admin/weddings/${event.id}/design`,
        { method: "PUT", body: JSON.stringify(result.data) },
      );
      setSaved(response.design);
      rawSetDesign(response.design);
      past.current = [];
      future.current = [];
      qc.setQueryData<Wedding>(["admin-wedding", event.id], (current) =>
        current ? { ...current, design: response.design } : current,
      );
      await qc.invalidateQueries({ queryKey: ["wedding", event.slug] });
      toast.success(`Tasarım kaydedildi · sürüm ${response.revision}`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
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
          disabled={busy}
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
          <div className={styles.step}>
            <span>02</span>
            <div>
              <h3>Renk hikâyeniz</h3>
              <p>Açılış ve misafir sayfanızın temasını seçin.</p>
            </div>
          </div>
          <div className={styles.themes} aria-label="Renk teması">
            {themeIds.map((id) => (
              <button
                key={id}
                type="button"
                aria-pressed={design.theme === id}
                onClick={() => {
                  setDesign((current) => ({
                    ...current,
                    theme: id,
                    ...(id !== "burgundy" && current.intro === "video"
                      ? { intro: "curtain" as const }
                      : {}),
                  }));
                  setReplay((n) => n + 1);
                }}
                className={styles.theme}
              >
                <span
                  style={{
                    background: `linear-gradient(135deg, ${themes[id].light}, ${themes[id].base})`,
                    color: themes[id].ink,
                  }}
                >
                  {design.theme === id ? <Check size={18} /> : <span>✦</span>}
                </span>
                {themes[id].name}
              </button>
            ))}
          </div>
          <div className={styles.divider} />
          {(surface === "all" || surface === "opening") && (
            <>
              <div className={styles.step}>
                <span>03</span>
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
                <span>04</span>
                <div>
                  <h3>Masanızdaki küçük hatıra</h3>
                  <p>QR kartınızın stilini ve renklerini seçin.</p>
                </div>
              </div>
              <div className={styles.referenceGallery} aria-label="ZIP dosyasındaki QR tasarımları">
                {qrCollectionReferences.map((item) => (
                  <button type="button" key={item.id} aria-pressed={design.qrTemplateId === item.id} onClick={() => { update("qrTemplateId", item.id); setPreview("card"); setFace("front"); }}>
                    <img src={item.image} alt={`${item.name} ürün mockup'ı`} width={768} height={768} />
                    <span><b>{item.number}</b><strong>{item.name}</strong><small>{item.tagline}</small></span>
                    {design.qrTemplateId === item.id && <i><Check size={14} /> Seçildi</i>}
                  </button>
                ))}
              </div>
              <div className={styles.collectionCard}>
                <div><span>01</span><strong>THE EDITORIAL</strong><small>Yayınlanmış · Sürüm 1</small></div>
                <p>Zamansız editoryal tipografi, dokulu kâğıt yüzey ve özgün mimari katmanlar.</p>
              </div>
              <div className={styles.presetChoices} aria-label="The Editorial renk presetleri">
                {Object.entries(editorialPresets).map(([id, preset]) => (
                  <button type="button" key={id} aria-pressed={design.qrPresetId === id} onClick={() => { update("qrPresetId", id as WeddingDesign["qrPresetId"]); setPreview("card"); }}>
                    <span style={{ background: preset.gradient }} />
                    <strong>{preset.name}</strong><small>{preset.primary}</small>
                  </button>
                ))}
              </div>
              <label className="form-field">
                <span>Onaylı font eşleşmesi</span>
                <select value={design.qrFontPairId} onChange={(event) => update("qrFontPairId", event.target.value as WeddingDesign["qrFontPairId"])}>
                  {editorialFontPairIds.map((id) => <option key={id} value={id}>{id === "cormorant-manrope" ? "Cormorant Garamond + Manrope" : "Prata + Manrope"}</option>)}
                </select>
              </label>
              <Field label="Hook" value={design.qrHook} maxLength={72} onChange={(event) => update("qrHook", event.target.value)} />
              <TextField label="Açıklama" value={design.qrDescription} maxLength={110} onChange={(event) => update("qrDescription", event.target.value)} />
              <Field label="CTA" value={design.qrCta} maxLength={48} onChange={(event) => update("qrCta", event.target.value)} />
              <p className={styles.presetHint}>Aşağıdaki eski presetler geriye dönük organizasyon uyumluluğu için geçici olarak görünür kalır; yeni baskı motoru The Editorial kompozisyonunu kullanır.</p>
              <div className={styles.legacyQrControls}>
              <div
                className={styles.presetGrid}
                aria-label="Hazır QR kartı tasarımları"
              >
                {qrTemplateLibrary.map((preset) => {
                  const selected = selectedQrPreset?.id === preset.id;
                  return (
                    <button
                      type="button"
                      key={preset.id}
                      aria-pressed={selected}
                      onClick={() => {
                        setDesign((current) => ({
                          ...current,
                          cardTemplate: preset.template,
                          linked: false,
                          cardTheme: preset.theme,
                          customColors: true,
                          primary: preset.primary,
                          accent: preset.accent,
                        }));
                        setPreview("card");
                      }}
                    >
                      <img
                        src={qrPresetPreviews.get(preset.id)}
                        alt={`${preset.name} QR kartı gerçek baskı önizlemesi`}
                        width={630}
                        height={888}
                      />
                      <span>{preset.name}</span>
                      {selected && (
                        <span className={styles.presetCheck} aria-hidden="true">
                          <Check size={14} />
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
              <p className={styles.presetHint}>
                Hazır tasarım; kart stilini, temasını ve renklerini birlikte
                uygular. Aşağıdaki kontrollerle son dokunuşları yapabilirsiniz.
              </p>
              <div className={styles.templates}>
                {Object.entries(cardTemplates).map(([id, name]) => (
                  <button
                    type="button"
                    key={id}
                    aria-pressed={design.cardTemplate === id}
                    onClick={() => {
                      update(
                        "cardTemplate",
                        id as WeddingDesign["cardTemplate"],
                      );
                      setPreview("card");
                    }}
                  >
                    <span>
                      {
                        {
                          floral: "❀",
                          ribbon: "⋈",
                          couple: "♡",
                          minimal: "—",
                          night: "☾",
                        }[id]
                      }
                    </span>
                    {name}
                  </button>
                ))}
              </div>
              <label className={styles.check}>
                <input
                  type="checkbox"
                  checked={design.linked}
                  onChange={(e) => update("linked", e.target.checked)}
                />{" "}
                Açılış ve QR kartında aynı temayı kullan
              </label>
              {!design.linked && (
                <label className="form-field">
                  <span>QR kartı teması</span>
                  <select
                    value={design.cardTheme}
                    onChange={(e) =>
                      update(
                        "cardTheme",
                        e.target.value as WeddingDesign["cardTheme"],
                      )
                    }
                  >
                    {themeIds.map((id) => (
                      <option key={id} value={id}>
                        {themes[id].name}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              <label className={styles.check}>
                <input
                  type="checkbox"
                  checked={design.customColors}
                  onChange={(e) => update("customColors", e.target.checked)}
                />{" "}
                QR kartında kendi renklerimi kullan
              </label>
              {design.customColors && (
                <div className={styles.colors}>
                  <label>
                    Ana renk
                    <input
                      type="color"
                      value={design.primary}
                      onChange={(e) => update("primary", e.target.value)}
                    />
                    <span>{design.primary}</span>
                  </label>
                  <label>
                    Süsleme rengi
                    <input
                      type="color"
                      value={design.accent}
                      onChange={(e) => update("accent", e.target.value)}
                    />
                    <span>{design.accent}</span>
                  </label>
                </div>
              )}
              </div>
              <div className={styles.divider} />
              <div className={styles.step}>
                <span>05</span>
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
              face === "front" ? (
                <figure className={styles.referencePreview}>
                  <img src={qrCollectionReferences.find((item) => item.id === design.qrTemplateId)?.image} alt={`${qrCollectionReferences.find((item) => item.id === design.qrTemplateId)?.name} birebir ürün mockup'ı`} width={768} height={768} />
                  <figcaption><span>ZIP REFERANSI</span><strong>{qrCollectionReferences.find((item) => item.id === design.qrTemplateId)?.name}</strong></figcaption>
                </figure>
              ) : <div className={styles.cardScene}>
                <div className={`${styles.card3d} ${face === "back" ? styles.cardFlipped : ""}`}>
                  <img className={`${styles.card} ${styles.cardFront}`} src={svgDataUrl(cards.front)} width={630} height={888} alt="QR kartı ön yüz önizlemesi" />
                  <img className={`${styles.card} ${styles.cardBack}`} src={svgDataUrl(cards.back)} width={630} height={888} alt="QR kartı arka yüz önizlemesi" />
                </div>
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
                onClick={() => setFace("front")}
              >
                Ön yüz
              </button>
              <button
                type="button"
                aria-pressed={face === "back"}
                onClick={() => setFace("back")}
              >
                Arka yüz · QR
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
                  <strong>{side === "front" ? "Ön yüz" : "Arka yüz · QR"}</strong>
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
        </div>
        <div className={styles.saveActions}>
          <button
            type="button"
            className="admin-button"
            disabled={busy}
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
            disabled={busy || !dirty}
            onClick={save}
          >
            <Save size={16} /> {busy ? "Kaydediliyor…" : "Tasarımı kaydet"}
          </button>
        </div>
      </footer>
    </section>
  );
}
