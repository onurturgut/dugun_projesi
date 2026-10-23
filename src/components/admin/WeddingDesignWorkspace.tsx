"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState, type PointerEvent as ReactPointerEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Check,
  CheckCircle2,
  Crop,
  FileCheck2,
  Images,
  LayoutTemplate,
  LoaderCircle,
  Move,
  RotateCcw,
  Save,
  Smartphone,
  UploadCloud,
} from "lucide-react";
import { toast } from "sonner";
import { WeddingPageTemplate } from "@/components/wedding/WeddingPageTemplate";
import { api, type Wedding } from "@/lib/api";
import { designSchema, resolveDesign, type WeddingDesign } from "@/lib/design";
import {
  resolveWeddingTemplate,
  weddingImageBelongsToEvent,
  weddingTemplates,
  type WeddingTemplateId,
} from "@/lib/wedding-templates";
import styles from "./WeddingDesignWorkspace.module.css";

const steps = [
  { id: "template", label: "Template", icon: LayoutTemplate },
  { id: "photo", label: "Fotoğraf", icon: Images },
  { id: "place", label: "Yerleştir", icon: Move },
  { id: "crop", label: "Kırp ve yakınlaştır", icon: Crop },
  { id: "preview", label: "Önizleme", icon: Smartphone },
  { id: "save", label: "Kaydet", icon: FileCheck2 },
] as const;
type StepId = (typeof steps)[number]["id"];

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

