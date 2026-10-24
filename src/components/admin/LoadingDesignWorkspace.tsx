"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Check,
  CheckCircle2,
  FileCheck2,
  LoaderCircle,
  Play,
  RotateCcw,
  Save,
  Smartphone,
} from "lucide-react";
import { toast } from "sonner";
import { OpeningScene } from "@/components/wedding/OpeningScene";
import { api, type Wedding } from "@/lib/api";
import {
  designSchema,
  isVideoIntro,
  resolveDesign,
  type WeddingDesign,
  videoIntroAssets,
} from "@/lib/design";
import { loadingTemplateLibrary } from "@/lib/design-libraries/loading";
import styles from "./LoadingDesignWorkspace.module.css";

export function LoadingDesignWorkspace({ event }: { event: Wedding }) {
  const queryClient = useQueryClient();
  const initial = useMemo(() => resolveDesign(event.design), [event.design]);
  const [design, setDesign] = useState(initial);
  const [savedDesign, setSavedDesign] = useState(initial);
  const [replay, setReplay] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const dirty = JSON.stringify(design) !== JSON.stringify(savedDesign);
  const selectedTemplate = loadingTemplateLibrary.find(
    (template) => template.id === design.intro,
  );
  const selectedVideoAsset = isVideoIntro(design.intro)
    ? videoIntroAssets[design.intro]
    : undefined;

  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  function chooseTemplate(intro: WeddingDesign["intro"]) {
    setDesign((current) => ({
      ...current,
      intro,
      loadingCompleted: false,
    }));
    setReplay((current) => current + 1);
    setError("");
  }

  async function save(complete: boolean) {
    const parsed = designSchema.safeParse({
      ...design,
      loadingCompleted: complete,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0].message);
      return;
    }

    setBusy(true);
    setError("");
    try {
      const response = await api<{
        design: WeddingDesign;
        revision: number;
      }>(`/admin/weddings/${event.id}/design`, {
        method: "PUT",
        body: JSON.stringify(parsed.data),
      });
      setDesign(response.design);
      setSavedDesign(response.design);
      queryClient.setQueryData<Wedding>(
        ["admin-wedding", event.id],
        (current) =>
          current ? { ...current, design: response.design } : current,
      );
      await queryClient.invalidateQueries({ queryKey: ["wedding", event.slug] });
      toast.success(
        complete
          ? "Loading aşaması tamamlandı. Wedding alanı açıldı."
          : `Loading taslağı kaydedildi · sürüm ${response.revision}`,
      );
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Loading seçimi kaydedilemedi.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className={styles.workspace} aria-label="Loading tasarım seçimi">
      <header className={styles.toolbar}>
        <div>
          <span>LOADING TASARIM STÜDYOSU</span>
          <h1>{event.title}</h1>
        </div>
        <span className={styles.saveState} data-dirty={dirty}>
          <CheckCircle2 size={16} />
          {dirty ? "Kaydedilmemiş değişiklikler" : "Taslak kaydedildi"}
        </span>
      </header>

      <div className={styles.editorGrid}>
        <aside className={styles.templatePanel}>
          <header>
            <span>HAZIR TASARIMLAR</span>
            <h2>Açılışı seçin</h2>
            <p>Misafirleriniz QR kodu okuttuktan sonra bu açılışı görecek.</p>
          </header>

          <div className={styles.templateList}>
            {loadingTemplateLibrary.map((template) => {
              const selected = design.intro === template.id;
              const videoAsset = isVideoIntro(template.id)
                ? videoIntroAssets[template.id]
                : undefined;
              const previewDesign = {
                ...design,
                intro: template.id as WeddingDesign["intro"],
              };
              return (
                <button
                  key={template.id}
                  type="button"
                  aria-pressed={selected}
                  onClick={() =>
                    chooseTemplate(template.id as WeddingDesign["intro"])
                  }
                >
                  <span className={styles.templateThumb} aria-hidden="true">
                    {videoAsset ? (
                      <Image
                        src={videoAsset.poster}
                        alt=""
                        fill
                        sizes="72px"
                      />
                    ) : (
                      <OpeningScene
                        design={previewDesign}
                        title={event.title}
                        still
                      />
                    )}
                  </span>
                  <span className={styles.templateCopy}>
                    <strong>{template.name}</strong>
                    <small>{template.description}</small>
                  </span>
                  {selected ? (
                    <span className={styles.selectedMark}>
                      <Check size={14} />
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </aside>

        <main className={styles.previewArea}>
          <div className={styles.previewToolbar}>
            <span>
              <Smartphone size={17} /> Telefon açılış önizlemesi
            </span>
            <button type="button" onClick={() => setReplay((value) => value + 1)}>
              <RotateCcw size={16} /> Tekrar oynat
            </button>
          </div>

          <div className={styles.previewStage}>
            <div className={styles.phone}>
              <div className={styles.phoneSpeaker} aria-hidden="true" />
              <div
                className={styles.phoneScreen}
                key={`${replay}-${design.intro}`}
              >
                {selectedVideoAsset ? (
                  <video
                    src={selectedVideoAsset.video}
                    poster={selectedVideoAsset.poster}
                    autoPlay
                    muted
                    playsInline
                    preload="metadata"
                  />
                ) : (
                  <OpeningScene design={design} title={event.title} />
                )}
              </div>
            </div>
          </div>

          <footer className={styles.previewMeta}>
            <span>QR sonrası açılış deneyimi</span>
            <strong>{selectedTemplate?.name}</strong>
          </footer>
        </main>

        <aside className={styles.summaryPanel}>
          <header>
            <span>SEÇİM ÖZETİ</span>
            <h2>{selectedTemplate?.name}</h2>
            <p>Bu alanda yalnızca hazır açılış tasarımı seçilir.</p>
          </header>

          <dl className={styles.summary}>
            <div>
              <dt>Gösterim</dt>
              <dd>Telefon</dd>
            </div>
            <div>
              <dt>Animasyon</dt>
              <dd>Hazır</dd>
            </div>
            <div>
              <dt>Sonraki aşama</dt>
              <dd>Wedding</dd>
            </div>
          </dl>

          <div className={styles.info}>
            <Play size={17} />
            <p>Seçtiğiniz tasarım misafirlerinize gösterilecek gerçek açılış animasyonudur.</p>
          </div>

          {error ? (
            <p className={styles.error} role="alert">
              {error}
            </p>
          ) : null}

          <div className={styles.actions}>
            <button
              type="button"
              className={styles.secondary}
              disabled={busy || !dirty}
              onClick={() => void save(false)}
            >
              {busy ? <LoaderCircle className={styles.spinner} /> : <Save size={16} />}
              Taslağı kaydet
            </button>
            <button
              type="button"
              className={styles.primary}
              disabled={busy}
              onClick={() => void save(true)}
            >
              {busy ? (
                <LoaderCircle className={styles.spinner} />
              ) : (
                <FileCheck2 size={16} />
              )}
              Loading aşamasını tamamla
            </button>
          </div>
        </aside>
      </div>
    </section>
  );
}
