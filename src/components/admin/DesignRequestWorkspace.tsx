"use client";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Check,
  ChevronRight,
  CloudUpload,
  Download,
  FileText,
  Palette,
  Printer,
  Send,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { api, type Account, type Wedding } from "@/lib/api";
import { availableDesignRequestTemplates, defaultDesign } from "@/lib/design";
import { buildQrCards, svgDataUrl } from "@/lib/qr-card";
import {
  qrTemplates,
  resolveGeneratedQrFieldMapFace,
  resolveQrFieldMapFace,
} from "@/lib/qr-templates";
import { qrProductEntitlement, qrProducts } from "@/lib/qr-products";
import { hasCustomDesignEntitlement } from "@/lib/commercial-policy";
import type { PrintJob } from "@/lib/models";
import styles from "./DesignRequestWorkspace.module.css";

type Surface = "qr" | "loading" | "wedding";
type PrinterAccount = {
  id: string;
  display_name: string;
  partner_id: string;
};
const steps: Array<{ id: Surface; label: string }> = [
  { id: "qr", label: "QR kod" },
  { id: "loading", label: "Loading page" },
  { id: "wedding", label: "Wedding alanı" },
];
const blank = () => ({
  mode: "catalog" as const,
  template_id: "",
  color: "",
  heading: "",
  title: "",
  description: "",
  cta: "",
  footer: "",
  back_title: "",
  back_description: "",
  back_names: "",
  back_date: "",
  style: "",
  format: "",
  typography: "",
  layout: "",
  notes: "",
  reference_image_urls: [] as string[],
  status: "draft" as const,
});
const qrAssetCache = new Map<string, Promise<string>>();
function assetAsDataUrl(path: string) {
  const cached = qrAssetCache.get(path);
  if (cached) return cached;
  const pending = fetch(path).then(async (response) => {
    if (!response.ok) throw new Error("QR referans görseli yüklenemedi.");
    const blob = await response.blob();
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () =>
        reject(new Error("QR referans görseli okunamadı."));
      reader.readAsDataURL(blob);
    });
  });
  qrAssetCache.set(path, pending);
  return pending;
}