export function WeddingDesignWorkspace({ event }: { event: Wedding }) {
  const queryClient = useQueryClient();
  const initial = useMemo(() => resolveDesign(event.design), [event.design]);
  const photos = useMemo(
    () => [...new Set((event.cover_images || []).filter(Boolean))],
    [event.cover_images],
  );
  const initialTemplate = resolveWeddingTemplate(initial.pageTemplate);
  const initialPhotoValid = weddingImageBelongsToEvent(initial.weddingImage, photos) && Boolean(initial.weddingImage);
  const initialComplete = initial.weddingCompleted && initialPhotoValid && Boolean(initialTemplate);
  const initialStep = initialComplete ? 4 : initialPhotoValid ? 2 : initialTemplate ? 1 : 0;
  const [design, setDesign] = useState(initial);
  const [savedDesign, setSavedDesign] = useState(initial);
  const [activeStep, setActiveStep] = useState<StepId>(steps[initialStep].id);
  const [furthestStep, setFurthestStep] = useState(initialComplete ? 5 : initialStep);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const activeIndex = steps.findIndex((step) => step.id === activeStep);
  const selectedTemplate = resolveWeddingTemplate(design.pageTemplate);
  const photoValid = Boolean(design.weddingImage) && weddingImageBelongsToEvent(design.weddingImage, photos);
  const dirty = JSON.stringify(design) !== JSON.stringify(savedDesign);
  const canComplete = Boolean(selectedTemplate && photoValid && design.loadingCompleted);
  const workflowComplete = Boolean(design.weddingCompleted && selectedTemplate && photoValid);

  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  function replaceDesign(patch: Partial<WeddingDesign>) {
    setDesign((current) => ({ ...current, ...patch, weddingCompleted: false }));
    setError("");
  }

  function chooseTemplate(id: WeddingTemplateId) {
    replaceDesign({
      pageTemplate: id,
      weddingTemplateVersion: 1,
      weddingImagePositionX: 50,
      weddingImagePositionY: 50,
      weddingImageZoom: 1,
    });
  }

  function choosePhoto(image: string) {
    replaceDesign({
      weddingImage: image,
      weddingImagePositionX: 50,
      weddingImagePositionY: 50,
      weddingImageZoom: 1,
    });
  }

  function resetCrop() {
    replaceDesign({
      weddingImagePositionX: 50,
      weddingImagePositionY: 50,
      weddingImageZoom: 1,
    });
  }

  function beginPhotoMove(event: ReactPointerEvent<HTMLDivElement>) {
    if (activeStep !== "place" && activeStep !== "crop") return;
    event.preventDefault();
    const bounds = event.currentTarget.getBoundingClientRect();
    const startX = event.clientX;
    const startY = event.clientY;
    const initialX = design.weddingImagePositionX;
    const initialY = design.weddingImagePositionY;
    const move = (pointer: PointerEvent) => {
      const x = clamp(initialX - ((pointer.clientX - startX) / bounds.width) * 100, 0, 100);
      const y = clamp(initialY - ((pointer.clientY - startY) / bounds.height) * 100, 0, 100);
      setDesign((current) => ({
        ...current,
        weddingImagePositionX: x,
        weddingImagePositionY: y,
        weddingCompleted: false,
      }));
    };
    const end = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", end);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", end, { once: true });
  }

  function advance() {
    if (activeStep === "template" && !selectedTemplate) {
      setError("Devam etmek için bir Wedding template seçin.");
      return;
    }
    if (activeStep === "photo" && !photoValid) {
      setError("Devam etmek için organizasyon fotoğraflarından birini seçin.");
      return;
    }
    const next = Math.min(steps.length - 1, activeIndex + 1);
    setFurthestStep((current) => Math.max(current, next));
    setActiveStep(steps[next].id);
    setError("");
  }

  async function save(complete: boolean) {
    if (complete && !canComplete) {
      setError("Wedding aşamasını tamamlamak için template ve organizasyon fotoğrafı seçin.");
      return;
    }
    const parsed = designSchema.safeParse({ ...design, weddingCompleted: complete });
    if (!parsed.success) {
      setError(parsed.error.issues[0].message);
      return;
    }
    setBusy(true);
    setError("");
    try {
      const response = await api<{ design: WeddingDesign; revision: number }>(
        `/admin/weddings/${event.id}/design`,
        { method: "PUT", body: JSON.stringify(parsed.data) },
      );
      setDesign(response.design);
      setSavedDesign(response.design);
      queryClient.setQueryData<Wedding>(["admin-wedding", event.id], (current) =>
        current ? { ...current, design: response.design } : current,
      );
      await queryClient.invalidateQueries({ queryKey: ["wedding", event.slug] });
      toast.success(
        complete
          ? "Wedding aşaması tamamlandı. Tasarım akışı hazır."
          : `Wedding taslağı kaydedildi · sürüm ${response.revision}`,
      );
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Wedding tasarımı kaydedilemedi.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className={styles.workspace} aria-label="Wedding tasarım editörü">
      <header className={styles.toolbar}>
        <div>
          <span>WEDDING TASARIM STÜDYOSU</span>
          <h1>{event.title}</h1>
        </div>
        <span className={styles.saveState} data-dirty={dirty}>
          <CheckCircle2 size={16} />
          {dirty ? "Kaydedilmemiş değişiklikler" : workflowComplete ? "Wedding tamamlandı" : "Taslak kaydedildi"}
        </span>
      </header>

      <div className={styles.editorGrid}>
        <nav className={styles.stepRail} aria-label="Wedding tasarım adımları">
          {steps.map((step, index) => {
            const Icon = step.icon;
            const complete = workflowComplete || index < activeIndex;
            const available = index <= furthestStep;
            return (
              <button
                key={step.id}
                type="button"
                data-active={step.id === activeStep}
                data-complete={complete}
                disabled={!available}
                onClick={() => available && setActiveStep(step.id)}
              >
                <span>{complete ? <Check size={14} /> : index + 1}</span>
                <Icon size={18} />
                <strong>{step.label}</strong>
                <small>{step.id === activeStep ? "Şu anki adım" : complete ? "Tamamlandı" : available ? "Düzenlenebilir" : "Henüz açılmadı"}</small>
              </button>
            );
          })}
        </nav>

        <main className={styles.previewArea}>
          <div className={styles.previewToolbar}>
            <span><Smartphone size={17} /> Telefon canlı önizlemesi</span>
            {(activeStep === "place" || activeStep === "crop") && photoValid ? (
              <span className={styles.dragHint}><Move size={15} /> Fotoğrafı telefon üzerinde sürükleyin</span>
            ) : null}
          </div>
          <div className={styles.previewStage}>
            <div className={styles.phone}>
              <div className={styles.phoneSpeaker} aria-hidden="true" />
              <div className={styles.phoneScreen}>
                <WeddingPageTemplate
                  preview
                  design={design}
                  images={photoValid ? [design.weddingImage] : photos}
                  title={event.title}
                  date={event.wedding_date}
                  onPhotoPointerDown={photoValid ? beginPhotoMove : undefined}
                >
                  <div className={styles.guestPreviewCard} aria-hidden="true">
                    <UploadCloud size={30} strokeWidth={1.4} />
                    <strong>{design.uploadTitle}</strong>
                    <span>{design.uploadPrompt}</span>
                    <i />
                    <i />
                    <button type="button" tabIndex={-1}>Yükle</button>
                  </div>
                </WeddingPageTemplate>
              </div>
            </div>
          </div>
          <footer className={styles.previewMeta}>
            <span>{activeStep === "place" || activeStep === "crop" ? "Canlı kadraj düzenleme açık" : "Gerçek Wedding sayfası görünümü"}</span>
            <strong>{selectedTemplate?.name || "Template seçilmedi"}</strong>
          </footer>
        </main>

        <aside className={styles.inspector}>
          <Inspector
            step={activeStep}
            event={event}
            design={design}
            photos={photos}
            selectedTemplate={selectedTemplate}
            photoValid={photoValid}
            onTemplate={chooseTemplate}
            onPhoto={choosePhoto}
            onCrop={replaceDesign}
            onReset={resetCrop}
          />
          {error ? <p className={styles.error} role="alert">{error}</p> : null}
          <footer className={styles.inspectorFooter}>
            {activeIndex > 0 ? (
              <button type="button" className={styles.secondary} disabled={busy} onClick={() => setActiveStep(steps[activeIndex - 1].id)}>Geri</button>
            ) : <span />}
            {activeStep === "save" ? (
              <button type="button" className={styles.primary} disabled={busy || !canComplete} onClick={() => void save(true)}>
                {busy ? <LoaderCircle className={styles.spinner} /> : <FileCheck2 size={16} />} Wedding aşamasını tamamla
              </button>
            ) : (
              <button type="button" className={styles.primary} disabled={busy} onClick={advance}>Devam et</button>
            )}
          </footer>
        </aside>
      </div>

      <footer className={styles.bottomBar}>
        <div><Save size={17} /><span><strong>{dirty ? "Değişiklikleriniz henüz kaydedilmedi" : "Tüm değişiklikler kaydedildi"}</strong><small>Fotoğraf organizasyon kaydından kullanılır; orijinal dosya değiştirilmez.</small></span></div>
        <button type="button" disabled={busy || !dirty} onClick={() => void save(false)}>{busy ? <LoaderCircle className={styles.spinner} /> : <Save size={16} />} Taslağı kaydet</button>
      </footer>
    </section>
  );
}

