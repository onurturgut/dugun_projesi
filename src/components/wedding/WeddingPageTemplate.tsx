"use client";

import Image from "next/image";
import Link from "next/link";
import { Heart } from "lucide-react";
import type { CSSProperties, PointerEventHandler, ReactNode } from "react";
import {
  readableInk,
  resolveDesign,
  themes,
  type WeddingDesign,
} from "@/lib/design";
import { WeddingFilmstrip } from "./WeddingFilmstrip";
import { RetroRomanceWedding } from "./RetroRomanceWedding";
import { VelvetFlowWedding } from "./VelvetFlowWedding";
import { IvoryEditorialWedding } from "./IvoryEditorialWedding";
import { BotanicalWedding } from "./BotanicalWedding";
import { AuroraWedding } from "./AuroraWedding";
import { RomanticCeremonyWedding } from "./RomanticCeremonyWedding";
import { resolveWeddingTemplate } from "@/lib/wedding-templates";
import styles from "@/app/wedding/[slug]/wedding.module.css";

interface WeddingPageTemplateProps {
  design?: WeddingDesign;
  images: string[];
  title: string;
  date?: string | null;
  children: ReactNode;
  preview?: boolean;
  onPhotoPointerDown?: PointerEventHandler<HTMLDivElement>;
}

export function WeddingPageTemplate({
  design: savedDesign,
  images,
  title,
  date,
  children,
  preview = false,
  onPhotoPointerDown,
}: WeddingPageTemplateProps) {
  const design = resolveDesign(savedDesign);
  const selectedTemplate = resolveWeddingTemplate(design.pageTemplate);
  const isCinematic = selectedTemplate?.id === "cinematic";
  const isRetroRomance = selectedTemplate?.id === "retro-romance";
  const isVelvetFlow = selectedTemplate?.id === "velvet-flow";
  const isIvoryEditorial = selectedTemplate?.id === "ivory-editorial";
  const isBotanical = selectedTemplate?.id === "botanical";
  const isAurora = selectedTemplate?.id === "aurora";
  const isRomanticCeremony = selectedTemplate?.id === "romantic-ceremony";
  const palette = selectedTemplate || themes[design.theme];
  const selectedImage = selectedTemplate ? design.weddingImage : images[0];
  const formattedDate = date
    ? new Intl.DateTimeFormat("tr-TR", {
        day: "2-digit",
        month: "long",
        year: "numeric",
        timeZone: "Europe/Istanbul",
      }).format(new Date(`${date.slice(0, 10)}T12:00:00+03:00`))
    : null;

  return (
    <main
      className={`${styles.page} ${preview ? styles.previewPage : ""} ${selectedTemplate ? styles.templatePage : ""}`}
      data-wedding-template={design.pageTemplate}
      style={
        {
          "--wedding-base": palette.base,
          "--wedding-light": palette.light,
          "--wedding-accent": palette.accent,
          "--wedding-accent-ink": readableInk(palette.accent),
          "--wedding-ink": palette.ink,
          "--wedding-photo-x": `${design.weddingImagePositionX}%`,
          "--wedding-photo-y": `${design.weddingImagePositionY}%`,
          "--wedding-photo-zoom": design.weddingImageZoom,
        } as CSSProperties
      }
    >
      <div className={styles.shell}>
        <header className={styles.header}>
          <div className={styles.brandBlock}>
            <Link
              href="/"
              className={styles.brandLogo}
              aria-label="ShineQR ana sayfa"
              tabIndex={preview ? -1 : undefined}
            >
              <Image
                src="/brand/shineqr-lockup.png"
                alt="ShineQR"
                width={360}
                height={240}
                preload={!preview}
              />
            </Link>
            <p className={styles.brandTagline}>{design.brandTagline}</p>
            <span className={styles.brandOrnament} aria-hidden="true">
              <i />
            </span>
          </div>
        </header>

        {isRomanticCeremony ? (
          <RomanticCeremonyWedding
            title={title}
            formattedDate={formattedDate}
            date={date}
            message={design.pageMessage}
          >
            {children}
          </RomanticCeremonyWedding>
        ) : isAurora ? (
          <AuroraWedding
            title={title}
            formattedDate={formattedDate}
            date={date}
            message={design.pageMessage}
          >
            {children}
          </AuroraWedding>
        ) : isBotanical ? (
          <BotanicalWedding
            title={title}
            formattedDate={formattedDate}
            date={date}
            message={design.pageMessage}
          >
            {children}
          </BotanicalWedding>
        ) : isIvoryEditorial ? (
          <IvoryEditorialWedding
            title={title}
            formattedDate={formattedDate}
            date={date}
            message={design.pageMessage}
          >
            {children}
          </IvoryEditorialWedding>
        ) : isVelvetFlow ? (
          <VelvetFlowWedding
            title={title}
            formattedDate={formattedDate}
            date={date}
            message={design.pageMessage}
          >
            {children}
          </VelvetFlowWedding>
        ) : isRetroRomance ? (
          <RetroRomanceWedding
            image={selectedImage}
            title={title}
            formattedDate={formattedDate}
            date={date}
            message={design.pageMessage}
            preview={preview}
            onPhotoPointerDown={onPhotoPointerDown}
          >
            {children}
          </RetroRomanceWedding>
        ) : selectedTemplate ? (
          <section
            className={styles.templateHero}
            data-image-treatment={selectedTemplate.imageTreatment}
            data-monochrome={selectedTemplate.monochrome || undefined}
          >
            <div
              className={`${styles.templatePhoto} ${onPhotoPointerDown ? styles.interactivePhoto : ""}`}
              data-wedding-photo-frame
              onPointerDown={onPhotoPointerDown}
            >
              {selectedImage ? (
                <>
                  {isCinematic ? (
                    <Image
                      unoptimized
                      src={selectedImage}
                      alt=""
                      aria-hidden="true"
                      fill
                      loading={preview ? "eager" : undefined}
                      sizes="100vw"
                      className={styles.cinematicPhotoBackdrop}
                    />
                  ) : null}
                  <Image
                    unoptimized
                    src={selectedImage}
                    alt={`${title} Wedding fotoğrafı`}
                    fill
                    loading={preview ? "eager" : undefined}
                    sizes="(max-width: 700px) 100vw, 700px"
                    className={`${styles.templatePhotoImage} ${isCinematic ? styles.cinematicPhotoForeground : ""}`}
                  />
                </>
              ) : (
                <span className={styles.photoEmpty}>Organizasyon fotoğrafı seçilmedi</span>
              )}
            </div>
            <div className={styles.templateHeroCopy}>
              <h1>{title}</h1>
              {formattedDate ? <time dateTime={date || undefined}>{formattedDate}</time> : null}
              <p>{design.pageMessage}</p>
            </div>
            {isCinematic ? (
              <div className={styles.cinematicUpload}>{children}</div>
            ) : null}
          </section>
        ) : (
          <>
            <WeddingFilmstrip images={images} alt={title} date={date} />
            <section className={styles.statement}>
              <h1>{design.pageHeading}</h1>
              <div className={styles.divider}>
                <Heart size={16} strokeWidth={1.4} />
              </div>
              <p>{design.pageMessage}</p>
            </section>
          </>
        )}

        {!isCinematic && !isRetroRomance && !isVelvetFlow && !isIvoryEditorial && !isBotanical && !isAurora && !isRomanticCeremony
          ? children
          : null}
        <footer className={styles.footer}>{title}</footer>
      </div>
    </main>
  );
}
