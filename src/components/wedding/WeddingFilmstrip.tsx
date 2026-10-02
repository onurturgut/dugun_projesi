"use client";

import Image from "next/image";
import styles from "./WeddingFilmstrip.module.css";

interface WeddingFilmstripProps {
  images: string[];
  alt: string;
  date?: string | null;
}

export function WeddingFilmstrip({ images, alt, date }: WeddingFilmstripProps) {
  const gallery = images.length ? images : ["/covers/couple-1.jpg"];
  const slots = Array.from({ length: 4 }, (_, index) => gallery[index % gallery.length]);
  const dateLabel = date
    ? new Date(`${date}T12:00:00+03:00`).toLocaleDateString("tr-TR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
    : null;

  return (
    <section className={styles.stage} aria-label={`${alt} düğün fotoğrafları`}>
      <div className={`${styles.strip} ${styles.heroStrip}`}>
        <div className={styles.heroFrame}>
          <Image
            unoptimized
            src={gallery[0]}
            alt={`${alt} kapak fotoğrafı`}
            fill
            priority
            sizes="(max-width: 700px) 88vw, 620px"
            className={styles.image}
          />
          {dateLabel && <span className={styles.date}>{dateLabel}</span>}
        </div>
      </div>

      <div className={`${styles.strip} ${styles.thumbnailStrip}`}>
        <div className={styles.thumbnailGrid}>
          {slots.map((src, index) => (
            <div className={styles.thumbnail} key={`${src}-${index}`}>
              <Image
                unoptimized
                src={src}
                alt={`${alt} fotoğraf ${index + 1}`}
                fill
                sizes="25vw"
                className={`${styles.image} ${index > 0 ? styles.mono : ""}`}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
