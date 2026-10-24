"use client";

import Image from "next/image";
import type { PointerEventHandler, ReactNode } from "react";
import styles from "@/app/wedding/[slug]/wedding.module.css";

interface RetroRomanceWeddingProps {
  image: string;
  title: string;
  formattedDate: string | null;
  date?: string | null;
  message: string;
  children: ReactNode;
  preview?: boolean;
  onPhotoPointerDown?: PointerEventHandler<HTMLDivElement>;
}

export function RetroRomanceWedding({
  image,
  title,
  formattedDate,
  date,
  message,
  children,
  preview = false,
  onPhotoPointerDown,
}: RetroRomanceWeddingProps) {
  return (
    <section className={styles.retroStage}>
      <div
        className={`${styles.retroPhotoFrame} ${onPhotoPointerDown ? styles.interactivePhoto : ""}`}
        data-wedding-photo-frame
        onPointerDown={onPhotoPointerDown}
      >
        {image ? (
          <Image
            unoptimized
            src={image}
            alt={`${title} Wedding fotoğrafı`}
            fill
            loading={preview ? "eager" : undefined}
            sizes="(max-width: 640px) 82vw, 460px"
            className={styles.retroPhoto}
          />
        ) : (
          <span className={styles.retroPhotoEmpty}>
            Organizasyon fotoğrafı seçilmedi
          </span>
        )}
      </div>

      <div className={styles.retroCopy}>
        <h1>{title}</h1>
        {formattedDate ? <time dateTime={date || undefined}>{formattedDate}</time> : null}
        <p>{message}</p>
      </div>

      <div className={styles.retroUpload}>{children}</div>
    </section>
  );
}
