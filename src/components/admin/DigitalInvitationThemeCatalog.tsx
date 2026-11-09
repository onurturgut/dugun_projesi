"use client";

import Image from "next/image";
import { Eye, RotateCcw, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { InvitationRenderer } from "@/components/invitation/InvitationRenderer";
import {
  defaultDigitalInvitationContent,
  digitalInvitationThemes,
} from "@/lib/digital-invitation";

type ThemeId = (typeof digitalInvitationThemes)[number]["id"];

export function DigitalInvitationThemeCatalog() {
  const [previewTheme, setPreviewTheme] = useState<ThemeId | null>(null);
  const [replayKey, setReplayKey] = useState(0);
  const [previewScale, setPreviewScale] = useState(0.493);
  const liveScreenRef = useRef<HTMLDivElement>(null);
  const activeTheme = digitalInvitationThemes.find(
    (theme) => theme.id === previewTheme,
  );

  useEffect(() => {
    if (!previewTheme) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setPreviewTheme(null);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [previewTheme]);

  useEffect(() => {
    const screen = liveScreenRef.current;
    if (!screen || !previewTheme) return;
    const updateScale = () => {
      setPreviewScale(Math.min(1, Math.max(0.2, screen.clientWidth / 430)));
    };
    updateScale();
    const observer = new ResizeObserver(updateScale);
    observer.observe(screen);
    return () => observer.disconnect();
  }, [previewTheme]);

  const openPreview = (themeId: ThemeId) => {
    setReplayKey((value) => value + 1);
    setPreviewTheme(themeId);
  };

  return (
    <>
      <div
        className="design-center__invitation-grid"
        aria-label="Dijital davetiye temaları"
      >
        {digitalInvitationThemes.map((theme) => (
          <article key={theme.id}>
            <div className="design-center__invitation-phone">
              <div className="design-center__invitation-screen">
                <Image
                  src={theme.image}
                  alt={`${theme.name} dijital davetiye tema önizlemesi`}
                  fill
                  sizes="(max-width: 640px) 60vw, (max-width: 1000px) 30vw, 240px"
                />
              </div>
              <Image
                className="design-center__invitation-frame"
                src="/editor/purple-phone-frame.webp"
                alt=""
                fill
                sizes="(max-width: 640px) 90vw, 420px"
                aria-hidden="true"
              />
            </div>
            <div className="design-center__invitation-copy">
              <header>
                <div>
                  <span>{theme.category}</span>
                  <h3>{theme.name}</h3>
                </div>
                <b>YAYINDA</b>
              </header>
              <p>{theme.description}</p>
              <ul aria-label={`${theme.name} özellikleri`}>
                {theme.features.map((feature) => (
                  <li key={feature}>{feature}</li>
                ))}
              </ul>
              <button
                type="button"
                className="design-center__invitation-preview-button"
                onClick={() => openPreview(theme.id)}
              >
                <Eye size={17} /> Canlı önizle
              </button>
              <small>
                Organizasyon içindeki dijital davetiye stüdyosunda seçilebilir
                ve düzenlenebilir.
              </small>
            </div>
          </article>
        ))}
      </div>

      {activeTheme ? (
        <div
          className="design-center__preview-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="digital-invitation-preview-title"
          onMouseDown={(event) => {
            if (event.currentTarget === event.target) setPreviewTheme(null);
          }}
        >
          <section className="design-center__preview-dialog">
            <header>
              <div>
                <span>CANLI TELEFON ÖNİZLEMESİ</span>
                <h2 id="digital-invitation-preview-title">
                  {activeTheme.name}
                </h2>
                <p>
                  Davetiyeyi telefon ekranında kaydırarak bütün bölümleri ve
                  animasyonları inceleyin.
                </p>
              </div>
              <button
                type="button"
                aria-label="Canlı önizlemeyi kapat"
                onClick={() => setPreviewTheme(null)}
              >
                <X size={21} />
              </button>
            </header>

            <div className="design-center__live-preview-stage">
              <div className="design-center__live-phone">
                <div
                  ref={liveScreenRef}
                  className="design-center__live-screen"
                >
                  <div
                    className="design-center__live-content"
                    style={{ zoom: previewScale }}
                  >
                    <InvitationRenderer
                      content={{
                        ...defaultDigitalInvitationContent,
                        theme_id: activeTheme.id,
                      }}
                      preview
                      replayKey={replayKey}
                    />
                  </div>
                </div>
                <Image
                  className="design-center__invitation-frame"
                  src="/editor/purple-phone-frame.webp"
                  alt="Mor telefon önizleme çerçevesi"
                  fill
                  priority
                  sizes="(max-width: 640px) 94vw, 590px"
                />
              </div>
            </div>

            <footer>
              <span>Telefon ekranını yukarı ve aşağı kaydırabilirsiniz.</span>
              <button
                type="button"
                onClick={() => setReplayKey((value) => value + 1)}
              >
                <RotateCcw size={16} /> Animasyonu yeniden oynat
              </button>
            </footer>
          </section>
        </div>
      ) : null}
    </>
  );
}
