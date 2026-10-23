"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Check,
  CheckCircle2,
  FileCheck2,
  Gift,
  LayoutTemplate,
  LoaderCircle,
  LockKeyhole,
  Maximize2,
  Palette,
  PencilLine,
  Ruler,
  Save,
  ShieldCheck,
  Undo2,
  Redo2,
} from "lucide-react";
import { toast } from "sonner";
import { api, type Wedding } from "@/lib/api";
import type { AddOnProduct } from "@/lib/models";
import { resolvePackageSnapshot } from "@/lib/commercial-policy";
import {
  designSchema,
  qrCollectionReferences,
  resolveDesign,
  type WeddingDesign,
} from "@/lib/design";
import { buildQrCards, svgDataUrl } from "@/lib/qr-card";
import {
  defaultQrProduct,
  qrProductEntitlement,
  qrProducts,
  resolveQrProduct,
  validateQrProduct,
  type QrProductId,
} from "@/lib/qr-products";
import {
  qrTemplates,
  resolvePhysicalQrBackground,
  resolveQrVariant,
} from "@/lib/qr-templates";
import styles from "./QrDesignWorkspace.module.css";

const stepDefinitions = [
  { id: "template", label: "Template", icon: LayoutTemplate },
  { id: "size", label: "Ölçü", icon: Ruler },
  { id: "extras", label: "Ekstralar", icon: Gift },
  { id: "color", label: "Renk", icon: Palette },
  { id: "edit", label: "Düzenle", icon: PencilLine },
  { id: "save", label: "Kaydet", icon: FileCheck2 },
] as const;
type StepId = (typeof stepDefinitions)[number]["id"];

const qrAssetCache = new Map<string, Promise<string>>();
function assetAsDataUrl(path: string) {
  const cached = qrAssetCache.get(path);
  if (cached) return cached;
  const pending = fetch(path).then(async (response) => {
    if (!response.ok) throw new Error("QR kartı görseli yüklenemedi.");
    const blob = await response.blob();
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error("QR kartı görseli okunamadı."));
      reader.readAsDataURL(blob);
    });
  });
  qrAssetCache.set(path, pending);
  return pending;
}

function money(cents: number) {
  return new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" }).format(cents / 100);
}

