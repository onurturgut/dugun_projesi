"use client";
import Image from "next/image";
import { useEffect, useMemo, useState, type CSSProperties } from "react";
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
} from "lucide-react";
import { toast } from "sonner";
import { api, type Wedding } from "@/lib/api";
import {
  cardTemplates,
  cardPresets,
  defaultDesign,
  designMonogram,
  designSchema,
  introTypes,
  pageTemplates,
  resolveDesign,
  themeIds,
  themes,
  type WeddingDesign,
} from "@/lib/design";
import { buildQrCards, svgDataUrl } from "@/lib/qr-card";
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
  const [design, setDesign] = useState(() => resolveDesign(event.design));
  const [saved, setSaved] = useState(() => resolveDesign(event.design));
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
  useEffect(() => {
    setUrl(`${window.location.origin}/wedding/${event.slug}`);
  }, [event.slug]);
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  const cards = useMemo(
    () =>
      url ? buildQrCards(design, event.title, event.wedding_date, url) : null,
    [design, event.title, event.wedding_date, url],
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
      const response = await api<{ design: WeddingDesign }>(
        `/admin/weddings/${event.id}/design`,
        { method: "PUT", body: JSON.stringify(result.data) },
      );
      setSaved(response.design);
      setDesign(response.design);
      qc.setQueryData<Wedding>(["admin-wedding", event.id], (current) =>
        current ? { ...current, design: response.design } : current,
      );
      await qc.invalidateQueries({ queryKey: ["wedding", event.slug] });
      toast.success("Tasarım kaydedildi. Misafir sayfanız güncellendi.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  function download(side: "front" | "back") {
    if (!cards) return;
    const link = document.createElement("a");
    link.href = svgDataUrl(cards[side]);
    link.download = `${event.slug}-kart-${side === "front" ? "on" : "arka"}.svg`;
    link.click();
  }
  function print() {
    if (!cards) return;
    const popup = window.open("", "_blank", "width=900,height=800");
    if (!popup) {
      setError("Yazdırma önizlemesi için açılır pencerelere izin verin.");
      return;
    }
    popup.opener = null;
    popup.document.title = `${event.title} — QR kartı`;
    const style = popup.document.createElement("style");
    style.textContent =
      "@page{size:A6;margin:0}*{box-sizing:border-box}body{margin:0;background:#ddd}img{display:block;width:105mm;height:148mm;margin:12px auto;break-after:page}button,p{display:block;margin:16px auto;text-align:center;font:14px system-ui}button{padding:12px 24px;cursor:pointer}@media print{body{background:white}button,p{display:none}img{margin:0}img:last-child{break-after:auto}}";
    popup.document.head.append(style);
    const note = popup.document.createElement("p");
    note.textContent =
      "A6 · 105 × 148 mm · %100 ölçek · Kenar boşluğu yok. Çift taraflı baskıda uzun kenardan çevirin.";
    const button = popup.document.createElement("button");
    button.textContent = "Yazdır / PDF olarak kaydet";
    button.onclick = () => popup.print();
    popup.document.body.append(note, button);
    for (const side of ["front", "back"] as const) {
      const image = popup.document.createElement("img");
      image.alt = side === "front" ? "Ön yüz" : "Arka yüz";
      image.src = svgDataUrl(cards[side]);
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
        <span className={styles.badge}>
          <Sparkles size={14} /> Tasarım stüdyosu
        </span>
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
                {Object.entries(pageTemplates).map(([id, name]) => (
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
                    <small>Hareketli iki sıralı fotoğraf alanı</small>
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
                {Object.entries(introTypes).map(([id, name]) => (
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
              <div
                className={styles.presetGrid}
                aria-label="Hazır QR kartı tasarımları"
              >
                {cardPresets.map((preset) => {
                  const selected =
                    design.cardTemplate === preset.template &&
                    design.cardTheme === preset.theme &&
                    design.customColors &&
                    design.primary.toLowerCase() ===
                      preset.primary.toLowerCase() &&
                    design.accent.toLowerCase() === preset.accent.toLowerCase();
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
                      <Image
                        src={preset.image}
                        alt={`${preset.name} QR kartı tasarımı`}
                        width={1536}
                        height={1024}
                        sizes="(max-width: 680px) 42vw, 190px"
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
              <img
                className={styles.card}
                src={svgDataUrl(cards[face])}
                width={630}
                height={888}
                alt={`QR kartı ${face === "front" ? "ön" : "arka"} yüz önizlemesi`}
              />
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
          ) : (
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
          )}
          <div className={styles.export}>
            <h3>Baskıya hazır hatıranız</h3>
            <p>A6 · 105 × 148 mm · Ölçeklenebilir SVG</p>
            <div>
              <button
                type="button"
                disabled={!cards}
                onClick={() => download("front")}
              >
                <Download size={14} /> Ön yüz
              </button>
              <button
                type="button"
                disabled={!cards}
                onClick={() => download("back")}
              >
                <Download size={14} /> Arka yüz
              </button>
              <button type="button" disabled={!cards} onClick={print}>
                <Printer size={14} /> Yazdır / PDF
              </button>
            </div>
            <small>
              QR kodu gerçek misafir bağlantınıza yönlenir. Baskıdan önce
              telefonunuzla okutun.
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