function Inspector({
  step,
  event,
  design,
  photos,
  selectedTemplate,
  photoValid,
  onTemplate,
  onPhoto,
  onCrop,
  onReset,
}: {
  step: StepId;
  event: Wedding;
  design: WeddingDesign;
  photos: string[];
  selectedTemplate: ReturnType<typeof resolveWeddingTemplate>;
  photoValid: boolean;
  onTemplate: (id: WeddingTemplateId) => void;
  onPhoto: (image: string) => void;
  onCrop: (patch: Partial<WeddingDesign>) => void;
  onReset: () => void;
}) {
  if (step === "template") return <>
    <Heading step="1. ADIM" title="Wedding template" description="Wedding sayfanızın görsel yönünü seçin." />
    <div className={styles.templateGrid}>
      {weddingTemplates.map((template) => (
        <button key={template.id} type="button" aria-pressed={design.pageTemplate === template.id} onClick={() => onTemplate(template.id)}>
          <span className={styles.templateImage}><Image src={template.reference} alt="" fill sizes="120px" /></span>
          <span><b>{template.number}</b><strong>{template.name}</strong><small>{template.description}</small></span>
          {design.pageTemplate === template.id ? <i><Check size={13} /></i> : null}
        </button>
      ))}
    </div>
  </>;

  if (step === "photo") return <>
    <Heading step="2. ADIM" title="Organizasyon fotoğrafı" description="Organizasyon oluşturulurken yüklenen fotoğraflardan birini seçin." />
    {photos.length ? (
      <div className={styles.photoGrid}>
        {photos.map((photo, index) => (
          <button key={photo} type="button" aria-pressed={design.weddingImage === photo} onClick={() => onPhoto(photo)}>
            <Image src={photo} alt={`${event.title} organizasyon fotoğrafı ${index + 1}`} fill unoptimized sizes="140px" />
            {design.weddingImage === photo ? <span><Check size={15} /> Seçildi</span> : null}
          </button>
        ))}
      </div>
    ) : (
      <div className={styles.emptyState}>
        <Images size={25} />
        <strong>Organizasyon fotoğrafı bulunamadı</strong>
        <p>Wedding alanında yeni fotoğraf yüklenmez. Önce organizasyon bilgilerine fotoğraf ekleyin.</p>
        <Link href={`/admin/${event.id}`}>Organizasyon bilgilerine dön</Link>
      </div>
    )}
  </>;

  if (step === "place") return <>
    <Heading step="3. ADIM" title="Fotoğrafı yerleştir" description="Telefon önizlemesindeki fotoğrafı sürükleyerek odak noktasını ayarlayın." />
    <div className={styles.instruction}><Move size={21} /><p>Fotoğraf alanına basılı tutun ve istediğiniz yöne sürükleyin. Değişiklik önizlemeye anında yansır.</p></div>
    <CropValues design={design} />
    <button type="button" className={styles.resetButton} disabled={!photoValid} onClick={onReset}><RotateCcw size={15} /> Kadrajı ortala</button>
  </>;

  if (step === "crop") return <>
    <Heading step="4. ADIM" title="Kırp ve yakınlaştır" description="Fotoğrafın template alanındaki görünümünü hassaslaştırın." />
    <label className={styles.rangeField}>
      <span>Yakınlaştırma</span><strong>{design.weddingImageZoom.toFixed(2)}×</strong>
      <input type="range" min="1" max="3" step="0.05" value={design.weddingImageZoom} onChange={(event) => onCrop({ weddingImageZoom: Number(event.target.value) })} />
    </label>
    <CropValues design={design} />
    <button type="button" className={styles.resetButton} disabled={!photoValid} onClick={onReset}><RotateCcw size={15} /> Düzenlemeyi sıfırla</button>
  </>;

  if (step === "preview") return <>
    <Heading step="5. ADIM" title="Telefon önizlemesi" description="Sayfayı kaydırarak Wedding deneyiminin tamamını kontrol edin." />
    <div className={styles.checkList}>
      <p data-pass={Boolean(selectedTemplate)}><Check size={14} /> Template seçildi</p>
      <p data-pass={photoValid}><Check size={14} /> Organizasyon fotoğrafı yerleştirildi</p>
      <p data-pass={photoValid}><Check size={14} /> Kadraj telefon görünümüne uygulandı</p>
    </div>
  </>;

  return <>
    <Heading step="6. ADIM" title="Kaydet ve tamamla" description="Seçimlerinizi kontrol ederek Wedding aşamasını tamamlayın." />
    <dl className={styles.summary}>
      <div><dt>Template</dt><dd>{selectedTemplate?.name || "Seçilmedi"}</dd></div>
      <div><dt>Fotoğraf</dt><dd>{photoValid ? "Organizasyondan seçildi" : "Seçilmedi"}</dd></div>
      <div><dt>Yakınlaştırma</dt><dd>{design.weddingImageZoom.toFixed(2)}×</dd></div>
      <div><dt>Akış</dt><dd>QR → Loading → Wedding</dd></div>
    </dl>
  </>;
}

function Heading({ step, title, description }: { step: string; title: string; description: string }) {
  return <header className={styles.inspectorHeading}><span>{step}</span><h2>{title}</h2><p>{description}</p></header>;
}

function CropValues({ design }: { design: WeddingDesign }) {
  return <dl className={styles.cropValues}><div><dt>Yatay odak</dt><dd>%{Math.round(design.weddingImagePositionX)}</dd></div><div><dt>Dikey odak</dt><dd>%{Math.round(design.weddingImagePositionY)}</dd></div></dl>;
}