export function QrDesignWorkspace({ event }: { event: Wedding }) {
  const queryClient = useQueryClient();
  const initial = useMemo(() => resolveDesign(event.design), [event.design]);
  const [design, setDesignState] = useState(initial);
  const [savedDesign, setSavedDesign] = useState(initial);
  const [selectedAddOns, setSelectedAddOns] = useState(event.add_on_selections || []);
  const [savedAddOns, setSavedAddOns] = useState(event.add_on_selections || []);
  const [activeStep, setActiveStep] = useState<StepId>(initial.qrCompleted ? "edit" : "template");
  const [furthestStep, setFurthestStep] = useState(initial.qrCompleted ? 5 : 0);
  const [face, setFace] = useState<"front" | "back">("front");
  const [safeArea, setSafeArea] = useState(true);
  const [zoom, setZoom] = useState(100);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [url, setUrl] = useState("");
  const [cards, setCards] = useState<ReturnType<typeof buildQrCards> | null>(null);
  const history = useRef<WeddingDesign[]>([]);
  const future = useRef<WeddingDesign[]>([]);

  const addOns = useQuery({
    queryKey: ["add-ons"],
    queryFn: () => api<AddOnProduct[]>("/admin/add-ons"),
  });
  const activeAddOns = useMemo(() => (addOns.data || []).filter((item) => item.active), [addOns.data]);
  const packagePolicy = useMemo(
    () => resolvePackageSnapshot(event.package_snapshot, event.package_code),
    [event.package_code, event.package_snapshot],
  );
  const activeStepIndex = stepDefinitions.findIndex((step) => step.id === activeStep);
  const selectedProduct = resolveQrProduct(design.qrProductId || defaultQrProduct.id);
  const productAccess = qrProductEntitlement(selectedProduct, packagePolicy);
  const variant = resolveQrVariant(design.qrTemplateId, design.qrColorVariant);
  const template = qrTemplates[design.qrTemplateId];
  const usesFlatBackground = design.qrColorVariant === template.defaultVariant;
  const frontBackground = resolvePhysicalQrBackground(design.qrTemplateId, design.qrColorVariant, "front") ?? (usesFlatBackground ? template.flatBackground : variant.front);
  const backBackground = resolvePhysicalQrBackground(design.qrTemplateId, design.qrColorVariant, "back") ?? (usesFlatBackground ? template.flatBackground : variant.back);
  const dirty = JSON.stringify(design) !== JSON.stringify(savedDesign) || JSON.stringify(selectedAddOns) !== JSON.stringify(savedAddOns);
  const validation = useMemo(() => validateQrProduct(selectedProduct, design, url), [design, selectedProduct, url]);
  const canComplete = Boolean(cards && productAccess.allowed && validation.passed && design.qrHook.trim() && design.qrDescription.trim() && design.qrCta.trim());

  useEffect(() => setUrl(`${window.location.origin}/q/${event.id}`), [event.id]);
  useEffect(() => {
    if (!url) return;
    let live = true;
    Promise.all([
      assetAsDataUrl(frontBackground),
      assetAsDataUrl(backBackground),
      assetAsDataUrl("/fonts/qr/cormorant-garamond-500.ttf"),
      assetAsDataUrl("/fonts/qr/cormorant-garamond-500-italic.ttf"),
      assetAsDataUrl("/fonts/qr/cinzel-600.ttf"),
      assetAsDataUrl("/fonts/qr/allura-400.ttf"),
      assetAsDataUrl("/fonts/qr/manrope-400.ttf"),
    ]).then(([front, back, cormorant, cormorantItalic, cinzel, allura, manrope]) => {
      if (live) setCards(buildQrCards(design, event.title, event.wedding_date, url, { front, back, fonts: { cormorant, cormorantItalic, cinzel, allura, manrope } }));
    }).catch((reason: Error) => live && setError(reason.message));
    return () => { live = false; };
  }, [backBackground, design, event.title, event.wedding_date, frontBackground, url]);
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  function replaceDesign(next: WeddingDesign) {
    history.current = [...history.current.slice(-49), design];
    future.current = [];
    setDesignState({ ...next, qrCompleted: false });
    setError("");
  }
  function update<K extends keyof WeddingDesign>(key: K, value: WeddingDesign[K]) {
    replaceDesign({ ...design, [key]: value });
  }
  function undo() {
    const previous = history.current.at(-1);
    if (!previous) return;
    history.current = history.current.slice(0, -1);
    future.current = [design, ...future.current].slice(0, 50);
    setDesignState(previous);
  }
  function redo() {
    const next = future.current[0];
    if (!next) return;
    future.current = future.current.slice(1);
    history.current = [...history.current.slice(-49), design];
    setDesignState(next);
  }
  function chooseTemplate(id: WeddingDesign["qrTemplateId"]) {
    const nextProduct = qrProducts.find((product) => product.compatibleTemplates.includes(id) && qrProductEntitlement(product, packagePolicy).allowed);
    replaceDesign({
      ...design,
      qrTemplateId: id,
      qrColorVariant: qrTemplates[id].defaultVariant,
      qrProductId: nextProduct?.id || design.qrProductId,
    });
    setFace("front");
  }
  function toggleAddOn(productId: string) {
    setSelectedAddOns((current) => current.some((item) => item.product_id === productId)
      ? current.filter((item) => item.product_id !== productId)
      : [...current, { product_id: productId, quantity: 1 }]);
  }
  function setAddOnQuantity(productId: string, quantity: number) {
    setSelectedAddOns((current) => current.map((item) => item.product_id === productId ? { ...item, quantity: Math.max(1, Math.min(100, quantity || 1)) } : item));
  }
  function advance() {
    if (activeStep === "size" && !productAccess.allowed) {
      setError(productAccess.reason);
      return;
    }
    const next = Math.min(stepDefinitions.length - 1, activeStepIndex + 1);
    setFurthestStep((current) => Math.max(current, next));
    setActiveStep(stepDefinitions[next].id);
    setError("");
  }
  async function save(complete: boolean) {
    const nextDesign = { ...design, qrCompleted: complete };
    const parsed = designSchema.safeParse(nextDesign);
    if (!parsed.success) return setError(parsed.error.issues[0].message);
    if (complete && !canComplete) return setError("QR aşamasını tamamlamak için ürün ve tasarım kontrollerini düzeltin.");
    setBusy(true);
    setError("");
    try {
      const response = await api<{ design: WeddingDesign; revision: number; add_on_selections: Wedding["add_on_selections"] }>(`/admin/weddings/${event.id}/design`, {
        method: "PUT",
        body: JSON.stringify({ design: parsed.data, add_on_selections: selectedAddOns }),
      });
      setDesignState(response.design);
      setSavedDesign(response.design);
      setSavedAddOns(response.add_on_selections || selectedAddOns);
      history.current = [];
      future.current = [];
      queryClient.setQueryData<Wedding>(["admin-wedding", event.id], (current) => current ? { ...current, design: response.design, add_on_selections: response.add_on_selections || selectedAddOns } : current);
      toast.success(complete ? "QR aşaması tamamlandı. Loading Page kilidi açıldı." : `QR taslağı kaydedildi · sürüm ${response.revision}`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Tasarım kaydedilemedi.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className={styles.workspace} aria-label="QR tasarım editörü">
      <header className={styles.toolbar}>
        <div>
          <span>QR TASARIM STÜDYOSU</span>
          <h1>{event.title}</h1>
        </div>
        <div className={styles.toolbarActions}>
          <button type="button" onClick={undo} disabled={!history.current.length || busy} aria-label="Geri al"><Undo2 size={17} /></button>
          <button type="button" onClick={redo} disabled={!future.current.length || busy} aria-label="Yinele"><Redo2 size={17} /></button>
          <i />
          <span className={styles.saveState}><CheckCircle2 size={16} /> {dirty ? "Kaydedilmemiş değişiklikler" : "Taslak kaydedildi"}</span>
        </div>
      </header>

      <div className={styles.editorGrid}>
        <nav className={styles.stepRail} aria-label="QR tasarım adımları">
          {stepDefinitions.map((step, index) => {
            const Icon = step.icon;
            const complete = design.qrCompleted || index < activeStepIndex;
            const available = index <= furthestStep;
            return (
              <button key={step.id} type="button" data-active={step.id === activeStep} data-complete={complete} disabled={!available} onClick={() => available && setActiveStep(step.id)}>
                <span>{complete ? <Check size={15} /> : index + 1}</span>
                <Icon size={19} />
                <strong>{step.label}</strong>
                <small>{step.id === activeStep ? "Şu anki adım" : complete ? "Tamamlandı" : available ? "Düzenlenebilir" : "Henüz açılmadı"}</small>
              </button>
            );
          })}
        </nav>

        <main className={styles.canvasArea}>
          <div className={styles.canvasToolbar}>
            <div className={styles.segmented}>
              <button type="button" aria-pressed={face === "front"} onClick={() => setFace("front")}>Ön yüz</button>
              <button type="button" aria-pressed={face === "back"} onClick={() => setFace("back")}>Arka yüz</button>
            </div>
            <div className={styles.canvasTools}>
              <button type="button" onClick={() => setZoom((value) => Math.max(70, value - 10))} aria-label="Uzaklaştır">−</button>
              <span>{zoom}%</span>
              <button type="button" onClick={() => setZoom((value) => Math.min(120, value + 10))} aria-label="Yakınlaştır">+</button>
              <button type="button" aria-pressed={safeArea} onClick={() => setSafeArea((value) => !value)}><ShieldCheck size={16} /> Güvenli alan</button>
              <button type="button" onClick={() => setZoom(100)} aria-label="Önizlemeyi sıfırla"><Maximize2 size={16} /></button>
            </div>
          </div>
          <div className={styles.canvasStage}>
            <div className={styles.cardFrame} style={{ "--card-zoom": zoom / 100, aspectRatio: `${selectedProduct.trimWidthMm} / ${selectedProduct.trimHeightMm}` } as React.CSSProperties}>
              {cards ? <img src={svgDataUrl(cards[face])} alt={face === "front" ? "QR kartı ön yüz canlı önizlemesi" : "QR kartı arka yüz canlı önizlemesi"} /> : <LoaderCircle className={styles.spinner} />}
              {safeArea ? <span className={styles.safeArea} aria-hidden="true" /> : null}
            </div>
          </div>
          <div className={styles.canvasMeta}>
            <span>{selectedProduct.shortName}</span>
            <strong>{selectedProduct.trimWidthMm / 10} × {selectedProduct.trimHeightMm / 10} cm · {selectedProduct.dpi} DPI</strong>
          </div>
        </main>

        <aside className={styles.inspector}>
          <InspectorContent
            step={activeStep}
            design={design}
            event={event}
            packagePolicy={packagePolicy}
            activeAddOns={activeAddOns}
            addOnsLoading={addOns.isLoading}
            selectedAddOns={selectedAddOns}
            selectedProductId={selectedProduct.id}
            validation={validation}
            productAccess={productAccess}
            onTemplate={chooseTemplate}
            onProduct={(id) => update("qrProductId", id)}
            onAddOn={toggleAddOn}
            onAddOnQuantity={setAddOnQuantity}
            onColor={(id) => update("qrColorVariant", id)}
            onUpdate={update}
          />
          {error ? <p className={styles.error} role="alert">{error}</p> : null}
          <footer className={styles.inspectorFooter}>
            {activeStepIndex > 0 ? <button type="button" className={styles.secondary} disabled={busy} onClick={() => setActiveStep(stepDefinitions[activeStepIndex - 1].id)}>Geri</button> : <span />}
            {activeStep === "save" ? (
              <button type="button" className={styles.primary} disabled={busy || !canComplete} onClick={() => void save(true)}>{busy ? <LoaderCircle className={styles.spinnerSmall} /> : <FileCheck2 size={17} />} QR aşamasını tamamla</button>
            ) : (
              <button type="button" className={styles.primary} disabled={busy} onClick={advance}>Devam et</button>
            )}
          </footer>
        </aside>
      </div>

      <footer className={styles.bottomBar}>
        <div><Save size={17} /><span><strong>{dirty ? "Değişiklikleriniz henüz kaydedilmedi" : "Tüm değişiklikler kaydedildi"}</strong><small>QR tamamlanmadan Loading Page açılmaz.</small></span></div>
        <button type="button" disabled={busy || !dirty} onClick={() => void save(false)}>{busy ? "Kaydediliyor…" : "Taslak olarak kaydet"}</button>
      </footer>
    </section>
  );
}

function InspectorContent({
  step, design, event, packagePolicy, activeAddOns, addOnsLoading, selectedAddOns, selectedProductId, validation, productAccess,
  onTemplate, onProduct, onAddOn, onAddOnQuantity, onColor, onUpdate,
}: {
  step: StepId;
  design: WeddingDesign;
  event: Wedding;
  packagePolicy: NonNullable<Wedding["package_snapshot"]>;
  activeAddOns: AddOnProduct[];
  addOnsLoading: boolean;
  selectedAddOns: NonNullable<Wedding["add_on_selections"]>;
  selectedProductId: QrProductId;
  validation: ReturnType<typeof validateQrProduct>;
  productAccess: ReturnType<typeof qrProductEntitlement>;
  onTemplate: (id: WeddingDesign["qrTemplateId"]) => void;
  onProduct: (id: QrProductId) => void;
  onAddOn: (id: string) => void;
  onAddOnQuantity: (id: string, quantity: number) => void;
  onColor: (id: WeddingDesign["qrColorVariant"]) => void;
  onUpdate: <K extends keyof WeddingDesign>(key: K, value: WeddingDesign[K]) => void;
}) {
  if (step === "template") return <>
    <InspectorHeading eyebrow="1. ADIM" title="Template seçin" text="Davetinizin tarzına uygun QR tasarımını belirleyin." />
    <div className={styles.templateList}>{qrCollectionReferences.map((item) => {
      const ready = qrProducts.some((product) => product.artworkReady && product.compatibleTemplates.includes(item.id));
      return <button type="button" key={item.id} disabled={!ready} aria-pressed={design.qrTemplateId === item.id} onClick={() => onTemplate(item.id)}>
        <img src={item.image} alt="" /><span><strong>{item.name}</strong><small>{item.tagline}</small></span>{ready ? design.qrTemplateId === item.id ? <CheckCircle2 size={18} /> : null : <em>Yakında</em>}
      </button>;
    })}</div>
  </>;

  if (step === "size") return <>
    <InspectorHeading eyebrow="2. ADIM" title="Ürün ve ölçü" text="Paketinize ve seçtiğiniz template’e uygun fiziksel ürünü seçin." />
    <div className={styles.productList}>{qrProducts.map((product) => {
      const access = qrProductEntitlement(product, packagePolicy);
      const compatible = product.compatibleTemplates.includes(design.qrTemplateId);
      const enabled = access.allowed && compatible;
      return <button type="button" key={product.id} disabled={!enabled} aria-pressed={selectedProductId === product.id} onClick={() => onProduct(product.id)}>
        <span className={styles.productShape} style={{ aspectRatio: `${product.trimWidthMm}/${product.trimHeightMm}` }} />
        <span><strong>{product.shortName}</strong><small>{product.trimWidthMm / 10} × {product.trimHeightMm / 10} cm · {access.reason}</small></span>
        {enabled ? selectedProductId === product.id ? <CheckCircle2 size={18} /> : null : <LockKeyhole size={17} />}
      </button>;
    })}</div>
    {!productAccess.allowed ? <p className={styles.notice}>{productAccess.reason}</p> : null}
  </>;

  if (step === "extras") return <>
    <InspectorHeading eyebrow="3. ADIM" title="Ekstralar" text="Onaylı katalogdaki ek ürünleri organizasyonunuza ekleyin. Fiyatlar KDV dâhildir." />
    {addOnsLoading ? <p className={styles.empty}><LoaderCircle className={styles.spinnerSmall} /> Ekstralar yükleniyor…</p> : null}
    {!addOnsLoading && !activeAddOns.length ? <p className={styles.empty}>Şu anda seçilebilir aktif ekstra bulunmuyor. Bu adımı seçim yapmadan geçebilirsiniz.</p> : null}
    <div className={styles.extraList}>{activeAddOns.map((product) => {
      const selection = selectedAddOns.find((item) => item.product_id === product.id);
      return <div key={product.id} data-selected={Boolean(selection)}>
        <label><input type="checkbox" checked={Boolean(selection)} onChange={() => onAddOn(product.id)} /><span><strong>{product.name}</strong><small>{product.description}</small></span><b>{money(product.gross_price_cents)}</b></label>
        {selection ? <label className={styles.quantity}>Adet <input type="number" min="1" max="100" value={selection.quantity} onChange={(event) => onAddOnQuantity(product.id, Number(event.target.value))} /></label> : null}
      </div>;
    })}</div>
  </>;

  if (step === "color") return <>
    <InspectorHeading eyebrow="4. ADIM" title="Renk seçin" text={`${qrTemplates[design.qrTemplateId].name} için hazırlanan renk varyasyonlarından birini seçin.`} />
    <div className={styles.colorList}>{qrTemplates[design.qrTemplateId].variants.map((variant) => <button type="button" key={variant.id} aria-pressed={design.qrColorVariant === variant.id} onClick={() => onColor(variant.id)}>
      <span style={{ background: variant.swatch }} /> <strong>{variant.name}</strong>{design.qrColorVariant === variant.id ? <Check size={16} /> : null}
    </button>)}</div>
  </>;

  if (step === "edit") return <>
    <InspectorHeading eyebrow="5. ADIM" title="İçerik ve yerleşim" text="Kart üzerindeki metinleri ve QR boyutunu canlı önizlemeyle düzenleyin." />
    <label className={styles.field}>Başlık<textarea rows={2} maxLength={72} value={design.qrHook} onChange={(event) => onUpdate("qrHook", event.target.value)} /><small>{design.qrHook.length}/72</small></label>
    <label className={styles.field}>Açıklama<textarea rows={3} maxLength={110} value={design.qrDescription} onChange={(event) => onUpdate("qrDescription", event.target.value)} /><small>{design.qrDescription.length}/110</small></label>
    <label className={styles.field}>CTA metni<textarea rows={2} maxLength={48} value={design.qrCta} onChange={(event) => onUpdate("qrCta", event.target.value)} /><small>{design.qrCta.length}/48</small></label>
    <label className={styles.field}>Görünen isimler<input maxLength={100} value={design.names} placeholder={event.title} onChange={(event) => onUpdate("names", event.target.value)} /></label>
    <label className={styles.rangeField}>QR kod boyutu <strong>{Math.round(design.qrLayout.qr.width)} px</strong><input type="range" min="140" max="300" value={design.qrLayout.qr.width} onChange={(event) => { const size = Number(event.target.value); onUpdate("qrLayout", { ...design.qrLayout, qr: { ...design.qrLayout.qr, width: size, height: size } }); }} /></label>
  </>;

  return <>
    <InspectorHeading eyebrow="6. ADIM" title="Son kontrol" text="QR tasarımını tamamlamadan önce ürün ve baskı kontrollerini gözden geçirin." />
    <dl className={styles.summary}>
      <div><dt>Template</dt><dd>{qrTemplates[design.qrTemplateId].name}</dd></div>
      <div><dt>Ürün</dt><dd>{resolveQrProduct(design.qrProductId).shortName}</dd></div>
      <div><dt>Renk</dt><dd>{resolveQrVariant(design.qrTemplateId, design.qrColorVariant).name}</dd></div>
      <div><dt>Ekstralar</dt><dd>{selectedAddOns.length ? `${selectedAddOns.length} seçim` : "Seçilmedi"}</dd></div>
    </dl>
    <div className={styles.validation}><header><strong>Tasarım kontrolü</strong><span>{validation.passed && productAccess.allowed ? "Tüm kriterler uygun" : "Kontrol gerekli"}</span></header>{validation.checks.map((check) => <p key={check.id} data-pass={check.passed}><ShieldCheck size={15} /> {check.label}</p>)}</div>
  </>;
}

function InspectorHeading({ eyebrow, title, text }: { eyebrow: string; title: string; text: string }) {
  return <header className={styles.inspectorHeading}><span>{eyebrow}</span><h2>{title}</h2><p>{text}</p></header>;
}
