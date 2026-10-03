"use client";

import Image from "next/image";
import Link from "next/link";
import { Heart } from "lucide-react";
import type { CSSProperties, ReactNode } from "react";
import { resolveDesign, themes, type WeddingDesign } from "@/lib/design";
import { WeddingFilmstrip } from "./WeddingFilmstrip";
import styles from "@/app/wedding/[slug]/wedding.module.css";

interface WeddingPageTemplateProps {
  design?: WeddingDesign;
  images: string[];
  title: string;
  date?: string | null;
  children: ReactNode;
  preview?: boolean;
}

export function WeddingPageTemplate({
  design: savedDesign,
  images,
  title,
  date,
  children,
  preview = false,
}: WeddingPageTemplateProps) {
  const design = resolveDesign(savedDesign);
  const palette = themes[design.theme];

  return (
    <main
      className={`${styles.page} ${preview ? styles.previewPage : ""}`}
      data-wedding-template={design.pageTemplate}
      style={
        {
          "--wedding-base": palette.base,
          "--wedding-light": palette.light,
          "--wedding-accent": palette.accent,
          "--wedding-ink": palette.ink,
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

        <WeddingFilmstrip images={images} alt={title} date={date} />

        <section className={styles.statement}>
          <h1>{design.pageHeading}</h1>
          <div className={styles.divider}>
            <Heart size={16} strokeWidth={1.4} />
          </div>
          <p>{design.pageMessage}</p>
        </section>

        {children}
        <footer className={styles.footer}>{title}</footer>
      </div>
    </main>
  );
}