export function DesignRequestWorkspace({
  event,
  initialSurface = "qr",
}: {
  event: Wedding;
  initialSurface?: Surface;
}) {
  const qc = useQueryClient();
  const me = useQuery({
    queryKey: ["me"],
    queryFn: () => api<Account>("/auth/me"),
  });
  const platform = me.data?.role === "platform";
  const [active, setActive] = useState<Surface>(initialSurface);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [qrStage, setQrStage] = useState(1);
  const [qrFace, setQrFace] = useState<"front" | "back">("front");
  const [fieldMapCards, setFieldMapCards] = useState<ReturnType<
    typeof buildQrCards
  > | null>(null);
  const [surfaces, setSurfaces] = useState(() => ({
    qr: { ...blank(), ...event.design_request?.surfaces.qr },
    loading: { ...blank(), ...event.design_request?.surfaces.loading },
    wedding: { ...blank(), ...event.design_request?.surfaces.wedding },
  }));
  const [uploading, setUploading] = useState<string | null>(null);
  const [printPrinterId, setPrintPrinterId] = useState("");
  const [printQuantity, setPrintQuantity] = useState("1");
  const [printDueDate, setPrintDueDate] = useState("");
  const [printNotes, setPrintNotes] = useState("");
  const [approvalMessage, setApprovalMessage] = useState(
    event.design_request?.approval_message || "",
  );
  const [printPdf, setPrintPdf] = useState<File | null>(null);
  const locked = Boolean(
    event.design_request &&
    !["draft", "revision_requested"].includes(event.design_request.status),
  );
  const customDesignAllowed = hasCustomDesignEntitlement(
    event.package_snapshot,
    event.price_snapshot,
  );
  const current = surfaces[active];
  const approvedQrProduct = qrProducts.find(
    (product) => product.id === event.design_request?.surfaces.qr.format,
  );
  const qrApprovedForPrint =
    event.design_request?.surfaces.qr.status === "completed";
  const printers = useQuery({
    queryKey: ["print-vendors"],
    queryFn: () => api<PrinterAccount[]>("/admin/print-vendors"),
    enabled: platform,
  });
  const printJobs = useQuery({
    queryKey: ["print-jobs", event.id],
    queryFn: () => api<PrintJob[]>("/admin/print-jobs"),
    enabled: platform,
    select: (items) => items.filter((item) => item.wedding_id === event.id),
  });
  const selectedQrTemplate = current.template_id
    ? qrTemplates[current.template_id as keyof typeof qrTemplates]
    : null;
  const selectedQrVariant = selectedQrTemplate?.variants.find(
    (variant) => variant.id === current.color,
  );
  const selectedQrProduct = qrProducts.find(
    (product) => product.id === current.format,
  );
  const qrSelectionPreviewProductId = "landscape-mini-100x75-duplex";
  const selectedQrFieldMapFace =
    selectedQrTemplate && selectedQrVariant && selectedQrProduct
      ? resolveQrFieldMapFace(
          selectedQrTemplate.id,
          selectedQrVariant.id,
          selectedQrProduct.id,
          qrFace,
        )
      : selectedQrVariant?.[qrFace];
  const generatedFieldMapFace =
    selectedQrTemplate && selectedQrVariant && selectedQrProduct
      ? resolveGeneratedQrFieldMapFace(
          selectedQrTemplate.id,
          selectedQrVariant.id,
          selectedQrProduct.id,
          qrFace,
        )
      : null;
  useEffect(() => {
    if (!selectedQrTemplate || !selectedQrVariant || !selectedQrProduct) {
      setFieldMapCards(null);
      return;
    }
    let live = true;
    const frontPath = resolveQrFieldMapFace(
      selectedQrTemplate.id,
      selectedQrVariant.id,
      selectedQrProduct.id,
      "front",
    );
    const backPath = resolveQrFieldMapFace(
      selectedQrTemplate.id,
      selectedQrVariant.id,
      selectedQrProduct.id,
      "back",
    );
    Promise.all([
      assetAsDataUrl(frontPath),
      assetAsDataUrl(backPath),
      assetAsDataUrl("/fonts/qr/cormorant-garamond-500.ttf"),
      assetAsDataUrl("/fonts/qr/cormorant-garamond-500-italic.ttf"),
      assetAsDataUrl("/fonts/qr/cinzel-600.ttf"),
      assetAsDataUrl("/fonts/qr/allura-400.ttf"),
      assetAsDataUrl("/fonts/qr/manrope-400.ttf"),
      assetAsDataUrl("/fonts/qr/montserrat-light.ttf"),
      assetAsDataUrl("/fonts/qr/montserrat-regular.ttf"),
      assetAsDataUrl("/brand/vector/shineqr-logo-metallic-gold.svg"),
    ])
      .then(
        ([
          front,
          back,
          cormorant,
          cormorantItalic,
          cinzel,
          allura,
          manrope,
          montserratLight,
          montserrat,
          logo,
        ]) => {
          if (!live) return;
          const common = {
            ...defaultDesign,
            qrTemplateId: selectedQrTemplate.id,
            qrColorVariant: selectedQrVariant.id,
            qrProductId: selectedQrProduct.id,
          };
          const assets = {
            front,
            back,
            logo,
            fonts: { cormorant, cormorantItalic, cinzel, allura, manrope },
            minimalFonts: { montserratLight, montserrat, allura },
          };
          const target = `${window.location.origin}/q/${event.id}`;
          const frontCards = buildQrCards(
            {
              ...common,
              qrHook: "Anılarımızı birlikte biriktirelim",
              qrDescription: "Bu özel günü sizin gözünüzden de görelim.",
              qrCta: "QR kodu okut ve yükle",
              names: `${event.bride_name} & ${event.groom_name}`,
            },
            event.title,
            event.wedding_date,
            target,
            assets,
          );
          const backCards = buildQrCards(
            {
              ...common,
              message: [
                current.back_title || "İyi ki bizimlesiniz",
                current.back_description || defaultDesign.message,
              ].join("\n"),
              names:
                current.back_names ||
                `${event.bride_name} & ${event.groom_name}`,
            },
            event.title,
            event.wedding_date,
            target,
            assets,
          );
          setFieldMapCards({ front: frontCards.front, back: backCards.back });
        },
      )
      .catch(() => {
        if (live) setFieldMapCards(null);
      });
    return () => {
      live = false;
    };
  }, [
    current.back_description,
    current.back_names,
    current.back_title,
    event.bride_name,
    event.groom_name,
    event.id,
    event.title,
    event.wedding_date,
    selectedQrProduct,
    selectedQrTemplate,
    selectedQrVariant,
  ]);
  const templates = useMemo(
    () => availableDesignRequestTemplates(active),
    [active],
  );
  const templatePreviewAsset = (template: (typeof templates)[number]) => {
    if (active !== "qr") return template.asset;
    const qrTemplate = qrTemplates[template.id as keyof typeof qrTemplates];
    return qrTemplate
      ? resolveGeneratedQrFieldMapFace(
          qrTemplate.id,
          qrTemplate.defaultVariant,
          qrSelectionPreviewProductId,
          "front",
        )
      : template.asset;
  };
  const update = (patch: Partial<typeof current>) =>
    setSurfaces((value) => ({
      ...value,
      [active]: { ...value[active], ...patch },
    }));
  const save = useMutation({
    mutationFn: (action: "save" | "submit") =>
      api(`/admin/weddings/${event.id}/design-request`, {
        method: "PUT",
        body: JSON.stringify({ action, surfaces }),
      }),
    onSuccess: async (_, action) => {
      await qc.invalidateQueries({ queryKey: ["admin-wedding", event.id] });
      toast.success(
        action === "submit"
          ? "Tasarım talebi gönderildi."
          : "Taslak kaydedildi.",
      );
    },
    onError: (e: Error) => toast.error(e.message),
  });
  async function uploadProductionPdf(jobId: string, file: File) {
    const body = new FormData();
    body.set("file", file);
    const response = await fetch(
      `/api/admin/print-jobs/${jobId}/production-pdf`,
      { method: "POST", body },
    );
    const result = await response.json();
    if (!response.ok)
      throw new Error(result.error || "Baskı PDF'i yüklenemedi.");
    return result as PrintJob;
  }
  const createPrintJob = useMutation({
    mutationFn: async () => {
      if (!approvedQrProduct || !printPdf)
        throw new Error("Fiziksel ürün ve baskı PDF'i gerekli.");
      const job = await api<PrintJob>("/admin/print-jobs", {
        method: "POST",
        body: JSON.stringify({
          wedding_id: event.id,
          printer_account_id: printPrinterId,
          product_description: approvedQrProduct.name,
          quantity: Number(printQuantity),
          due_date: printDueDate || null,
          production_notes: printNotes,
        }),
      });
      return uploadProductionPdf(job.id, printPdf);
    },
    onSuccess: async () => {
      setPrintPdf(null);
      setPrintNotes("");
      await qc.invalidateQueries({ queryKey: ["print-jobs"] });
      toast.success("PDF doğrulandı ve baskı operasyonuna gönderildi.");
    },
    onError: async (reason) => {
      await qc.invalidateQueries({ queryKey: ["print-jobs"] });
      toast.error(
        reason instanceof Error ? reason.message : "Baskı işi oluşturulamadı.",
      );
    },
  });
  const replacePrintPdf = useMutation({
    mutationFn: ({ jobId, file }: { jobId: string; file: File }) =>
      uploadProductionPdf(jobId, file),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["print-jobs"] });
      toast.success("Baskı PDF'i doğrulandı ve güncellendi.");
    },
    onError: (reason) =>
      toast.error(
        reason instanceof Error ? reason.message : "Baskı PDF'i yüklenemedi.",
      ),
  });
  async function upload(file: File, target: "reference" | "delivery") {
    setUploading(`${active}-${target}`);
    try {
      const body = new FormData();
      body.append("file", file);
      body.append("event_id", event.id);
      body.append("partner_id", event.partner_id);
      const response = await fetch("/api/admin/covers", {
        method: "POST",
        body,
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      if (target === "reference")
        update({
          reference_image_urls: [
            ...current.reference_image_urls,
            result.url,
          ].slice(0, 10),
        });
      else
        await api(`/admin/weddings/${event.id}/design-request/deliver`, {
          method: "POST",
          body: JSON.stringify({
            surface: active,
            preview_url: result.url,
            notes: current.notes,
          }),
        });
      await qc.invalidateQueries({ queryKey: ["admin-wedding", event.id] });
      toast.success("Görsel yüklendi.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Yükleme başarısız.");
    } finally {
      setUploading(null);
    }
  }
  const respond = async (decision: "approve" | "revision") => {
    const reason =
      decision === "revision"
        ? window.prompt("Revizyon nedenini yazın:") || ""
        : "";
    try {
      await api(`/admin/weddings/${event.id}/design-request/respond`, {
        method: "POST",
        body: JSON.stringify({ surface: active, decision, reason }),
      });
      await qc.invalidateQueries({ queryKey: ["admin-wedding", event.id] });
      toast.success(
        decision === "approve" ? "Tasarım onaylandı." : "Revizyon gönderildi.",
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "İşlem başarısız.");
    }
  };
  return (
    <main className={styles.workspace}>
      <header className={styles.hero}>
        <div>
          <span className={styles.eyebrow}>TASARIM TALEBİ VE TESLİM</span>
          <h1>{event.title}</h1>
          <p>
            Hazır çalışmalardan seçim yapın veya tasarım ekibine ayrıntılı bir
            özel brief gönderin.
          </p>
        </div>
        <span className={styles.status}>
          {event.design_request?.status?.replaceAll("_", " ") || "Yeni talep"}
        </span>
      </header>
      <nav className={styles.steps} aria-label="Tasarım aşamaları">
        {steps.map((step, index) => (
          <button
            key={step.id}
            onClick={() => {
              setActive(step.id);
              setSummaryOpen(false);
            }}
            aria-current={
              !summaryOpen && active === step.id ? "step" : undefined
            }
          >
            <span>
              {surfaces[step.id].status === "completed" ? (
                <Check size={15} />
              ) : (
                index + 1
              )}
            </span>
            {step.label}
          </button>
        ))}
        <button
          onClick={() => setSummaryOpen(true)}
          aria-current={summaryOpen ? "step" : undefined}
        >
          <span>
            <FileText size={15} />
          </span>
          Özet
        </button>
      </nav>
      <section className={styles.context}>
        <div>
          <strong>Organizasyon özeti</strong>
          <span>
            {event.bride_name} &amp; {event.groom_name} ·{" "}
            {event.wedding_date || "Tarih belirtilmedi"}
          </span>
        </div>
        <div>
          <strong>Paket</strong>
          <span>
            {event.package_snapshot?.name || event.package_code || "Paket"}
          </span>
        </div>
        <div>
          <strong>İletişim</strong>
          <span>
            {event.customer_name} · {event.customer_phone}
          </span>
        </div>
      </section>
      {summaryOpen ? (
        <section className={styles.summaryPanel}>
          <header>
            <div>
              <span className={styles.eyebrow}>TASARIM TALEBİ ÖZETİ</span>
              <h2>Tüm seçimler ve teslimler</h2>
            </div>
            <p>
              QR kod, Loading page ve Wedding alanındaki seçimleri kontrol edin.
            </p>
          </header>
          <div className={styles.summaryGrid}>
            {steps.map((step) => {
              const surface = surfaces[step.id];
              const template = surface.template_id
                ? availableDesignRequestTemplates(step.id).find(
                    (item) => item.id === surface.template_id,
                  )
                : null;
              const product =
                step.id === "qr"
                  ? qrProducts.find((item) => item.id === surface.format)
                  : null;
              return (
                <article key={step.id}>
                  <div className={styles.summaryCardHead}>
                    <div>
                      <span>{step.label}</span>
                      <h3>{template?.name || "Henüz tasarım seçilmedi"}</h3>
                    </div>
                    <b>{surface.mode === "custom" ? "Özel" : "Hazır"}</b>
                  </div>
                  <dl>
                    <div>
                      <dt>Durum</dt>
                      <dd>{surface.status.replaceAll("_", " ")}</dd>
                    </div>
                    {surface.color ? (
                      <div>
                        <dt>Renk</dt>
                        <dd>{surface.color}</dd>
                      </div>
                    ) : null}
                    {product ? (
                      <div>
                        <dt>Fiziksel ürün</dt>
                        <dd>{product.name}</dd>
                      </div>
                    ) : null}
                    {surface.title ? (
                      <div>
                        <dt>Ana başlık</dt>
                        <dd>{surface.title}</dd>
                      </div>
                    ) : null}
                    {surface.description ? (
                      <div>
                        <dt>Açıklama</dt>
                        <dd>{surface.description}</dd>
                      </div>
                    ) : null}
                    {surface.notes ? (
                      <div>
                        <dt>Notlar</dt>
                        <dd>{surface.notes}</dd>
                      </div>
                    ) : null}
                  </dl>
                  {surface.delivery ? (
                    <div className={styles.summaryDelivery}>
                      <Image
                        src={`/api/admin/weddings/${event.id}/design-request/delivery/${step.id}`}
                        alt={`${step.label} tamamlanan tasarım`}
                        width={520}
                        height={360}
                        unoptimized
                      />
                      <span>
                        Tamamlanan dosya · v{surface.delivery.version}
                      </span>
                    </div>
                  ) : step.id !== "qr" && surface.mode === "catalog" && template?.asset ? (
                    <div className={styles.summaryDelivery}>
                      <Image src={template.poster || template.asset} alt={`${step.label} hazır tasarımı`} width={520} height={360} unoptimized />
                      <span>Hazır tasarım · Doğrudan kullanılacak</span>
                    </div>
                  ) : (
                    <small>Henüz tamamlanan dosya yüklenmedi.</small>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setActive(step.id);
                      setSummaryOpen(false);
                    }}
                  >
                    Bu alanı düzenle
                  </button>
                </article>
              );
            })}
          </div>
        </section>
      ) : (
        <div className={styles.grid}>
          <section className={styles.panel}>
            <div className={styles.panelHead}>
              <div>
                <span>{steps.find((x) => x.id === active)?.label}</span>
                <h2>Tasarım yönünü belirleyin</h2>
              </div>
              {!locked && (
                <div className={styles.segment}>
                  <button
                    aria-pressed={current.mode === "catalog"}
                    onClick={() => update({ mode: "catalog" })}
                  >
                    Hazır tasarım
                  </button>
                  <button
                    aria-pressed={current.mode === "custom"}
                    disabled={!customDesignAllowed}
                    title={
                      customDesignAllowed
                        ? undefined
                        : "Özel tasarım Paket 3 veya Özel Tasarım ek ürünü ile kullanılabilir."
                    }
                    onClick={() => update({ mode: "custom" })}
                  >
                    Özel tasarım
                  </button>
                </div>
              )}
            </div>
            {!locked && !customDesignAllowed ? (
              <p className={styles.customAccessNote}>
                Özel tasarım yalnızca Paket 3 kapsamında veya Özel Tasarım ek
                ürünü satın alındığında aktif olur.
              </p>
            ) : null}
            {active === "qr" && current.mode === "catalog" ? (
              <div
                className={styles.qrStages}
                aria-label="QR tasarım aşamaları"
              >
                {["Koleksiyon", "Renk", "Fiziksel ürün", "İçerik"].map(
                  (label, index) => (
                    <button
                      type="button"
                      key={label}
                      aria-current={qrStage === index + 1 ? "step" : undefined}
                      disabled={
                        index > 0 && !current.template_id
                          ? true
                          : index > 1 && !current.color
                            ? true
                            : index > 2 && !current.format
                      }
                      onClick={() => setQrStage(index + 1)}
                    >
                      <span>{index + 1}</span>
                      {label}
                    </button>
                  ),
                )}
              </div>
            ) : null}
            {current.mode === "catalog" &&
            (active !== "qr" || qrStage === 1) ? (
              <div className={styles.catalog}>
                {templates.map((template) => (
                  <button
                    key={template.id}
                    disabled={locked}
                    aria-pressed={current.template_id === template.id}
                    onClick={() => {
                      const qrTemplate =
                        active === "qr"
                          ? qrTemplates[template.id as keyof typeof qrTemplates]
                          : null;
                      update({
                        template_id: template.id,
                        ...(qrTemplate
                          ? {
                              color: qrTemplate.defaultVariant,
                              format: "",
                            }
                          : {}),
                      });
                      if (active === "qr") setQrStage(2);
                    }}
                  >
                    <div className={styles.thumb} data-surface={active}>
                      {templatePreviewAsset(template) ? (
                        templatePreviewAsset(template)?.endsWith(".mp4") ? (
                          <video
                            src={templatePreviewAsset(template)!}
                            poster={template.poster}
                            muted
                            playsInline
                            preload="metadata"
                          />
                        ) : (
                          <Image
                            src={templatePreviewAsset(template)!}
                            alt={`${template.name} hazır tasarım önizlemesi`}
                            fill
                            sizes="(max-width: 680px) 100vw, 240px"
                          />
                        )
                      ) : (
                        <Sparkles />
                      )}
                    </div>
                    <strong>{template.name}</strong>
                    <small>{template.description}</small>
                  </button>
                ))}
              </div>
            ) : current.mode === "custom" ? (
              <div className={styles.customGrid}>
                <Select
                  label="Tasarım stili"
                  value={current.style}
                  onChange={(style) => update({ style })}
                  options={[
                    "Modern ve sade",
                    "Romantik",
                    "Editoryal",
                    "Klasik",
                    "Eğlenceli",
                  ]}
                />
                <Select
                  label="Renk yönü"
                  value={current.color}
                  onChange={(color) => update({ color })}
                  options={[
                    "Krem ve altın",
                    "Siyah ve beyaz",
                    "Pastel",
                    "Canlı renkler",
                    "Özel palet",
                  ]}
                />
                <Select
                  label="Format / boyut"
                  value={current.format}
                  onChange={(format) => update({ format })}
                  options={["Dikey", "Yatay", "Kare", "Ekrana uyumlu"]}
                />
                <Select
                  label="Tipografi"
                  value={current.typography}
                  onChange={(typography) => update({ typography })}
                  options={[
                    "Zarif serif",
                    "Modern sans",
                    "El yazısı vurgu",
                    "Tasarımcı seçsin",
                  ]}
                />
                <Select
                  label="Yerleşim"
                  value={current.layout}
                  onChange={(layout) => update({ layout })}
                  options={[
                    "Minimal",
                    "Fotoğraf odaklı",
                    "Metin odaklı",
                    "Tasarımcı seçsin",
                  ]}
                />
                <label className={styles.full}>
                  Tasarım briefi
                  <textarea
                    disabled={locked || platform}
                    value={current.notes}
                    onChange={(e) => update({ notes: e.target.value })}
                    placeholder="Nasıl bir çalışma istediğinizi, kaçınılması gerekenleri ve özel detayları anlatın."
                  />
                </label>
              </div>
            ) : active === "qr" && qrStage === 2 && selectedQrTemplate ? (
              <section className={styles.qrChoiceSection}>
                <header>
                  <span>2. AŞAMA</span>
                  <h3>Renk varyasyonunu seçin</h3>
                </header>
                <div className={styles.variantGrid}>
                  {selectedQrTemplate.variants.map((variant) => (
                    <button
                      type="button"
                      key={variant.id}
                      disabled={locked}
                      aria-pressed={current.color === variant.id}
                      onClick={() => {
                        update({ color: variant.id });
                        setQrStage(3);
                      }}
                    >
                      <Image
                        src={resolveGeneratedQrFieldMapFace(
                          selectedQrTemplate.id,
                          variant.id,
                          qrSelectionPreviewProductId,
                          "front",
                        )}
                        alt={`${selectedQrTemplate.name} ${variant.name} renk varyasyonu`}
                        width={360}
                        height={480}
                      />
                      <span>
                        <i style={{ backgroundColor: variant.swatch }} />
                        <strong>{variant.name}</strong>
                      </span>
                    </button>
                  ))}
                </div>
              </section>
            ) : active === "qr" && qrStage === 3 && selectedQrTemplate ? (
              <section className={styles.qrChoiceSection}>
                <header>
                  <span>3. AŞAMA</span>
                  <h3>Fiziksel QR ürününü seçin</h3>
                </header>
                <div className={styles.productGrid}>
                  {qrProducts.map((product) => {
                    const access = qrProductEntitlement(
                      product,
                      event.package_snapshot,
                    );
                    const compatible = product.compatibleTemplates.includes(
                      selectedQrTemplate.id,
                    );
                    return (
                      <button
                        type="button"
                        key={product.id}
                        disabled={locked || !access.allowed || !compatible}
                        aria-pressed={current.format === product.id}
                        onClick={() => {
                          update({ format: product.id });
                          setQrFace("front");
                          setQrStage(4);
                        }}
                      >
                        <strong>{product.name}</strong>
                        <span>
                          {product.trimWidthMm} × {product.trimHeightMm} mm ·{" "}
                          {product.sides.length === 2 ? "Ön / arka" : "Tek yüz"}
                        </span>
                        <small>
                          {compatible
                            ? access.reason
                            : "Bu koleksiyonun baskı dosyası henüz üretime hazır değil."}
                        </small>
                      </button>
                    );
                  })}
                </div>
              </section>
            ) : null}
            {(active !== "qr" || current.mode === "custom" || qrStage === 4) &&
              !(active !== "qr" && current.mode === "catalog") && (
                <div
                  className={
                    active === "qr" && current.mode === "catalog"
                      ? styles.qrContentStage
                      : undefined
                  }
                >
                  {active === "qr" &&
                    current.mode === "catalog" &&
                    selectedQrVariant &&
                    selectedQrFieldMapFace && (
                      <section className={styles.qrFieldMap}>
                        <header>
                          <span>SEÇİLİ TASARIM · ALAN HARİTASI</span>
                          <h3>Metinlerin kart üzerindeki yeri</h3>
                          <p>
                            Görseldeki numaralar ile metin kutularının
                            numaraları aynıdır.
                          </p>
                        </header>
                        <div
                          className={styles.qrMappedPreview}
                          data-format={
                            selectedQrProduct?.id ||
                            "portrait-mini-75x100-duplex"
                          }
                          data-face={qrFace}
                        >
                          <Image
                            src={
                              generatedFieldMapFace ||
                              (fieldMapCards
                                ? svgDataUrl(fieldMapCards[qrFace])
                                : selectedQrFieldMapFace)
                            }
                            alt={`${selectedQrTemplate?.name} ${selectedQrVariant.name} QR kart alan rehberi`}
                            width={480}
                            height={640}
                            unoptimized
                          />
                          {(qrFace === "front"
                            ? [1, 2, 3, 4, 5]
                            : [1, 2, 3, 4]
                          ).map((number) => (
                            <span key={number} data-marker={number}>
                              {number}
                            </span>
                          ))}
                        </div>
                        <div
                          className={styles.qrFaceSwitch}
                          role="group"
                          aria-label="QR kart yüzü"
                        >
                          <button
                            type="button"
                            aria-pressed={qrFace === "front"}
                            onClick={() => setQrFace("front")}
                          >
                            Ön yüz
                          </button>
                          <button
                            type="button"
                            aria-pressed={qrFace === "back"}
                            disabled={selectedQrProduct?.sides.length === 1}
                            onClick={() => setQrFace("back")}
                          >
                            Arka yüz
                          </button>
                        </div>
                        <ol className={styles.qrMapLegend}>
                          <li>
                            <b>1</b>
                            <span>
                              Üst başlık
                              <small>Kartın üst karşılama satırı</small>
                            </span>
                          </li>
                          <li>
                            <b>2</b>
                            <span>
                              Ana başlık<small>En güçlü ve büyük mesaj</small>
                            </span>
                          </li>
                          <li>
                            <b>3</b>
                            <span>
                              Açıklama<small>QR kullanım yönlendirmesi</small>
                            </span>
                          </li>
                          <li>
                            <b>4</b>
                            <span>
                              CTA metni<small>QR kodun altındaki aksiyon</small>
                            </span>
                          </li>
                          <li>
                            <b>5</b>
                            <span>
                              Alt bilgi<small>İsim, tarih veya kısa not</small>
                            </span>
                          </li>
                        </ol>
                      </section>
                    )}
                  {active !== "qr" || qrFace === "front" ? (
                    <div className={styles.copy}>
                      <h3>
                        {active === "wedding"
                          ? "Wedding alanı içerikleri"
                          : "İçerik metinleri"}
                      </h3>
                      <p>
                        {active === "wedding"
                          ? "Wedding sayfasında misafirlerin göreceği karşılama, galeri ve kapanış metinlerini girin."
                          : "Yan taraftaki alan rehberine göre, tasarımda görünmesini istediğiniz metinleri girin."}
                      </p>
                      <label>
                        <FieldGuideLabel
                          number={1}
                          title={
                            active === "wedding"
                              ? "Karşılama metni"
                              : "Üst başlık"
                          }
                          location={
                            active === "wedding"
                              ? "Wedding sayfasının üst bölümündeki kısa karşılama"
                              : "Kartın en üstündeki küçük karşılama alanı"
                          }
                        />
                        <input
                          disabled={locked}
                          value={current.heading}
                          onChange={(e) => update({ heading: e.target.value })}
                        />
                      </label>
                      <label>
                        <FieldGuideLabel
                          number={2}
                          title={
                            active === "wedding"
                              ? "Çift / organizasyon başlığı"
                              : "Ana başlık"
                          }
                          location={
                            active === "wedding"
                              ? "Sayfanın ana başlığı; çift isimleri veya organizasyon adı"
                              : "QR kartın ana ve en büyük mesaj alanı"
                          }
                        />
                        <input
                          disabled={locked}
                          value={current.title}
                          onChange={(e) => update({ title: e.target.value })}
                        />
                      </label>
                      <label className={styles.full}>
                        <FieldGuideLabel
                          number={3}
                          title={
                            active === "wedding" ? "Davet mesajı" : "Açıklama"
                          }
                          location={
                            active === "wedding"
                              ? "Ana başlığın altında misafirlere gösterilecek mesaj"
                              : "Ana başlığın altındaki kısa yönlendirme alanı"
                          }
                        />
                        <textarea
                          disabled={locked}
                          value={current.description}
                          onChange={(e) =>
                            update({ description: e.target.value })
                          }
                        />
                      </label>
                      <label>
                        <FieldGuideLabel
                          number={4}
                          title={
                            active === "wedding"
                              ? "Galeri yönlendirmesi"
                              : "CTA metni"
                          }
                          location={
                            active === "wedding"
                              ? "Fotoğraf ve video alanına yönlendiren kısa metin"
                              : "QR kodun yanında veya altında bulunan aksiyon"
                          }
                        />
                        <input
                          disabled={locked}
                          value={current.cta}
                          onChange={(e) => update({ cta: e.target.value })}
                        />
                      </label>
                      <label>
                        <FieldGuideLabel
                          number={5}
                          title={
                            active === "wedding"
                              ? "Kapanış mesajı"
                              : "Alt bilgi"
                          }
                          location={
                            active === "wedding"
                              ? "Wedding sayfasının sonunda gösterilecek teşekkür veya kısa not"
                              : "Kartın altındaki isim, tarih veya ek not alanı"
                          }
                        />
                        <input
                          disabled={locked}
                          value={current.footer}
                          onChange={(e) => update({ footer: e.target.value })}
                        />
                      </label>
                    </div>
                  ) : (
                    <div className={styles.copy}>
                      <h3>Arka yüz metinleri</h3>
                      <p>
                        Yalnızca kartın arka yüzünde görünecek metinleri girin.
                      </p>
                      <label className={styles.full}>
                        <FieldGuideLabel
                          number={1}
                          title="Teşekkür başlığı"
                          location="Arka yüzün üst ve ana mesaj alanı"
                        />
                        <input
                          disabled={locked}
                          value={current.back_title}
                          onChange={(e) =>
                            update({ back_title: e.target.value })
                          }
                        />
                      </label>
                      <label className={styles.full}>
                        <FieldGuideLabel
                          number={2}
                          title="Teşekkür açıklaması"
                          location="Ana başlığın altındaki açıklama alanı"
                        />
                        <textarea
                          disabled={locked}
                          value={current.back_description}
                          onChange={(e) =>
                            update({ back_description: e.target.value })
                          }
                        />
                      </label>
                      <label>
                        <FieldGuideLabel
                          number={3}
                          title="İsimler"
                          location="Arka yüzün altındaki çift isimleri"
                        />
                        <input
                          disabled={locked}
                          value={current.back_names}
                          onChange={(e) =>
                            update({ back_names: e.target.value })
                          }
                        />
                      </label>
                      <label>
                        <FieldGuideLabel
                          number={4}
                          title="Tarih"
                          location="İsimlerin altındaki organizasyon tarihi"
                        />
                        <input
                          disabled={locked}
                          value={current.back_date}
                          onChange={(e) =>
                            update({ back_date: e.target.value })
                          }
                        />
                      </label>
                    </div>
                  )}
                </div>
              )}
            {active === "qr" || current.mode === "custom" ? <UploadBox
              label={
                platform
                  ? "Tamamlanan tasarımı yükle"
                  : "Referans fotoğraf yükle"
              }
              busy={Boolean(uploading)}
              onFile={(file) =>
                upload(file, platform ? "delivery" : "reference")
              }
            /> : <div className={styles.directUseNotice}><Check size={18} /><div><strong>Hazır tasarım doğrudan kullanılacak</strong><p>Seçtiğiniz {active === "loading" ? "Loading page" : "Wedding"} tasarımı sisteme otomatik kaydedilir; ayrıca düzenleme veya onay beklemez.</p></div></div>}
          </section>
          <aside className={styles.aside}>
            <Palette />
            <span>
              {active === "loading" && current.mode === "catalog"
                ? "HAZIR LOADING TASARIMI"
                : "ALAN REHBERİ"}
            </span>
            <h2>
              {active === "loading" && current.mode === "catalog"
                ? "Metin girişi gerekmiyor"
                : active === "wedding"
                  ? "Wedding metinleri nerede?"
                  : "Metin nereye gelecek?"}
            </h2>
            {active === "loading" && current.mode === "catalog" ? (
              <p className={styles.asideNote}>
                Seçtiğiniz hazır loading tasarımı mevcut görsel ve animasyonuyla
                kullanılacaktır. Bu aşamada ayrıca içerik metni girilmez.
              </p>
            ) : null}
            {(active === "wedding"
              ? [
                  "Karşılama metni — sayfanın üst karşılama alanı",
                  "Çift / organizasyon başlığı — ana başlık alanı",
                  "Davet mesajı — misafirlere gösterilen açıklama",
                  "Galeri yönlendirmesi — fotoğraf ve video alanı",
                  "Kapanış mesajı — teşekkür veya son not",
                ]
              : active === "loading" && current.mode === "catalog"
                ? []
                : [
                    "Üst başlık — küçük karşılama satırı",
                    "Ana başlık — en güçlü mesaj",
                    "Açıklama — kısa yönlendirme",
                    "CTA — kullanıcı aksiyonu",
                    "Alt bilgi — tarih veya ek not",
                  ]
            ).map((text, i) => (
              <div className={styles.guide} key={text}>
                <b>{i + 1}</b>
                <p>{text}</p>
              </div>
            ))}
            {current.delivery && (
              <div className={styles.delivery}>
                <strong>
                  Tamamlanan tasarım · v{current.delivery.version}
                </strong>
                <Image
                  src={`/api/admin/weddings/${event.id}/design-request/delivery/${active}`}
                  alt="Tamamlanan tasarım"
                  width={520}
                  height={360}
                  unoptimized
                />
                {current.delivery.notes ? <p className={styles.deliveryMessage}>{current.delivery.notes}</p> : null}
                {active === "qr" && event.design_request?.approval_message ? <p className={styles.deliveryMessage}>{event.design_request.approval_message}</p> : null}
                {event.design_request?.status === "awaiting_approval" &&
                  !platform && active === "qr" && (
                    <div>
                      <button onClick={() => respond("approve")}>Onayla</button>
                      <button onClick={() => respond("revision")}>
                        Revizyon iste
                      </button>
                    </div>
                  )}
              </div>
            )}
          </aside>
        </div>
      )}
      {platform ? (
        <section className={styles.printProduction}>
          <header>
            <div>
              <span className={styles.eyebrow}>BASKI DOSYALARI</span>
              <h2>PDF'i baskı operasyonuna gönder</h2>
              <p>
                Müşteri tarafından onaylanan fiziksel QR tasarımının üretim
                PDF'ini doğrulayın ve atanmış baskıcıya gönderin.
              </p>
            </div>
            <Printer aria-hidden="true" />
          </header>
          {!qrApprovedForPrint ? (
            <div className={styles.printGate}>
              QR tasarımı müşteri tarafından onaylandığında PDF gönderimi aktif
              olur.
            </div>
          ) : !approvedQrProduct ? (
            <div className={styles.printGate}>
              Onaylanan tasarımda fiziksel QR ürünü bulunamadı.
            </div>
          ) : (
            <form
              className={styles.printForm}
              onSubmit={(submitEvent) => {
                submitEvent.preventDefault();
                createPrintJob.mutate();
              }}
            >
              <label>
                Fiziksel ürün
                <input value={approvedQrProduct.name} readOnly />
              </label>
              <label>
                Baskıcı
                <select
                  value={printPrinterId}
                  onChange={(changeEvent) =>
                    setPrintPrinterId(changeEvent.target.value)
                  }
                  required
                >
                  <option value="">Baskıcı seçin</option>
                  {printers.data?.map((printer) => (
                    <option key={printer.id} value={printer.id}>
                      {printer.display_name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Adet
                <input
                  type="number"
                  min={1}
                  max={100000}
                  value={printQuantity}
                  onChange={(changeEvent) =>
                    setPrintQuantity(changeEvent.target.value)
                  }
                  required
                />
              </label>
              <label>
                Hedef teslim tarihi
                <input
                  type="date"
                  value={printDueDate}
                  onChange={(changeEvent) =>
                    setPrintDueDate(changeEvent.target.value)
                  }
                />
              </label>
              <label className={styles.printFull}>
                Üretim notu
                <textarea
                  value={printNotes}
                  onChange={(changeEvent) =>
                    setPrintNotes(changeEvent.target.value)
                  }
                  maxLength={2000}
                />
              </label>
              <label className={styles.printFile}>
                Baskıya hazır PDF
                <input
                  type="file"
                  accept="application/pdf,.pdf"
                  onChange={(changeEvent) =>
                    setPrintPdf(changeEvent.target.files?.[0] || null)
                  }
                  required
                />
                <small>
                  En fazla 100 MB · ölçü, taşma payı ve sayfa sayısı otomatik
                  kontrol edilir.
                </small>
              </label>
              <button
                type="submit"
                disabled={
                  createPrintJob.isPending || !printPrinterId || !printPdf
                }
              >
                <Send size={17} />
                {createPrintJob.isPending
                  ? "PDF kontrol ediliyor…"
                  : "Baskı operasyonuna gönder"}
              </button>
            </form>
          )}
          {printJobs.data?.length ? (
            <div className={styles.printFiles}>
              <h3>Bu organizasyonun baskı dosyaları</h3>
              {printJobs.data.map((job) => (
                <article key={job.id}>
                  <div>
                    <strong>{job.product_description}</strong>
                    <span>
                      {job.quantity} adet · {job.printer_name}
                    </span>
                    <small>
                      {job.production_pdf ? "PDF yüklendi" : "PDF bekleniyor"}
                    </small>
                  </div>
                  <label>
                    PDF yükle / değiştir
                    <input
                      className={styles.srOnly}
                      type="file"
                      accept="application/pdf,.pdf"
                      disabled={replacePrintPdf.isPending}
                      onChange={(changeEvent) => {
                        const file = changeEvent.target.files?.[0];
                        if (file)
                          replacePrintPdf.mutate({ jobId: job.id, file });
                        changeEvent.target.value = "";
                      }}
                    />
                  </label>
                  {job.production_pdf ? (
                    <a href={`/api/admin/print-jobs/${job.id}/production-pdf`}>
                      <Download size={15} /> PDF'i indir
                    </a>
                  ) : null}
                </article>
              ))}
            </div>
          ) : null}
        </section>
      ) : null}
      <footer className={styles.actions}>
        {platform ? (
          <>
            <Link href="/admin/design-plans">Tasarım planlarına dön</Link>
            <label className={styles.approvalMessage}>
              Müşteriye gönderilecek açıklama
              <textarea value={approvalMessage} onChange={(event) => setApprovalMessage(event.target.value)} maxLength={1000} placeholder="QR tasarımıyla ilgili teslim notunu ve müşteriden beklediğiniz kontrolü yazın." />
            </label>
            <button
              onClick={async () => {
                try {
                  await api(`/admin/weddings/${event.id}/design-request/send`, {
                    method: "POST",
                    body: JSON.stringify({ message: approvalMessage }),
                  });
                  await qc.invalidateQueries({
                    queryKey: ["admin-wedding", event.id],
                  });
                  toast.success("Tasarımlar müşteriye gönderildi.");
                } catch (e) {
                  toast.error(
                    e instanceof Error ? e.message : "Gönderilemedi.",
                  );
                }
              }}
            >
              <Send size={17} /> Onaya gönder
            </button>
          </>
        ) : (
          <>
            <button
              disabled={locked || save.isPending}
              onClick={() => save.mutate("save")}
            >
              Taslağı kaydet
            </button>
            <button
              disabled={locked || save.isPending}
              onClick={() => save.mutate("submit")}
            >
              <Send size={17} /> Talebi gönder
            </button>
          </>
        )}
      </footer>
    </main>
  );
}
function Select({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
}) {
  return (
    <label>
      {label}
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">Seçin</option>
        {options.map((x) => (
          <option key={x}>{x}</option>
        ))}
      </select>
    </label>
  );
}
function FieldGuideLabel({
  number,
  title,
  location,
}: {
  number: number;
  title: string;
  location: string;
}) {
  return (
    <span className={styles.fieldGuideLabel}>
      <b>{number}</b>
      <span>
        <strong>{title}</strong>
        <small>{location}</small>
      </span>
    </span>
  );
}

function UploadBox({
  label,
  busy,
  onFile,
}: {
  label: string;
  busy: boolean;
  onFile: (file: File) => void;
}) {
  return (
    <label className={styles.upload}>
      <CloudUpload />
      <strong>{busy ? "Yükleniyor…" : label}</strong>
      <span>JPG, PNG veya WebP · en fazla 2 MB</span>
      <input
        type="file"
        accept="image/jpeg,image/png,image/webp"
        disabled={busy}
        onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
      />
    </label>
  );
}
